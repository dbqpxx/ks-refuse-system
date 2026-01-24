import type { PlantData, DataFilter, RangeStatistics, DailySummary, PlantSummary } from '@/types';

const STORAGE_KEY = 'ks_refuse_data';

/**
 * Local storage service for managing plant operational data
 */
class StorageService {
    /**
     * Get all plant data from localStorage
     */
    private getAllData(): PlantData[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    /**
     * Save all plant data to localStorage
     */
    private saveAllData(data: PlantData[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            throw new Error('Failed to save data');
        }
    }

    /**
     * Save a new plant data record
     */
    /**
     * Save a new plant data record (Upsert: Update if exists, otherwise Create)
     */
    savePlantData(data: Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>): PlantData {
        const allData = this.getAllData();

        // Check if record already exists for this date and plant
        const existingIndex = allData.findIndex(
            r => r.date === data.date && r.plantName === data.plantName
        );

        if (existingIndex !== -1) {
            // Update existing record
            const updatedRecord: PlantData = {
                ...allData[existingIndex],
                ...data, // Overwrite with new data
                updatedAt: new Date().toISOString(),
            };
            allData[existingIndex] = updatedRecord;
            this.saveAllData(allData);
            return updatedRecord;
        }

        // Create new record
        const newRecord: PlantData = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        allData.push(newRecord);
        this.saveAllData(allData);

        return newRecord;
    }

    /**
     * Update an existing plant data record
     */
    updatePlantData(id: string, updates: Partial<Omit<PlantData, 'id' | 'createdAt'>>): PlantData | null {
        const allData = this.getAllData();
        const index = allData.findIndex(record => record.id === id);

        if (index === -1) {
            return null;
        }

        allData[index] = {
            ...allData[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        this.saveAllData(allData);
        return allData[index];
    }

    /**
     * Delete a plant data record by ID
     */
    deletePlantData(id: string): boolean {
        const allData = this.getAllData();
        const filteredData = allData.filter(record => record.id !== id);

        if (filteredData.length === allData.length) {
            return false; // Record not found
        }

        this.saveAllData(filteredData);
        return true;
    }

    /**
     * Repair corrupted dates where month equals day (e.g., 2026-10-10 should be 2026-01-10)
     * This fixes dates from 10th onwards that were incorrectly parsed
     * Returns the number of records repaired
     */
    repairCorruptedDates(): { repaired: number; details: string[] } {
        const allData = this.getAllData();
        const details: string[] = [];
        let repaired = 0;

        const fixedData = allData.map(record => {
            const dateParts = record.date.split('-');
            if (dateParts.length !== 3) return record;

            const year = dateParts[0];
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);

            // Check if date is corrupted: month > 12 OR (month === day AND month >= 10)
            // Pattern: 2026-10-10, 2026-11-11, 2026-13-13, etc.
            if (month > 12 || (month === day && month >= 10)) {
                // The actual day is the month value, and the month should be January (01)
                const fixedMonth = '01';
                const fixedDay = String(month).padStart(2, '0');
                const fixedDate = `${year}-${fixedMonth}-${fixedDay}`;

                details.push(`${record.date} → ${fixedDate} (${record.plantName})`);
                repaired++;

                return {
                    ...record,
                    date: fixedDate,
                    updatedAt: new Date().toISOString(),
                };
            }

            return record;
        });

        if (repaired > 0) {
            this.saveAllData(fixedData);
        }

        return { repaired, details };
    }

    /**
     * Get the date range of all stored data
     * Returns { startDate, endDate } or null if no data exists
     * Uses Date comparison to handle various date formats correctly
     */
    getDateRange(): { startDate: string; endDate: string } | null {
        const allData = this.getAllData();
        if (allData.length === 0) {
            return null;
        }

        // Sort dates by actual Date value, not string comparison
        // This handles unpadded formats like "2026-1-9" correctly
        const dates = allData.map(r => r.date).sort((a, b) => {
            return new Date(a).getTime() - new Date(b).getTime();
        });

        return {
            startDate: dates[0],
            endDate: dates[dates.length - 1],
        };
    }

    /**
     * Get plant data with optional filters
     * Uses Date comparison to handle various date formats correctly
     */
    getPlantData(filter?: DataFilter): PlantData[] {
        let data = this.getAllData();
        console.log('[Storage Debug] Total records before filter:', data.length);

        if (!filter) {
            return data;
        }

        // Debug: Check for problematic dates
        const uniqueDates = [...new Set(data.map(r => r.date))];
        console.log('[Storage Debug] Unique dates in data:', uniqueDates.sort());

        // Check if any dates fail to parse
        const invalidDates = data.filter(r => isNaN(new Date(r.date).getTime()));
        if (invalidDates.length > 0) {
            console.log('[Storage Debug] WARNING: Invalid dates found:', invalidDates.map(r => r.date));
        }

        // Filter by date range using Date comparison
        if (filter.startDate) {
            const startTime = new Date(filter.startDate).getTime();
            console.log('[Storage Debug] Start filter time:', filter.startDate, '=', startTime);
            const beforeCount = data.length;
            data = data.filter(record => {
                const recordTime = new Date(record.date).getTime();
                return recordTime >= startTime;
            });
            console.log('[Storage Debug] After start filter:', data.length, '(removed', beforeCount - data.length, ')');
        }
        if (filter.endDate) {
            const endTime = new Date(filter.endDate).getTime();
            console.log('[Storage Debug] End filter time:', filter.endDate, '=', endTime);
            const beforeCount = data.length;
            data = data.filter(record => {
                const recordTime = new Date(record.date).getTime();
                const passes = recordTime <= endTime;
                if (!passes) {
                    console.log('[Storage Debug] Filtered out:', record.date, '=', recordTime, '> endTime', endTime);
                }
                return passes;
            });
            console.log('[Storage Debug] After end filter:', data.length, '(removed', beforeCount - data.length, ')');
        }

        // Filter by plant
        if (filter.plantName && filter.plantName !== 'all') {
            data = data.filter(record => record.plantName === filter.plantName);
        }

        // Sort by date descending using Date comparison
        return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    /**
     * Get data for a specific date
     */
    getDataByDate(date: string): PlantData[] {
        return this.getAllData().filter(record => record.date === date);
    }

    /**
     * Get daily summary for a specific date
     */
    getDailySummary(date: string): DailySummary {
        const rawDayData = this.getDataByDate(date);

        // Deduplicate: Keep only the latest updated record for each plant
        const plantMap = new Map<string, PlantData>();
        rawDayData.forEach(record => {
            const existing = plantMap.get(record.plantName);
            if (!existing || new Date(record.updatedAt) > new Date(existing.updatedAt)) {
                plantMap.set(record.plantName, record);
            }
        });

        const dayData = Array.from(plantMap.values());

        const totalIntake = dayData.reduce((sum, record) => sum + record.totalIntake, 0);
        const totalIncineration = dayData.reduce((sum, record) => sum + record.incinerationAmount, 0);
        const furnacesRunning = dayData.reduce((sum, record) => sum + record.furnaceCount, 0);

        // Calculate total possible furnaces (this is a simplified calculation)
        // In reality, you might want to store max furnaces per plant
        const totalFurnaces = dayData.length * 3; // Assuming average of 3 furnaces per plant
        const furnacesStopped = Math.max(0, totalFurnaces - furnacesRunning);

        const plants: PlantSummary[] = dayData.map(record => ({
            plantName: record.plantName,
            totalIntake: record.totalIntake,
            incinerationAmount: record.incinerationAmount,
            pitStoragePercentage: (record.pitStorage / record.pitCapacity) * 100,
            furnaceCount: record.furnaceCount,
        }));

        return {
            date,
            totalIntake,
            totalIncineration,
            furnacesRunning,
            furnacesStopped,
            plants,
        };
    }

    /**
     * Get statistics for a date range
     */
    getRangeStatistics(filter: DataFilter): RangeStatistics {
        const data = this.getPlantData(filter);

        const totalIntake = data.reduce((sum, record) => sum + record.totalIntake, 0);
        const totalIncineration = data.reduce((sum, record) => sum + record.incinerationAmount, 0);

        // Calculate average pit storage percentage
        const avgPitStorage = data.length > 0
            ? data.reduce((sum, record) => sum + (record.pitStorage / record.pitCapacity) * 100, 0) / data.length
            : 0;

        return {
            totalIntake,
            totalIncineration,
            averagePitStorage: avgPitStorage,
            recordCount: data.length,
        };
    }

    /**
     * Get daily summaries for the last N days (for trend charts)
     */
    getMultiDaySummary(days: number = 7): { date: string; summary: DailySummary }[] {
        const allData = this.getAllData();
        if (allData.length === 0) return [];

        // Get unique dates and sort by date descending
        const uniqueDates = [...new Set(allData.map(r => r.date))]
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .slice(0, days);

        // Get summary for each date
        return uniqueDates
            .map(date => ({
                date,
                summary: this.getDailySummary(date),
            }))
            .reverse(); // Return in chronological order (oldest first)
    }

    /**
     * Calculate day-over-day trend percentage
     */
    getDayOverDayTrend(currentDate: string): {
        intakeTrend: number | null;
        incinerationTrend: number | null;
        pitStorageTrend: number | null;
    } {
        const current = this.getDailySummary(currentDate);

        // Get previous day
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        const prev = this.getDailySummary(prevDateStr);

        // Calculate trends (percentage change)
        const calcTrend = (curr: number, prev: number): number | null => {
            if (prev === 0) return null;
            return ((curr - prev) / prev) * 100;
        };

        // Average pit storage percentage for current and previous
        const currentAvgPit = current.plants.length > 0
            ? current.plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / current.plants.length
            : 0;
        const prevAvgPit = prev.plants.length > 0
            ? prev.plants.reduce((sum, p) => sum + p.pitStoragePercentage, 0) / prev.plants.length
            : 0;

        return {
            intakeTrend: prev.totalIntake > 0 ? calcTrend(current.totalIntake, prev.totalIntake) : null,
            incinerationTrend: prev.totalIncineration > 0 ? calcTrend(current.totalIncineration, prev.totalIncineration) : null,
            pitStorageTrend: prevAvgPit > 0 ? calcTrend(currentAvgPit, prevAvgPit) : null,
        };
    }

    /**
     * Export data to CSV format
     */
    exportToCSV(filter?: DataFilter): string {
        const data = this.getPlantData(filter);

        // CSV headers
        const headers = [
            '日期',
            '廠區',
            '爐數',
            '總進廠量(噸)',
            '焚化量(噸)',
            '貯坑量(噸)',
            '貯坑容量(噸)',
            '貯坑佔比(%)',
            '平台預約',
            '實際進廠',
            '超約車次',
            '調整車次',
        ];

        // CSV rows
        const rows = data.map(record => [
            record.date,
            record.plantName,
            record.furnaceCount,
            record.totalIntake,
            record.incinerationAmount,
            record.pitStorage,
            record.pitCapacity,
            ((record.pitStorage / record.pitCapacity) * 100).toFixed(2),
            record.platformReserved ?? '',
            record.actualIntake ?? '',
            record.overReservedTrips ?? '',
            record.adjustedTrips ?? '',
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(',')),
        ].join('\n');

        return csvContent;
    }

    /**
     * Download CSV file
     */
    downloadCSV(filename: string, filter?: DataFilter): void {
        const csvContent = this.exportToCSV(filter);
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Get total record count
     */
    getRecordCount(): number {
        return this.getAllData().length;
    }

    /**
     * Clear all data (use with caution!)
     */
    clearAllData(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}

// Export singleton instance
export const storageService = new StorageService();
