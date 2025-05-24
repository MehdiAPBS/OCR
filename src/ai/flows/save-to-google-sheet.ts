
'use server';
/**
 * @fileOverview Saves extracted PDF data to a Google Sheet.
 * Each student will be on a new row, with other PDF data repeated.
 * If data for the same documentInstanceId already exists, it's deleted before appending.
 * Operations are performed on the *first sheet* found in the spreadsheet.
 *
 * - saveToGoogleSheet - A function that handles saving data to Google Sheets.
 * - SaveToGoogleSheetInput - The input type for the saveToGoogleSheet function.
 * - SaveToGoogleSheetOutput - The return type for the saveToGoogleSheet function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ExtractedPdfDataSchema } from '@/ai/schemas/pdf-data-schema';
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
        // Ensure private_key newlines are correctly formatted for the googleapis library
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

      // --- Get properties of the first sheet ---
      let firstSheetProperties;
      let actualSheetNameUsed: string;
      let actualSheetIdNumberUsed: number;

      try {
          const spreadsheetDetails = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'sheets(properties(sheetId,title))', // Efficiently get only sheetId and title for all sheets
          });

          if (!spreadsheetDetails.data.sheets || spreadsheetDetails.data.sheets.length === 0) {
            return { success: false, message: 'The specified spreadsheet contains no sheets.' };
          }
          // Assume we operate on the first sheet (gid=0 equivalent)
          const firstSheet = spreadsheetDetails.data.sheets[0];
          if (!firstSheet.properties || typeof firstSheet.properties.sheetId !== 'number' || !firstSheet.properties.title) {
            return { success: false, message: 'Could not retrieve valid properties (ID and Title) for the first sheet.' };
          }
          firstSheetProperties = firstSheet.properties;
          actualSheetNameUsed = firstSheetProperties.title;
          actualSheetIdNumberUsed = firstSheetProperties.sheetId;

      } catch (e: any) {
          console.error("Failed to get spreadsheet details (for sheetId/title):", e.message);
          return { success: false, message: `Failed to get spreadsheet details: ${e.message}` };
      }

      console.log(`Operating on sheet titled: '${actualSheetNameUsed}' with numerical ID: ${actualSheetIdNumberUsed}`);

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
      const documentInstanceIdColumnIndex = 0; 

      // --- 1. Check and write header if necessary ---
      let sheetNeedsHeader = true;
      try {
        const headerCheckRange = `${actualSheetNameUsed}!A1:${String.fromCharCode(64 + newHeaderRow.length)}1`;
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
              sheetNeedsHeader = true; // Sheet or range doesn't exist, so header is needed
          } else if (getHeaderError.response && getHeaderError.response.data && getHeaderError.response.data.error && getHeaderError.response.data.error.code === 404) {
              sheetNeedsHeader = true; // Also indicates entity not found
          } else {
            // For other errors, conservatively assume header might be needed or log warning.
            console.warn("Could not definitively check for header due to an error. Proceeding as if header is needed. Error:", getHeaderError.message);
            sheetNeedsHeader = true; 
          }
      }

      // --- 2. Find and delete existing rows for this documentInstanceId ---
      if (!sheetNeedsHeader) { 
        console.log(`Checking for existing data with DocumentInstanceID: ${documentInstanceId} in sheet: ${actualSheetNameUsed}`);
        const dataToSearch = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${actualSheetNameUsed}!A:A`, 
        });

        const rowsToDelete: sheets_v4.Schema$Request[] = [];
        if (dataToSearch.data.values) {
            for (let i = 0; i < dataToSearch.data.values.length; i++) {
                if (dataToSearch.data.values[i][documentInstanceIdColumnIndex] === documentInstanceId) {
                    rowsToDelete.push({
                        deleteDimension: {
                            range: {
                                sheetId: actualSheetIdNumberUsed, 
                                dimension: 'ROWS',
                                startIndex: i, 
                                endIndex: i + 1,
                            },
                        },
                    });
                }
            }
        }

        if (rowsToDelete.length > 0) {
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
            documentInstanceId, 
            ...commonData,
            student.n ?? "",
            student.nom_prénom ?? "",
          ]);
        }
      } else {
        dataRowsToAppend.push([
          documentInstanceId, 
          ...commonData,
          "", 
          "", 
        ]);
      }
      
      const finalRowsForSheet = [];
      if (sheetNeedsHeader) {
          console.log("Sheet requires header. Prepending header row.");
          finalRowsForSheet.push(newHeaderRow);
      }
      finalRowsForSheet.push(...dataRowsToAppend);

      if (finalRowsForSheet.length === 0 || (finalRowsForSheet.length === 1 && sheetNeedsHeader && dataRowsToAppend.length === 0)) {
        return {
            success: true,
            message: 'No new data rows to append to Google Sheet.',
            spreadsheetId: spreadsheetId,
        };
      }

      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${actualSheetNameUsed}!A1`, 
        valueInputOption: 'USER_ENTERED', 
        insertDataOption: 'INSERT_ROWS', 
        requestBody: {
          values: finalRowsForSheet,
        },
      });

      console.log('Successfully saved/updated data in Google Sheet:', appendResponse.data);
      return {
        success: true,
        message: `Data successfully saved/updated in Google Sheet '${actualSheetNameUsed}'. ${dataRowsToAppend.length} data row(s) processed for DocumentInstanceID ${documentInstanceId}. ${sheetNeedsHeader ? 'Header was also written.' : ''}`,
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
