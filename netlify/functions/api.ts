import { Handler } from '@netlify/functions';
import { google } from 'googleapis';
// import userCredentials from '../../.env'; // Removed to prevent build error
import * as dotenv from 'dotenv';
dotenv.config();

// Scope for Google Sheets API
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Helper to get authenticated client
async function getAuthClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !key) {
        throw new Error('Missing Google Credentials');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: key,
        },
        scopes: SCOPES,
    });

    return await auth.getClient();
}

async function getSheetsInstance() {
    const authClient = await getAuthClient();
    return google.sheets({ version: 'v4', auth: authClient as any });
}

// Helper to ensure a sheet (tab) exists, create if not
async function ensureSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetExists = (spreadsheet.data.sheets || []).some((s: any) => s.properties.title === sheetName);

        if (!sheetExists) {
            console.log(`Creating sheet: ${sheetName}`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        { addSheet: { properties: { title: sheetName } } }
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Error ensuring sheet exists:', error);
    }
}

export const handler: Handler = async (event, context) => {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const searchParams = new URLSearchParams(event.queryStringParameters as any);
    const sheetName = searchParams.get('sheet') || 'Data'; // 'Data' or 'Users'

    if (!spreadsheetId) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Missing Spreadsheet ID' }),
        };
    }

    try {
        const sheets = await getSheetsInstance();

        // Schema mapping for different sheets
        const schemas: Record<string, string[]> = {
            'Data': [
                'id', 'date', 'plantName', 'furnaceCount', 'totalIntake',
                'incinerationAmount', 'pitStorage', 'pitCapacity',
                'platformReserved', 'actualIntake', 'overReservedTrips',
                'adjustedTrips', 'updatedAt', 'createdAt'
            ],
            'Users': [
                'id', 'username', 'email', 'role', 'isApproved', 'createdAt', 'updatedAt'
            ]
        };

        const currentSchema = schemas[sheetName] || schemas['Data'];

        // Handle GET request (Fetch data)
        if (event.httpMethod === 'GET') {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A:O`, // Extended range to be safe
                });

                const rows = response.data.values;
                if (!rows || rows.length === 0) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ data: [] }),
                    };
                }

                const headers = rows[0];
                // If headers don't match, return empty to be safe or try to map
                const data = rows.slice(1).map((row) => {
                    const obj: any = {};
                    headers.forEach((header, index) => {
                        if (header) obj[header] = row[index];
                    });
                    return obj;
                });

                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data }),
                };
            } catch (e: any) {
                // If sheet is missing or range is invalid, return empty data
                if (e.message?.includes('range') || e.code === 400) {
                    console.log(`Sheet "${sheetName}" not found or empty, returning empty data.`);
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ data: [] }),
                    };
                }
                throw e;
            }
        }

        // Handle POST request (Add/Update data)
        if (event.httpMethod === 'POST') {
            if (!event.body) {
                return { statusCode: 400, body: 'Missing request body' };
            }

            const payload = JSON.parse(event.body);
            const isUpdate = searchParams.get('method') === 'PUT' || payload._method === 'PUT';

            // Ensure the sheet exists before we try to interact with it
            await ensureSheetExists(sheets, spreadsheetId, sheetName);

            if (isUpdate) {
                // Update existing record (find by ID)
                // 1. Fetch all rows
                const currentRows = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A:O`,
                });

                const rows = currentRows.data.values || [];
                const headers = rows[0] || [];
                const idIndex = headers.indexOf('id');

                if (idIndex === -1) {
                    return { statusCode: 500, body: 'ID column not found for update' };
                }

                const itemToUpdate = Array.isArray(payload) ? payload[0] : payload;
                const rowIndex = rows.findIndex(r => r[idIndex] === itemToUpdate.id);

                if (rowIndex === -1) {
                    return { statusCode: 404, body: 'Record not found for update' };
                }

                // Prepare new row values
                const newRowValues = currentSchema.map(key => itemToUpdate[key] ?? '');

                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!A${rowIndex + 1}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [newRowValues],
                    },
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Updated successfully' }),
                };
            }

            // Normal append
            // Check if sheet exists/empty for headers
            let needsHeaders = false;
            try {
                const check = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A1:A1`,
                });
                if (!check.data.values || check.data.values.length === 0) {
                    needsHeaders = true;
                }
            } catch (e) {
                needsHeaders = true;
            }

            const rowsToAdd = Array.isArray(payload) ? payload : [payload];
            const values = rowsToAdd.map((item: any) => {
                return currentSchema.map(key => item[key] ?? '');
            });

            if (needsHeaders) {
                values.unshift(currentSchema);
            }

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: values,
                },
            });

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Data saved successfully' }),
            };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };
    } catch (error: any) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
