
'use server';
/**
 * @fileOverview Saves extracted PDF data to a Google Sheet.
 * Each student will be on a new row, with other PDF data repeated.
 *
 * - saveToGoogleSheet - A function that handles saving data to Google Sheets.
 * - SaveToGoogleSheetInput - The input type for the saveToGoogleSheet function.
 * - SaveToGoogleSheetOutput - The return type for the saveToGoogleSheet function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ExtractedPdfDataSchema, type ExtractedPdfData } from '@/ai/schemas/pdf-data-schema';
import { google } from 'googleapis';

const SaveToGoogleSheetInputSchema = ExtractedPdfDataSchema; // Input is the full extracted data object
export type SaveToGoogleSheetInput = ExtractedPdfData;

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
  async (data) => {
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

      const newHeaderRow = [
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
            ...commonData,
            student.n ?? "",
            student.nom_prénom ?? "",
          ]);
        }
      } else {
        // If no students, add one row with common data and blank student fields
        dataRowsToAppend.push([
          ...commonData,
          "", // N° Étudiant
          "", // Nom & Prénom Étudiant
        ]);
      }

      let sheetNeedsHeader = true;
      try {
        // Construct the range string for checking the header, e.g., "Sheet1!A1:I1"
        const headerCheckRange = `Sheet1!A1:${String.fromCharCode(64 + newHeaderRow.length)}1`;
        const headerCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: headerCheckRange,
        });
        if (headerCheck.data.values && headerCheck.data.values.length > 0) {
            // Compare the fetched header with the expected header
            if (JSON.stringify(headerCheck.data.values[0]) === JSON.stringify(newHeaderRow)) {
                 sheetNeedsHeader = false;
            }
        }
      } catch (getHeaderError: any) {
          // Handle cases where the sheet might be empty or the range doesn't exist yet
          if (getHeaderError.message && (getHeaderError.message.includes("Unable to parse range") || getHeaderError.message.includes("Requested entity was not found"))) {
              // This typically means the sheet is empty or doesn't have enough columns yet, so header is needed.
              sheetNeedsHeader = true;
          } else if (getHeaderError.response && getHeaderError.response.data && getHeaderError.response.data.error && getHeaderError.response.data.error.code === 404) {
              // Another way Google API might indicate the sheet/range doesn't exist
              sheetNeedsHeader = true;
          }
           else {
            // For other errors, log a warning but proceed cautiously, assuming header might be needed.
            console.warn("Could not definitively check for header due to an error. Error:", getHeaderError.message);
            sheetNeedsHeader = true; // Default to needing header on unexpected error
          }
      }
      
      const finalRowsForSheet = [];
      if (sheetNeedsHeader) {
          console.log("Sheet requires header. Prepending header row.");
          finalRowsForSheet.push(newHeaderRow);
      }
      finalRowsForSheet.push(...dataRowsToAppend);

      if (finalRowsForSheet.length === 0) {
        return {
            success: true,
            message: 'No data to append to Google Sheet.',
            spreadsheetId: spreadsheetId,
        };
      }

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1', // Always append starting from A1, Sheets API handles finding the next empty row.
        valueInputOption: 'USER_ENTERED', 
        insertDataOption: 'INSERT_ROWS', 
        requestBody: {
          values: finalRowsForSheet,
        },
      });

      console.log('Successfully saved to Google Sheet:', response.data);
      return {
        success: true,
        message: `Data successfully saved to Google Sheet. ${dataRowsToAppend.length} data row(s) added. ${sheetNeedsHeader ? 'Header was also written.' : 'Existing header was used.'}`,
        spreadsheetId: response.data.spreadsheetId,
        updatedRange: response.data.updates?.updatedRange,
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

    