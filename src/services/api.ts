import type { PlantData, User } from '@/types';

// Use relative URL which will be proxied by Netlify (dev and prod)
const API_URL = '/api';

export const apiService = {
    /**
     * Fetch all plant data from the Google Sheet
     */
    async fetchPlantData(): Promise<PlantData[]> {
        const response = await fetch(`${API_URL}?sheet=Data`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const json = await response.json();

        return (json.data || []).map((item: any) => ({
            ...item,
            furnaceCount: Number(item.furnaceCount || 0),
            totalIntake: Number(item.totalIntake || 0),
            incinerationAmount: Number(item.incinerationAmount || 0),
            pitStorage: Number(item.pitStorage || 0),
            pitCapacity: Number(item.pitCapacity || 0),
            platformReserved: item.platformReserved ? Number(item.platformReserved) : undefined,
            actualIntake: item.actualIntake ? Number(item.actualIntake) : undefined,
            overReservedTrips: item.overReservedTrips ? Number(item.overReservedTrips) : undefined,
            adjustedTrips: item.adjustedTrips ? Number(item.adjustedTrips) : undefined,
        }));
    },

    /**
     * Save new plant data to the Google Sheet
     */
    async savePlantData(data: Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'> | Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
        const inputList = Array.isArray(data) ? data : [data];
        const payload = inputList.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        const response = await fetch(`${API_URL}?sheet=Data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to save data: ${response.statusText}`);
        }
    },

    /**
     * Users Management
     */
    async fetchUsers(): Promise<User[]> {
        const response = await fetch(`${API_URL}?sheet=Users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const json = await response.json();
        return (json.data || []).map((u: any) => ({
            ...u,
            isApproved: String(u.isApproved).toLowerCase() === 'true' || u.isApproved === true
        }));
    },

    async registerUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const { isApproved, ...rest } = user;
        const payload: User = {
            id: crypto.randomUUID(),
            isApproved: isApproved ?? false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...rest,
        };

        const response = await fetch(`${API_URL}?sheet=Users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to register user');
    },

    async updateUser(user: User): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Users&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...user, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update user');
    }
};
