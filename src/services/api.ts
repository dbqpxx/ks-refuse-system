import type { PlantData } from '@/types';

// Use relative URL which will be proxied by Netlify (dev and prod)
const API_URL = '/api';

export const apiService = {
    /**
     * Fetch all plant data from the Google Sheet
     */
    async fetchPlantData(): Promise<PlantData[]> {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const json = await response.json();

        // Transform data types (everything from Sheets is a string/number)
        // We need to ensure numbers are actually numbers
        return (json.data || []).map((item: any) => ({
            ...item,
            // Helper to parse numbers safely (handles "1,234" strings)
            furnaceCount: typeof item.furnaceCount === 'string' ? Number(item.furnaceCount.replace(/,/g, '')) : Number(item.furnaceCount),
            totalIntake: typeof item.totalIntake === 'string' ? Number(item.totalIntake.replace(/,/g, '')) : Number(item.totalIntake),
            incinerationAmount: typeof item.incinerationAmount === 'string' ? Number(item.incinerationAmount.replace(/,/g, '')) : Number(item.incinerationAmount),
            pitStorage: typeof item.pitStorage === 'string' ? Number(item.pitStorage.replace(/,/g, '')) : Number(item.pitStorage),
            pitCapacity: typeof item.pitCapacity === 'string' ? Number(item.pitCapacity.replace(/,/g, '')) : Number(item.pitCapacity),
            platformReserved: item.platformReserved ? (typeof item.platformReserved === 'string' ? Number(item.platformReserved.replace(/,/g, '')) : Number(item.platformReserved)) : undefined,
            actualIntake: item.actualIntake ? (typeof item.actualIntake === 'string' ? Number(item.actualIntake.replace(/,/g, '')) : Number(item.actualIntake)) : undefined,
            overReservedTrips: item.overReservedTrips ? (typeof item.overReservedTrips === 'string' ? Number(item.overReservedTrips.replace(/,/g, '')) : Number(item.overReservedTrips)) : undefined,
            adjustedTrips: item.adjustedTrips ? (typeof item.adjustedTrips === 'string' ? Number(item.adjustedTrips.replace(/,/g, '')) : Number(item.adjustedTrips)) : undefined,
        })).filter((item: PlantData) =>
            !isNaN(item.totalIntake) &&
            !isNaN(item.incinerationAmount) &&
            !isNaN(item.furnaceCount)
        );
    },

    /**
     * Save new plant data to the Google Sheet
     */
    async savePlantData(data: Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'> | Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
        const inputList = Array.isArray(data) ? data : [data];

        // Auto-generate ID and timestamps
        const payload: PlantData[] = inputList.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        } as PlantData));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to save data: ${response.statusText}`);
        }
    }
};
