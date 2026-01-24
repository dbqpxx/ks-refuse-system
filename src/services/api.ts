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
            furnaceCount: Number(item.furnaceCount),
            totalIntake: Number(item.totalIntake),
            incinerationAmount: Number(item.incinerationAmount),
            pitStorage: Number(item.pitStorage),
            pitCapacity: Number(item.pitCapacity),
            platformReserved: item.platformReserved ? Number(item.platformReserved) : undefined,
            actualIntake: item.actualIntake ? Number(item.actualIntake) : undefined,
            overReservedTrips: item.overReservedTrips ? Number(item.overReservedTrips) : undefined,
            adjustedTrips: item.adjustedTrips ? Number(item.adjustedTrips) : undefined,
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
