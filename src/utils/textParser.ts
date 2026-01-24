import type { PlantData, PlantName } from '@/types';

/**
 * Example format for text parsing
 */
export const EXAMPLE_FORMAT = `CSV 格式範例 (批次輸入):
日期,廠區,運轉爐數,平台預約量,超過預約量車次,調整後進廠車次,實際進廠量,總進廠量,焚化量,貯坑存量,貯坑容量,貯坑百分比
1/20,中區廠,2,,,,787,490,7231,6900,104.8%
1/20,南區廠,2,182,2,2,152,426,149,28424,18000,158%

或是單筆文字格式:
日期: 2026-01-22
廠區: 中區廠
爐數: 3
總進廠量: 450 噸
焚化量: 420 噸
貯坑量: 350 噸
貯坑容量: 1000 噸`;

/**
 * Parse operational text into structured data (supporting both single text and CSV)
 */
export function parseOperationalText(text: string): Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>[] | null {
    try {
        const lines = text.trim().split('\n').filter(line => line.trim());

        // Check for Custom Line Format
        // e.g. 中區廠:3爐...
        const isCustomFormat = lines.some(line => /^(中區廠|南區廠|仁武廠|岡山廠)\s*[:：]/.test(line.trim()));
        if (isCustomFormat) {
            return parseCustomLineFormat(lines, text);
        }

        // Check if input is CSV-like (has headers in first line)
        if (lines.length > 0 && lines[0].includes('日期') && lines[0].includes('廠區')) {
            return parseCSVText(lines);
        }

        // Fallback to single entry text parsing
        const singleData = parseSingleTextEntry(text);
        return singleData ? [singleData] : null;
    } catch (error) {
        console.error('Error parsing text:', error);
        return null;
    }
}

/**
 * Parse custom line-based format
 */
function parseCustomLineFormat(lines: string[], fullText: string): Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>[] {
    const results: Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>[] = [];

    // Attempt to find date in text, otherwise default to today
    let date = extractDate(fullText);
    if (!date) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
    }

    for (const line of lines) {
        const trimmedLine = line.trim();
        const plantMatch = trimmedLine.match(/^(中區廠|南區廠|仁武廠|岡山廠)\s*[:：]/);
        if (!plantMatch) continue;

        const plantName = plantMatch[1] as PlantName;
        const data: any = {
            date,
            plantName,
        };

        // Parse Furnace Count: 3爐
        const furnaceMatch = trimmedLine.match(/[:：]\s*(\d+)爐/);
        if (furnaceMatch) data.furnaceCount = parseInt(furnaceMatch[1], 10);

        // Parse Total Intake: 總進廠量1,138噸
        const totalIntakeMatch = trimmedLine.match(/總進廠量\s*[:：]?\s*([0-9,]+)/);
        if (totalIntakeMatch) data.totalIntake = parseFloat(totalIntakeMatch[1].replace(/,/g, ''));

        // Parse Incineration Amount: 焚化量674噸
        const incinerationMatch = trimmedLine.match(/焚化量\s*[:：]?\s*([0-9,]+)/);
        if (incinerationMatch) data.incinerationAmount = parseFloat(incinerationMatch[1].replace(/,/g, ''));

        // Parse Pit Storage/Capacity: 貯坑存量7,127/6,900(103.3%)
        // Regex explanation:
        // 貯坑存量 matches literal characters
        // \s*[:：]?\s* matches optional colon and whitespace
        // ([0-9,]+) matches the first number (storage)
        // \s*[\/／]\s* matches the slash (half or full width) with optional whitespace
        // ([0-9,]+) matches the second number (capacity)
        const pitMatch = trimmedLine.match(/貯坑存量\s*[:：]?\s*([0-9,]+)\s*[\/／]\s*([0-9,]+)/);
        if (pitMatch) {
            data.pitStorage = parseFloat(pitMatch[1].replace(/,/g, ''));
            data.pitCapacity = parseFloat(pitMatch[2].replace(/,/g, ''));
        }

        // Parse Platform Reserved: 平台預約179噸
        const platformMatch = trimmedLine.match(/平台預約\s*[:：]?\s*([0-9,]+)/);
        if (platformMatch) data.platformReserved = parseFloat(platformMatch[1].replace(/,/g, ''));

        // Parse Actual Intake: 實際進廠135噸
        const actualIntakeMatch = trimmedLine.match(/實際進廠\s*[:：]?\s*([0-9,]+)/);
        if (actualIntakeMatch) data.actualIntake = parseFloat(actualIntakeMatch[1].replace(/,/g, ''));

        // Parse Trips: 超約0車/調整0車
        const tripsMatch = trimmedLine.match(/超約\s*[:：]?\s*(\d+)車\/調整\s*[:：]?\s*(\d+)車/);
        if (tripsMatch) {
            data.overReservedTrips = parseInt(tripsMatch[1], 10);
            data.adjustedTrips = parseInt(tripsMatch[2], 10);
        }

        // Special handling for Central Plant (中區廠) to default missing fields to 0
        if (plantName === '中區廠') {
            if (data.platformReserved === undefined) data.platformReserved = 0;
            if (data.actualIntake === undefined) data.actualIntake = 0;
            if (data.overReservedTrips === undefined) data.overReservedTrips = 0;
            if (data.adjustedTrips === undefined) data.adjustedTrips = 0;
        }

        results.push(data);
    }

    return results;
}

/**
 * Parse single operational text entry
 */
function parseSingleTextEntry(text: string): Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>> | null {
    const data: Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>> = {};

    // Extract date
    const dateMatch = text.match(/日期[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dateMatch) {
        data.date = dateMatch[1].replace(/\//g, '-');
    }

    // Extract plant name
    const plantMatch = text.match(/廠區[：:]\s*(中區廠|南區廠|仁武廠|岡山廠)/);
    if (plantMatch) {
        data.plantName = plantMatch[1] as PlantName;
    }

    // Extract furnace count
    const furnaceMatch = text.match(/爐數[：:]\s*(\d+)/);
    if (furnaceMatch) {
        data.furnaceCount = parseInt(furnaceMatch[1], 10);
    }

    // Extract total intake
    const intakeMatch = text.match(/總進廠量[：:]\s*(\d+(?:\.\d+)?)\s*(?:噸)?/);
    if (intakeMatch) {
        data.totalIntake = parseFloat(intakeMatch[1]);
    }

    // Extract incineration amount
    const incinerationMatch = text.match(/焚化量[：:]\s*(\d+(?:\.\d+)?)\s*(?:噸)?/);
    if (incinerationMatch) {
        data.incinerationAmount = parseFloat(incinerationMatch[1]);
    }

    // Extract pit storage
    const pitStorageMatch = text.match(/貯坑量[：:]\s*(\d+(?:\.\d+)?)\s*(?:噸)?/);
    if (pitStorageMatch) {
        data.pitStorage = parseFloat(pitStorageMatch[1]);
    }

    // Extract pit capacity
    const pitCapacityMatch = text.match(/貯坑容量[：:]\s*(\d+(?:\.\d+)?)\s*(?:噸)?/);
    if (pitCapacityMatch) {
        data.pitCapacity = parseFloat(pitCapacityMatch[1]);
    }

    // Extract platform reserved (optional)
    const platformReservedMatch = text.match(/平台預約[：:]\s*(\d+(?:\.\d+)?)/);
    if (platformReservedMatch) {
        data.platformReserved = parseFloat(platformReservedMatch[1]);
    }

    // Extract actual intake (optional)
    const actualIntakeMatch = text.match(/實際進廠[：:]\s*(\d+(?:\.\d+)?)/);
    if (actualIntakeMatch) {
        data.actualIntake = parseFloat(actualIntakeMatch[1]);
    }

    // Extract over reserved trips (optional)
    const overReservedMatch = text.match(/超約車次[：:]\s*(\d+)/);
    if (overReservedMatch) {
        data.overReservedTrips = parseInt(overReservedMatch[1], 10);
    }

    // Extract adjusted trips (optional)
    const adjustedTripsMatch = text.match(/調整車次[：:]\s*(\d+)/);
    if (adjustedTripsMatch) {
        data.adjustedTrips = parseInt(adjustedTripsMatch[1], 10);
    }

    if (Object.keys(data).length === 0) return null;
    return data;
}

/**
 * Parse CSV text format with smart column alignment
 * Headers: 日期,廠區,運轉爐數,平台預約量,超過預約量車次,調整後進廠車次,實際進廠量,總進廠量,焚化量,貯坑存量,貯坑容量,貯坑百分比
 * 
 * When a row has fewer values than headers, align from both ends:
 * - First 3 columns (日期, 廠區, 運轉爐數) align from start
 * - Last 5 columns (總進廠量, 焚化量, 貯坑存量, 貯坑容量, 貯坑百分比) align from end
 * - Middle columns (平台預約量, 超過預約量車次, 調整後進廠車次, 實際進廠量) are optional
 */
function parseCSVText(lines: string[]): Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>[] {
    const headers = lines[0].split(',').map(h => h.trim());
    const results: Partial<Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>>[] = [];

    // Mapping from CSV header to PlantData key
    const fieldMap: Record<string, keyof Omit<PlantData, 'id' | 'createdAt' | 'updatedAt'>> = {
        '運轉爐數': 'furnaceCount',
        '平台預約量': 'platformReserved',
        '超過預約量車次': 'overReservedTrips',
        '調整後進廠車次': 'adjustedTrips',
        '實際進廠量': 'actualIntake',
        '總進廠量': 'totalIntake',
        '焚化量': 'incinerationAmount',
        '貯坑存量': 'pitStorage',
        '貯坑容量': 'pitCapacity',
    };

    // First 3 columns align from start, last 5 from end when row has fewer values

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue; // Need at least date and plant name

        // Smart alignment: create a mapping from header index to value
        const alignedValues: string[] = new Array(headers.length).fill('');

        if (values.length >= headers.length) {
            // Perfect match or more values - direct mapping
            headers.forEach((_, idx) => {
                alignedValues[idx] = values[idx] || '';
            });
        } else {
            // Fewer values than headers - smart alignment
            // Step 1: Align first 3 from start
            const startCount = Math.min(3, values.length);
            for (let j = 0; j < startCount; j++) {
                alignedValues[j] = values[j];
            }

            // Step 2: Align last 5 from end (excluding percentage which is last)
            const endCount = Math.min(5, values.length - startCount);
            for (let j = 0; j < endCount; j++) {
                const valueIdx = values.length - 1 - j;
                const headerIdx = headers.length - 1 - j;
                alignedValues[headerIdx] = values[valueIdx];
            }

            // Middle values (if any remaining) fill middle headers
            const middleValueStart = startCount;
            const middleValueEnd = values.length - endCount;
            const middleHeaderStart = 3;

            for (let j = 0; j < middleValueEnd - middleValueStart; j++) {
                if (middleHeaderStart + j < headers.length - endCount) {
                    alignedValues[middleHeaderStart + j] = values[middleValueStart + j];
                }
            }
        }

        const rowData: any = {};
        let hasData = false;

        headers.forEach((header, index) => {
            const value = alignedValues[index];

            if (header === '日期') {
                // Try YYYY/MM/DD or YYYY/M/D format first (e.g., 2026/01/10 or 2026/1/10)
                const fullDateMatch = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
                if (fullDateMatch) {
                    const year = fullDateMatch[1];
                    const month = fullDateMatch[2].padStart(2, '0');
                    const day = fullDateMatch[3].padStart(2, '0');
                    rowData.date = `${year}-${month}-${day}`;
                    hasData = true;
                }
                // Try M/D format (e.g., 1/10) - only if no year in the string
                else {
                    const shortDateMatch = value.match(/^(\d{1,2})\/(\d{1,2})$/);
                    if (shortDateMatch) {
                        const year = new Date().getFullYear();
                        const month = shortDateMatch[1].padStart(2, '0');
                        const day = shortDateMatch[2].padStart(2, '0');
                        rowData.date = `${year}-${month}-${day}`;
                        hasData = true;
                    }
                    // Try YYYY-MM-DD format (ISO format)
                    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        rowData.date = value;
                        hasData = true;
                    }
                }
            } else if (header === '廠區') {
                if (['中區廠', '南區廠', '仁武廠', '岡山廠'].includes(value)) {
                    rowData.plantName = value;
                    hasData = true;
                }
            } else if (fieldMap[header]) {
                if (value && !value.includes('%')) {
                    const num = parseFloat(value.replace(/,/g, ''));
                    if (!isNaN(num)) {
                        rowData[fieldMap[header]] = num;
                        hasData = true;
                    }
                }
            }
        });

        // Default missing numeric fields to 0
        if (hasData && rowData.date && rowData.plantName) {
            if (rowData.furnaceCount === undefined) rowData.furnaceCount = 0;
            if (rowData.platformReserved === undefined) rowData.platformReserved = 0;
            if (rowData.overReservedTrips === undefined) rowData.overReservedTrips = 0;
            if (rowData.adjustedTrips === undefined) rowData.adjustedTrips = 0;
            if (rowData.actualIntake === undefined) rowData.actualIntake = 0;
            if (rowData.totalIntake === undefined) rowData.totalIntake = 0;
            if (rowData.incinerationAmount === undefined) rowData.incinerationAmount = 0;
            if (rowData.pitStorage === undefined) rowData.pitStorage = 0;
            if (rowData.pitCapacity === undefined) rowData.pitCapacity = 1;

            results.push(rowData);
        }
    }

    return results;
}

/**
 * Extract date from various text formats
 */
export function extractDate(text: string): string | null {
    const patterns = [
        /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日]?/,
        /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    return null;
}

/**
 * Extract plant name from text
 */
export function extractPlantName(text: string): PlantName | null {
    const plants: PlantName[] = ['中區廠', '南區廠', '仁武廠', '岡山廠'];
    for (const plant of plants) {
        if (text.includes(plant)) return plant;
    }
    return null;
}

/**
 * Extract numeric value from text with optional unit
 */
export function extractMetric(text: string, keyword: string, unit?: string): number | null {
    const unitPattern = unit ? `\\s*${unit}?` : '';
    const pattern = new RegExp(`${keyword}[：:]?\\s*(\\d+(?:\\.\\d+)?)${unitPattern}`, 'i');
    const match = text.match(pattern);
    if (match) return parseFloat(match[1]);
    return null;
}

/**
 * Validate parsed data has minimum required fields
 */
export function hasRequiredFields(data: Partial<PlantData>): boolean {
    return !!(
        data.date &&
        data.plantName &&
        data.furnaceCount !== undefined &&
        data.totalIntake !== undefined &&
        data.incinerationAmount !== undefined &&
        data.pitStorage !== undefined &&
        data.pitCapacity !== undefined
    );
}
