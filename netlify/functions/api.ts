import { Handler } from '@netlify/functions';
import { google } from 'googleapis';
import userCredentials from '../../.env'; // This might cause issues if not handled by bundler correctly, usually process.env is enough in Netlify functions
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

export const handler: Handler = async (event, context) => {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Missing Spreadsheet ID' }),
        };
    }

    try {
        const sheets = await getSheetsInstance();

        // Handle GET request (Fetch data)
        if (event.httpMethod === 'GET') {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'A:M',
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ data: [] }),
                };
            }

            // Transform rows to objects based on headers
            const headers = rows[0];
            // Basic validation: Check if headers look like our expected schema keys
            // If the first row looks like data (e.g. starts with a date), we might have missing headers
            const hasHeaders = headers.includes('plantName') && headers.includes('totalIntake');

            if (!hasHeaders) {
                // If no headers found but data exists, this is tricky. 
                // We'll return empty or try to map by index if strict schema is enforced.
                // For safety, let's just return empty but log it, or return raw data if useful.
                // Better approach: Let the client handle it or just return empty to avoid crashes.
                console.warn('No valid headers found in sheet');
                return {
                    statusCode: 200,
                    body: JSON.stringify({ data: [] }),
                };
            }

            const data = rows.slice(1).map((row) => {
                const obj: any = {};
                headers.forEach((header, index) => {
                    if (header) obj[header] = row[index];
                });
                return obj;
            });

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data }),
            };
        }

        // Handle POST request (Add data)
        if (event.httpMethod === 'POST') {
            if (!event.body) {
                return { statusCode: 400, body: 'Missing request body' };
            }

            const payload = JSON.parse(event.body);
            const schema = [
                'id',
                'date',
                'plantName',
                'furnaceCount',
                'totalIntake',
                'incinerationAmount',
                'pitStorage',
                'pitCapacity',
                'platformReserved',
                'actualIntake',
                'overReservedTrips',
                'adjustedTrips',
                'updatedAt'
            ];

            // Check if sheet is empty to write headers
            const checkResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'A1:A1',
            });
            const isSheetEmpty = !checkResponse.data.values || checkResponse.data.values.length === 0;

            const rowsToAdd = Array.isArray(payload) ? payload : [payload];
            const values = rowsToAdd.map((item: any) => {
                return schema.map(key => item[key] ?? '');
            });

            if (isSheetEmpty) {
                // Prepend headers to the values
                values.unshift(schema);
            }

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'A1',
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
