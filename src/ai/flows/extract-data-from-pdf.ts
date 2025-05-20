
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

The JSON object (which will be the string value for the 'jsonOutput' key) should have the following top-level keys:
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

CRITICAL INSTRUCTION FOR HANDLING MISSING DATA:
If any individual field specified above (e.g., \`classe\`, \`cours\`, \`date\`, \`nom_du_professeur\`, \`salle_n\`, \`séance\`) cannot be found or determined from the PDF, you MUST include the key in the JSON output but use an empty string \`""\` as its value.
For the \`nombre_des_présents\` field, if it cannot be determined, use the number \`0\`.
For the \`présences\` array, if no attendees are found or the data is missing, you MUST include the \`présences\` key with an empty array \`[]\` as its value. Within objects in the 'présences' array, if 'n' or 'nom_prénom' cannot be found, use an empty string \`""\` for their values.
DO NOT OMIT ANY KEYS specified in the structure. The goal is to always return a JSON string that strictly conforms to the defined structure, using empty/default values for missing information.

Extract the information from the PDF and format the entire JSON object (structured as described above) as a single string value for the 'jsonOutput' key. Only output the JSON object containing the 'jsonOutput' key. For example: {"jsonOutput": "{\\"classe\\": \\"...", \\"présences\\": [], ...}"}

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
    let response; // This will hold the structured output from the prompt call
    try {
      // 'prompt' is a function that takes 'ExtractDataFromPdfInputSchema'
      // and returns a Promise of 'ExtractDataFromPdfOutputSchema'.
      // So, 'response' here should be of type ExtractDataFromPdfOutputSchema if successful.
      response = await prompt(input); 
      console.log('Full response object from AI prompt:', response); 
    } catch (error) {
      console.error('Error during AI model interaction:', error); // Log AI errors
      // Return a default structure consistent with ExtractDataFromPdfOutputSchema on error
      return { jsonOutput: '{}' }; 
    }

    // Check if the 'response' (structured output from prompt) is valid and contains 'jsonOutput'
    if (!response || typeof response !== 'object' || !('jsonOutput' in response)) {
      console.error('AI response (after prompt processing) is missing the "jsonOutput" property, is not an object, or is null/undefined. Raw response:', response);
      return { jsonOutput: '{}' }; 
    }

    const jsonOutputValue = response.jsonOutput;

    // Check if the jsonOutput value is a string
    if (typeof jsonOutputValue !== 'string') {
      console.error('The value of "jsonOutput" is not a string. Value:', jsonOutputValue);
      return { jsonOutput: '{}' };
    }

    try {
      // Attempt to parse the jsonOutput string to validate it's valid JSON.
      // This is the inner JSON string that should contain the actual extracted data.
      JSON.parse(jsonOutputValue);
      // If parsing is successful, return the 'response' object which is { jsonOutput: "string_of_json_data" }
      return response;
    } catch (parseError) {
      console.error('Error parsing jsonOutput string as JSON:', parseError, 'String value:', jsonOutputValue);
      // If parsing the inner JSON string fails, return a default structure
      return { jsonOutput: '{}' };
    }
  }
);
