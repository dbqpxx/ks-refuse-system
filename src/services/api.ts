import type { PlantData, User, DowntimeRecord, DailyComment } from '@/types';

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

    async updatePlantData(data: PlantData): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Data&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update plant data');
    },

    async deletePlantData(id: string): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Data&method=DELETE`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error('Failed to delete plant data');
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
    },

    // --- Downtime Management ---

    async fetchDowntimeRecords(): Promise<DowntimeRecord[]> {
        const response = await fetch(`${API_URL}?sheet=Downtime`);
        if (!response.ok) throw new Error('Failed to fetch downtime records');
        const json = await response.json();
        return (json.data || []).map((item: any) => ({
            ...item,
            furnaceNumber: Number(item.furnaceNumber || 1),
        }));
    },

    async saveDowntimeRecord(data: Omit<DowntimeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const payload: DowntimeRecord = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data,
        };

        const response = await fetch(`${API_URL}?sheet=Downtime`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to save downtime record');
    },

    async updateDowntimeRecord(data: DowntimeRecord): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Downtime&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update downtime record');
    },

    async deleteDowntimeRecord(id: string): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Downtime&method=DELETE`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error('Failed to delete downtime record');
    },

    // --- Daily Comments ---

    async fetchDailyComments(): Promise<DailyComment[]> {
        const response = await fetch(`${API_URL}?sheet=DailyComments`);
        if (!response.ok) throw new Error('Failed to fetch daily comments');
        const json = await response.json();
        return (json.data || []).map((item: any) => ({
            ...item,
            // Ensure no legacy fields break the UI
        }));
    },

    async saveDailyComment(data: Omit<DailyComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const payload: DailyComment = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data,
        };

        const response = await fetch(`${API_URL}?sheet=DailyComments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to save daily comment');
    },

    async updateDailyComment(data: DailyComment): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=DailyComments&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update daily comment');
    },

    async deleteDailyComment(id: string): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=DailyComments&method=DELETE`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error('Failed to delete daily comment');
    }
};
