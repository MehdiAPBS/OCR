
'use server';
/**
 * @fileOverview Saves extracted PDF data to a Google Sheet.
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
    const serviceAccountCredsJson = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON;

    if (!spreadsheetId) {
      return { success: false, message: 'Google Sheet ID is not configured in environment variables.' };
    }
    if (!serviceAccountCredsJson) {
      return { success: false, message: 'Google Service Account credentials are not configured in environment variables.' };
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountCredsJson);
    } catch (error) {
      console.error('Failed to parse Google Service Account credentials JSON:', error);
      return { success: false, message: 'Invalid Google Service Account credentials JSON format.' };
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Define the order of columns (header row)
      // This should match the order in which you want data to appear in the sheet
      const headerRow = [
        'Classe',
        'Cours',
        'Date',
        'Nom du Professeur',
        'Nombre des Présents',
        'Salle N°',
        'Séance',
        'Présences (JSON)',
      ];

      // Map the input data to an array of values in the order of the headerRow
      // Ensure all keys from ExtractedPdfData are handled here.
      const values = [
        data.classe ?? "",
        data.cours ?? "",
        data.date ?? "",
        data.nom_du_professeur ?? "",
        data.nombre_des_présents ?? 0,
        data.salle_n ?? "",
        data.séance ?? "",
        JSON.stringify(data.présences ?? []), // Stringify the 'présences' array
      ];

      // Check if header exists, if not, add it.
      // For simplicity, we'll assume the sheet might be empty or we always append.
      // A more robust solution would check for the header and add it if missing.
      // Let's try to get the first row to see if it's a header.
      let sheetNeedsHeader = true;
      try {
        const headerCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A1:H1', // Adjust range based on number of columns
        });
        if (headerCheck.data.values && headerCheck.data.values.length > 0) {
            // Basic check if first row looks like our header
            if (JSON.stringify(headerCheck.data.values[0]) === JSON.stringify(headerRow)) {
                 sheetNeedsHeader = false;
            }
        }
      } catch (getHeaderError: any) {
          if (getHeaderError.message.includes("Unable to parse range")) {
              // Likely an empty sheet, so header is needed.
              sheetNeedsHeader = true;
          } else {
            console.warn("Could not check for header:", getHeaderError.message);
            // Proceed cautiously, perhaps header is needed.
          }
      }
      
      const rowsToAppend = [];
      if (sheetNeedsHeader) {
          rowsToAppend.push(headerRow);
      }
      rowsToAppend.push(values);


      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1', // Start appending from cell A1 of 'Sheet1'
        valueInputOption: 'USER_ENTERED', // Data is parsed as if the user typed it into the UI.
        insertDataOption: 'INSERT_ROWS', 
        requestBody: {
          values: rowsToAppend,
        },
      });

      console.log('Successfully saved to Google Sheet:', response.data);
      return {
        success: true,
        message: 'Data successfully saved to Google Sheet.',
        spreadsheetId: response.data.spreadsheetId,
        updatedRange: response.data.updates?.updatedRange,
      };
    } catch (error: any) {
      console.error('Error saving to Google Sheet:', error);
      let errorMessage = `Failed to save to Google Sheet: ${error.message}`;
      if (error.response?.data?.error?.message) {
        errorMessage += ` Google API Error: ${error.response.data.error.message}`;
      }
      return { success: false, message: errorMessage };
    }
  }
);
