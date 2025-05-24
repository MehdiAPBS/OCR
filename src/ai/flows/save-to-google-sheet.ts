
'use server';
/**
 * @fileOverview Saves extracted PDF data to a Google Sheet.
 * Each student will be on a new row, with other PDF data repeated.
 * If data for the same documentInstanceId already exists, it's deleted before appending.
 *
 * - saveToGoogleSheet - A function that handles saving data to Google Sheets.
 * - SaveToGoogleSheetInput - The input type for the saveToGoogleSheet function.
 * - SaveToGoogleSheetOutput - The return type for the saveToGoogleSheet function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ExtractedPdfDataSchema, type ExtractedPdfData } from '@/ai/schemas/pdf-data-schema';
import { google, type sheets_v4 } from 'googleapis';

const SaveToGoogleSheetInputSchema = z.object({
  extractedData: ExtractedPdfDataSchema,
  documentInstanceId: z.string().describe('A unique identifier for this PDF processing instance.'),
});
export type SaveToGoogleSheetInput = z.infer<typeof SaveToGoogleSheetInputSchema>;

const SaveToGoogleSheetOutputSchema = z.object({
  success: z.boolean().describe('Whether the save operation was successful.'),
  message: z.string().describe('A message detailing the outcome of the save operation.'),
  spreadsheetId: z.string().optional().describe('The ID of the spreadsheet.'),
  updatedRange: z.string().optional().describe('The range that was updated in A1 notation.'),
});
export type SaveToGoogleSheetOutput = z.infer<typeof SaveToGoogleSheetOutputSchema>;

export async function saveToGoogleSheet(input: SaveToGoogleSheetInput): Promise<SaveToGoogleSheetOutput> {
  return saveToGoogleSheetFlow(input);
}

const saveToGoogleSheetFlow = ai.defineFlow(
  {
    name: 'saveToGoogleSheetFlow',
    inputSchema: SaveToGoogleSheetInputSchema,
    outputSchema: SaveToGoogleSheetOutputSchema,
  },
  async ({ extractedData: data, documentInstanceId }) => {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const serviceAccountCredsJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON;

    if (!spreadsheetId) {
      return { success: false, message: 'Google Sheet ID is not configured in environment variables.' };
    }
    if (!serviceAccountCredsJsonString) {
      return { success: false, message: 'Google Service Account credentials are not configured in environment variables.' };
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountCredsJsonString);
      if (credentials && credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
    } catch (error: any) {
      console.error('Failed to parse Google Service Account credentials JSON:', error.message);
      return { success: false, message: `Invalid Google Service Account credentials JSON format: ${error.message}` };
    }
    
    if (!credentials || !credentials.client_email || !credentials.private_key) {
        return { success: false, message: 'Parsed Google Service Account credentials missing required fields (client_email or private_key).' };
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });

      const sheetName = 'Sheet1'; // Assuming data goes to Sheet1

      // New header row including DocumentInstanceID
      const newHeaderRow = [
        'DocumentInstanceID',
        'Classe',
        'Cours',
        'Date',
        'Nom du Professeur',
        'Nombre des Présents (du PDF)',
        'Salle N°',
        'Séance',
        'N° Étudiant',
        'Nom & Prénom Étudiant',
      ];
      const documentInstanceIdColumnIndex = 0; // 0-based index

      // --- 1. Check and write header if necessary ---
      let sheetNeedsHeader = true;
      try {
        const headerCheckRange = `${sheetName}!A1:${String.fromCharCode(64 + newHeaderRow.length)}1`;
        const headerCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: headerCheckRange,
        });
        if (headerCheck.data.values && headerCheck.data.values.length > 0) {
            if (JSON.stringify(headerCheck.data.values[0]) === JSON.stringify(newHeaderRow)) {
                 sheetNeedsHeader = false;
            }
        }
      } catch (getHeaderError: any) {
          if (getHeaderError.message && (getHeaderError.message.includes("Unable to parse range") || getHeaderError.message.includes("Requested entity was not found"))) {
              sheetNeedsHeader = true;
          } else if (getHeaderError.response && getHeaderError.response.data && getHeaderError.response.data.error && getHeaderError.response.data.error.code === 404) {
              sheetNeedsHeader = true;
          } else {
            console.warn("Could not definitively check for header due to an error. Error:", getHeaderError.message);
            sheetNeedsHeader = true; 
          }
      }

      // --- 2. Find and delete existing rows for this documentInstanceId ---
      let getSheetIdResponse;
      try {
          getSheetIdResponse = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.sheetId' });
      } catch (e: any) {
          console.error("Failed to get sheet properties (for sheetId):", e.message);
          return { success: false, message: `Failed to get sheet properties for deletion: ${e.message}` };
      }
      const sheetIdNumber = getSheetIdResponse?.data?.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;

      if (sheetIdNumber === undefined || sheetIdNumber === null) {
          console.error(`Could not find sheetId for sheet named '${sheetName}'`);
          return { success: false, message: `Could not find sheetId for sheet named '${sheetName}'. Cannot perform deletions.` };
      }

      if (!sheetNeedsHeader) { // Only try to delete if header exists (implies sheet is not brand new)
        console.log(`Checking for existing data with DocumentInstanceID: ${documentInstanceId}`);
        // Read all data to find rows to delete. Might be inefficient for very large sheets.
        // A more optimal way might involve query capabilities if available, or batchGetByDataFilter if we can target DocumentInstanceID column.
        // For simplicity here, reading a large enough range or the whole sheet.
        const dataToSearch = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:A`, // Read only the DocumentInstanceID column
        });

        const rowsToDelete: sheets_v4.Schema$Request[] = [];
        if (dataToSearch.data.values) {
            for (let i = 0; i < dataToSearch.data.values.length; i++) {
                if (dataToSearch.data.values[i][documentInstanceIdColumnIndex] === documentInstanceId) {
                    // Add a request to delete this row. Row indices are 0-based for the API.
                    // Sheet ID needs to be the numeric ID of the sheet, not its name.
                    rowsToDelete.push({
                        deleteDimension: {
                            range: {
                                sheetId: sheetIdNumber, 
                                dimension: 'ROWS',
                                startIndex: i, // 0-indexed row
                                endIndex: i + 1,
                            },
                        },
                    });
                }
            }
        }

        if (rowsToDelete.length > 0) {
            // Delete rows in reverse order to avoid index shifting issues
            rowsToDelete.sort((a, b) => (b.deleteDimension!.range!.startIndex!) - (a.deleteDimension!.range!.startIndex!));
            console.log(`Found ${rowsToDelete.length} existing row(s) for DocumentInstanceID ${documentInstanceId}. Deleting them.`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: rowsToDelete,
                },
            });
        } else {
            console.log(`No existing rows found for DocumentInstanceID ${documentInstanceId}.`);
        }
      }


      // --- 3. Prepare and append new data ---
      const dataRowsToAppend: (string | number | boolean | null)[][] = [];
      const commonData = [
        data.classe ?? "",
        data.cours ?? "",
        data.date ?? "",
        data.nom_du_professeur ?? "",
        data.nombre_des_présents ?? 0,
        data.salle_n ?? "",
        data.séance ?? "",
      ];

      if (data.présences && data.présences.length > 0) {
        for (const student of data.présences) {
          dataRowsToAppend.push([
            documentInstanceId, // Prepend the DocumentInstanceID
            ...commonData,
            student.n ?? "",
            student.nom_prénom ?? "",
          ]);
        }
      } else {
        dataRowsToAppend.push([
          documentInstanceId, // Prepend the DocumentInstanceID
          ...commonData,
          "", // N° Étudiant
          "", // Nom & Prénom Étudiant
        ]);
      }
      
      const finalRowsForSheet = [];
      if (sheetNeedsHeader) {
          console.log("Sheet requires header. Prepending header row.");
          finalRowsForSheet.push(newHeaderRow);
      }
      finalRowsForSheet.push(...dataRowsToAppend);

      if (finalRowsForSheet.length === 0 || (finalRowsForSheet.length === 1 && sheetNeedsHeader)) {
        // This case means only header would be written, or nothing if header exists
        return {
            success: true,
            message: 'No new data rows to append to Google Sheet.',
            spreadsheetId: spreadsheetId,
        };
      }

      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`, 
        valueInputOption: 'USER_ENTERED', 
        insertDataOption: 'INSERT_ROWS', 
        requestBody: {
          values: finalRowsForSheet,
        },
      });

      console.log('Successfully saved/updated data in Google Sheet:', appendResponse.data);
      return {
        success: true,
        message: `Data successfully saved/updated in Google Sheet. ${dataRowsToAppend.length} data row(s) processed for DocumentInstanceID ${documentInstanceId}. ${sheetNeedsHeader ? 'Header was also written.' : ''}`,
        spreadsheetId: appendResponse.data.spreadsheetId,
        updatedRange: appendResponse.data.updates?.updatedRange,
      };
    } catch (error: any) {
      console.error('Error saving to Google Sheet:', error.message, error.stack, error.response?.data?.error);
      let errorMessage = `Failed to save to Google Sheet: ${error.message}`;
      if (error.response?.data?.error?.message) {
        errorMessage += ` Google API Error: ${error.response.data.error.message}`;
      }
      return { success: false, message: errorMessage };
    }
  }
);
