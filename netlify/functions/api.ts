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
            // Assume the first sheet contains the data, or specify range like 'Sheet1!A:Z'
            // We'll read the entire first sheet
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'A:M', // Adjust range to cover enough columns
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
            const data = rows.slice(1).map((row) => {
                const obj: any = {};
                headers.forEach((header, index) => {
                    // Normalize header keys if necessary
                    obj[header] = row[index];
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
            // Payload should be an array of objects matching the schema

            // Prepare row data based on our known structure
            // We need to ensure the order matches the headers or append consistently
            // For simplicity, let's assume we append to the end and matching columns

            // First, get current headers to map correctly, or define a strict schema
            // Strict Schema approach is safer to ensure column order
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

            // If headers don't exist, we might need to write them first. 
            // Logic: Check if sheet is empty. If so, write headers.

            // For now, let's just accept the raw values array from client to simplify backend logic
            // data: [ [val1, val2...], [val1, val2...] ]
            // OR client sends object and we map it here.

            // Let's implement Mapping here for robustness
            const rowsToAdd = Array.isArray(payload) ? payload : [payload];

            const values = rowsToAdd.map((item: any) => {
                return schema.map(key => item[key] ?? '');
            });

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'A1', // Append automatically finds the next empty row
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
