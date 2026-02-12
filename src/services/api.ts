import type { PlantData, User, DowntimeRecord, DailyComment } from '@/types';

// Use relative URL which will be proxied by Netlify (dev and prod)
const API_URL = '/api';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

const cache: {
    plantData?: CacheItem<PlantData[]>;
    downtime?: CacheItem<DowntimeRecord[]>;
    dailyComments?: CacheItem<DailyComment[]>;
    users?: CacheItem<User[]>;
} = {};

export const apiService = {
    /**
     * Fetch all plant data from the Google Sheet
     */
    async fetchPlantData(forceRefresh = false): Promise<PlantData[]> {
        if (!forceRefresh && cache.plantData && (Date.now() - cache.plantData.timestamp < CACHE_DURATION)) {
            return cache.plantData.data;
        }

        const response = await fetch(`${API_URL}?sheet=Data`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const json = await response.json();

        const data = (json.data || []).map((item: any) => ({
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

        cache.plantData = { data, timestamp: Date.now() };
        return data;
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

        // Invalidate cache
        delete cache.plantData;
    },

    async updatePlantData(data: PlantData): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Data&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update plant data');

        // Invalidate cache
        delete cache.plantData;
    },

    async deletePlantData(id: string): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Data&method=DELETE`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error('Failed to delete plant data');

        // Invalidate cache
        delete cache.plantData;
    },

    /**
     * Users Management
     */
    async fetchUsers(forceRefresh = false): Promise<User[]> {
        if (!forceRefresh && cache.users && (Date.now() - cache.users.timestamp < CACHE_DURATION)) {
            return cache.users.data;
        }

        const response = await fetch(`${API_URL}?sheet=Users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const json = await response.json();
        const data = (json.data || []).map((u: any) => ({
            ...u,
            isApproved: String(u.isApproved).toLowerCase() === 'true' || u.isApproved === true
        }));

        cache.users = { data, timestamp: Date.now() };
        return data;
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

        delete cache.users;
    },

    async updateUser(user: User): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Users&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...user, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update user');

        delete cache.users;
    },

    // --- Downtime Management ---

    async fetchDowntimeRecords(forceRefresh = false): Promise<DowntimeRecord[]> {
        if (!forceRefresh && cache.downtime && (Date.now() - cache.downtime.timestamp < CACHE_DURATION)) {
            return cache.downtime.data;
        }

        const response = await fetch(`${API_URL}?sheet=Downtime`);
        if (!response.ok) throw new Error('Failed to fetch downtime records');
        const json = await response.json();
        const data = (json.data || []).map((item: any) => ({
            ...item,
            furnaceNumber: Number(item.furnaceNumber || 1),
        }));

        cache.downtime = { data, timestamp: Date.now() };
        return data;
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

        delete cache.downtime;
    },

    async updateDowntimeRecord(data: DowntimeRecord): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Downtime&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update downtime record');

        delete cache.downtime;
    },

    async deleteDowntimeRecord(id: string): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=Downtime&method=DELETE`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error('Failed to delete downtime record');

        delete cache.downtime;
    },

    // --- Daily Comments ---

    async fetchDailyComments(forceRefresh = false): Promise<DailyComment[]> {
        if (!forceRefresh && cache.dailyComments && (Date.now() - cache.dailyComments.timestamp < CACHE_DURATION)) {
            return cache.dailyComments.data;
        }

        const response = await fetch(`${API_URL}?sheet=DailyComments`);
        if (!response.ok) throw new Error('Failed to fetch daily comments');
        const json = await response.json();
        const data = (json.data || []).map((item: any) => ({
            ...item,
            // Ensure no legacy fields break the UI
        }));

        cache.dailyComments = { data, timestamp: Date.now() };
        return data;
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

        delete cache.dailyComments;
    },

    async updateDailyComment(data: DailyComment): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=DailyComments&method=PUT`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error('Failed to update daily comment');

        delete cache.dailyComments;
    },

    async deleteDailyComment(id: string): Promise<void> {
        const response = await fetch(`${API_URL}?sheet=DailyComments&method=DELETE`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error('Failed to delete daily comment');

        delete cache.dailyComments;
    }
};
