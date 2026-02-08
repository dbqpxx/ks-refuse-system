// Role-based access control roles
export type UserRole = 'admin' | 'user';

// User structure
export interface User {
    id: string;
    username: string; // "代號" (Account ID)
    email: string;
    password: string; // User password for authentication
    role: UserRole;
    isApproved: boolean;
    createdAt: string;
    updatedAt: string;
}

// Plant names as a union type
export type PlantName = '中區廠' | '南區廠' | '仁武廠' | '岡山廠';


// Main operational data structure
export interface PlantData {
    id: string;
    date: string; // ISO date string (YYYY-MM-DD)
    plantName: PlantName;

    // Basic data
    furnaceCount: number;
    totalIntake: number; // tons
    incinerationAmount: number; // tons

    // Pit data
    pitStorage: number; // tons
    pitCapacity: number; // tons

    // Platform data (optional)
    platformReserved?: number;
    actualIntake?: number;
    overReservedTrips?: number;
    adjustedTrips?: number;

    // Metadata
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
}

// Daily summary aggregated across all plants
export interface DailySummary {
    date: string;
    totalIntake: number;
    totalIncineration: number;
    furnacesRunning: number;
    furnacesStopped: number;
    plants: PlantSummary[];
}

// Summary for a single plant
export interface PlantSummary {
    plantName: PlantName;
    totalIntake: number;
    incinerationAmount: number;
    pitStoragePercentage: number;
    pitStorage: number;
    pitCapacity: number;
    furnaceCount: number;
    maxFurnaces: number;
    platformReserved?: number;
    actualIntake?: number;
}

// Filter options for querying data
export interface DataFilter {
    startDate?: string;
    endDate?: string;
    plantName?: PlantName | 'all';
}

// Statistics for a date range
export interface RangeStatistics {
    totalIntake: number;
    totalIncineration: number;
    averagePitStorage: number;
    recordCount: number;
}

// Plant configuration
export interface Plant {
    name: PlantName;
    defaultCapacity: number; // Default pit capacity in tons
    maxFurnaces: number; // Maximum number of furnaces
    standardPerFurnace: number; // Standard incineration per furnace (tons/day)
}

// Available plants configuration
export const PLANTS: Plant[] = [
    { name: '中區廠', defaultCapacity: 1000, maxFurnaces: 3, standardPerFurnace: 225 },
    { name: '南區廠', defaultCapacity: 1200, maxFurnaces: 4, standardPerFurnace: 300 },
    { name: '仁武廠', defaultCapacity: 800, maxFurnaces: 3, standardPerFurnace: 425 },
    { name: '岡山廠', defaultCapacity: 900, maxFurnaces: 3, standardPerFurnace: 373 },
];

// Downtime types
export type DowntimeType = '計畫歲修' | '臨時停機';

// Downtime record for scheduled/unscheduled furnace outages
export interface DowntimeRecord {
    id: string;
    plantName: PlantName;
    furnaceNumber: number; // 爐號 (1, 2, 3, 4...)
    downtimeType: DowntimeType;
    startDateTime: string; // ISO datetime
    endDateTime: string;   // ISO datetime (expected end)
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
