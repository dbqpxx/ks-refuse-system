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
    furnaceCount: number;
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
    { name: '中區廠', defaultCapacity: 1000, maxFurnaces: 3, standardPerFurnace: 300 },
    { name: '南區廠', defaultCapacity: 1200, maxFurnaces: 4, standardPerFurnace: 280 },
    { name: '仁武廠', defaultCapacity: 800, maxFurnaces: 2, standardPerFurnace: 320 },
    { name: '岡山廠', defaultCapacity: 900, maxFurnaces: 3, standardPerFurnace: 290 },
];
