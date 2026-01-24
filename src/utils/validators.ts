import type { PlantData } from '@/types';

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

/**
 * Validate plant operational data
 */
export function validatePlantData(
    data: Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>
): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate date
    if (!data.date) {
        errors.push({ field: 'date', message: '日期為必填欄位' });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        errors.push({ field: 'date', message: '日期格式不正確 (應為 YYYY-MM-DD)' });
    }

    // Validate plant name
    if (!data.plantName) {
        errors.push({ field: 'plantName', message: '廠區為必填欄位' });
    } else if (!['中區廠', '南區廠', '仁武廠', '岡山廠'].includes(data.plantName)) {
        errors.push({ field: 'plantName', message: '廠區名稱不正確' });
    }

    // Validate furnace count
    if (data.furnaceCount === undefined || data.furnaceCount === null) {
        errors.push({ field: 'furnaceCount', message: '爐數為必填欄位' });
    } else if (data.furnaceCount < 0) {
        errors.push({ field: 'furnaceCount', message: '爐數不可為負數' });
    } else if (!Number.isInteger(data.furnaceCount)) {
        errors.push({ field: 'furnaceCount', message: '爐數必須為整數' });
    }

    // Validate total intake
    if (data.totalIntake === undefined || data.totalIntake === null) {
        errors.push({ field: 'totalIntake', message: '總進廠量為必填欄位' });
    } else if (data.totalIntake < 0) {
        errors.push({ field: 'totalIntake', message: '總進廠量不可為負數' });
    }

    // Validate incineration amount
    if (data.incinerationAmount === undefined || data.incinerationAmount === null) {
        errors.push({ field: 'incinerationAmount', message: '焚化量為必填欄位' });
    } else if (data.incinerationAmount < 0) {
        errors.push({ field: 'incinerationAmount', message: '焚化量不可為負數' });
    }

    // Validate pit storage
    if (data.pitStorage === undefined || data.pitStorage === null) {
        errors.push({ field: 'pitStorage', message: '貯坑量為必填欄位' });
    } else if (data.pitStorage < 0) {
        errors.push({ field: 'pitStorage', message: '貯坑量不可為負數' });
    }

    // Validate pit capacity
    if (data.pitCapacity === undefined || data.pitCapacity === null) {
        errors.push({ field: 'pitCapacity', message: '貯坑容量為必填欄位' });
    } else if (data.pitCapacity <= 0) {
        errors.push({ field: 'pitCapacity', message: '貯坑容量必須大於 0' });
    }

    // Validate pit storage doesn't exceed capacity - REMOVED as it can exceed 100%
    /*
    if (
        data.pitStorage !== undefined &&
        data.pitCapacity !== undefined &&
        data.pitStorage > data.pitCapacity
    ) {
        errors.push({
            field: 'pitStorage',
            message: '貯坑量不可超過貯坑容量',
        });
    }
    */

    // Validate optional platform data
    if (data.platformReserved !== undefined && data.platformReserved < 0) {
        errors.push({ field: 'platformReserved', message: '平台預約不可為負數' });
    }

    if (data.actualIntake !== undefined && data.actualIntake < 0) {
        errors.push({ field: 'actualIntake', message: '實際進廠不可為負數' });
    }

    if (data.overReservedTrips !== undefined && data.overReservedTrips < 0) {
        errors.push({ field: 'overReservedTrips', message: '超約車次不可為負數' });
    }

    if (data.adjustedTrips !== undefined && data.adjustedTrips < 0) {
        errors.push({ field: 'adjustedTrips', message: '調整車次不可為負數' });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate?: string, endDate?: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        errors.push({ field: 'startDate', message: '開始日期格式不正確' });
    }

    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        errors.push({ field: 'endDate', message: '結束日期格式不正確' });
    }

    if (startDate && endDate && startDate > endDate) {
        errors.push({ field: 'dateRange', message: '開始日期不可晚於結束日期' });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate numeric input
 */
export function validateNumericInput(
    value: string | number,
    fieldName: string,
    options: {
        required?: boolean;
        min?: number;
        max?: number;
        integer?: boolean;
    } = {}
): ValidationResult {
    const errors: ValidationError[] = [];
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Check if required
    if (options.required && (value === '' || value === null || value === undefined)) {
        errors.push({ field: fieldName, message: `${fieldName}為必填欄位` });
        return { isValid: false, errors };
    }

    // If not required and empty, it's valid
    if (!options.required && (value === '' || value === null || value === undefined)) {
        return { isValid: true, errors: [] };
    }

    // Check if it's a valid number
    if (isNaN(numValue)) {
        errors.push({ field: fieldName, message: `${fieldName}必須為數字` });
        return { isValid: false, errors };
    }

    // Check if integer is required
    if (options.integer && !Number.isInteger(numValue)) {
        errors.push({ field: fieldName, message: `${fieldName}必須為整數` });
    }

    // Check minimum value
    if (options.min !== undefined && numValue < options.min) {
        errors.push({ field: fieldName, message: `${fieldName}不可小於 ${options.min}` });
    }

    // Check maximum value
    if (options.max !== undefined && numValue > options.max) {
        errors.push({ field: fieldName, message: `${fieldName}不可大於 ${options.max}` });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
    return errors.map(error => error.message).join('\n');
}
