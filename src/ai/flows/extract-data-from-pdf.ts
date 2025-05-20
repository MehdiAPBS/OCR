'use server';
/**
 * @fileOverview Extracts data from a PDF using OCR and AI.
 *
 * - extractDataFromPdf - A function that handles the data extraction process.
 * - ExtractDataFromPdfInput - The input type for the extractDataFromPdf function.
 * - ExtractDataFromPdfOutput - The return type for the extractDataFromPdf function.
 */

import { ai } from '@/ai/genkit';
import {z} from 'genkit';

const ExtractDataFromPdfInputSchema = z.object({ 
 pdfDataUri: z.string()
    .describe(
      "The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractDataFromPdfInput = z.infer<typeof ExtractDataFromPdfInputSchema>;
 
const ExtractDataFromPdfOutputSchema = z.object({jsonOutput: z.string().describe('The extracted data from the PDF, as a JSON string.'),}); 

export type ExtractDataFromPdfOutput = z.infer<typeof ExtractDataFromPdfOutputSchema>;
export async function extractDataFromPdf(input: ExtractDataFromPdfInput): Promise<ExtractDataFromPdfOutput> {
 const response = await extractDataFromPdfFlow(input);
 // The flow should now return the object with jsonOutput
 return response;
}


const prompt = ai.definePrompt({
  name: 'extractDataFromPdfPrompt',
  input: { schema: ExtractDataFromPdfInputSchema },
  output: { schema: ExtractDataFromPdfOutputSchema },
  prompt: `You are an expert data extraction specialist.
You will receive a PDF document and your task is to extract all the relevant information from it and return it as a JSON object. Use OCR to read the PDF content.

The JSON object should have the following top-level keys:
- \`classe\` (string): The class concerned by the attendance sheet.
- \`cours\` (string): The course concerned by the attendance sheet.
- \`date\` (string): The date of the attendance sheet.
- \`nom_du_professeur\` (string): The name of the professor.
- \`nombre_des_présents\` (number): The total number of attendees.
- \`salle_n\` (string): The room number.
- \`séance\` (string): The session time.
- \`présences\` (array of objects): An array representing the attendees. Each object in the array should have two keys:
  - \`n\` (string): The student number.
  - \`nom_prénom\` (string): The student's full name.

Extract the information from the PDF and format the entire JSON object as a single string value for the 'jsonOutput' key. Only output the JSON object containing the 'jsonOutput' key.

PDF Document: {{media url=pdfDataUri}}`,
});

const extractDataFromPdfFlow = ai.defineFlow(
  {
    name: 'extractDataFromPdfFlow',
    inputSchema: ExtractDataFromPdfInputSchema,
    outputSchema: ExtractDataFromPdfOutputSchema,
  }, 
  async (input) => {
    console.log('Input to prompt:', input); // Log input
    let response;
    try {
      response = await prompt(input);
      // Log the full response object
      console.log('Full response object from AI prompt:', response); 
    } catch (error) {
      console.error('Error during AI model interaction:', error); // Log AI errors
      // Return a default empty structure on error
 return { jsonOutput: '{}' };
    }

    // Check if the response is an object and has the jsonOutput property
    if (!response || typeof response !== 'object' || !('jsonOutput' in response)) {
      console.error('AI response is missing the "jsonOutput" property or is not an object. Raw response:', response);
      // Return a default empty structure
      return { jsonOutput: '{}' };
    }

    const jsonOutputValue = response.jsonOutput;

    // Check if the jsonOutput value is a string
    if (typeof jsonOutputValue !== 'string') {
      console.error('The value of "jsonOutput" is not a string. Value:', jsonOutputValue);
      // Return a default empty structure
 return { jsonOutput: '{}' };
    }

    try {
      // Attempt to parse the jsonOutput string to validate it
      JSON.parse(jsonOutputValue);
      // If parsing is successful, return the response object
 return response;
    } catch (parseError) {
      console.error('Error parsing jsonOutput string as JSON:', parseError, 'String value:', jsonOutputValue);
      // Return a default empty structure if parsing fails
      return { jsonOutput: '{}' };
    }
  }
);
