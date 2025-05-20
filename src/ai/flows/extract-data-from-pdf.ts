
'use server';
/**
 * @fileOverview Extracts data from a PDF using AI (Genkit).
 *
 * - extractDataFromPdf - A function that handles the data extraction process.
 * - ExtractDataFromPdfInput - The input type for the extractDataFromPdf function.
 * - ExtractDataFromPdfOutput - The return type for the extractDataFromPdf function.
 */

import { ai } from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the overall flow input
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
 return response;
}

const extractDataFromPdfPromptObj = ai.definePrompt({
  name: 'extractDataFromPdfPrompt',
  input: { schema: ExtractDataFromPdfInputSchema }, // Changed from PromptInputSchema to ExtractDataFromPdfInputSchema
  output: { schema: ExtractDataFromPdfOutputSchema },
  prompt: `You are an expert data extraction specialist.
You will receive a PDF document. Your task is to analyze this document and extract all the relevant information from it and return it as a JSON object.

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

Format the entire JSON object (structured as described above) as a single string value for the 'jsonOutput' key. Only output the JSON object containing the 'jsonOutput' key. For example: {"jsonOutput": "{\\"classe\\": \\"...", \\"présences\\": [], ...}"}

PDF Document:
{{media url=pdfDataUri}}`, // Changed from ocrText to pdfDataUri
});

const extractDataFromPdfFlow = ai.defineFlow(
  {
    name: 'extractDataFromPdfFlow',
    inputSchema: ExtractDataFromPdfInputSchema,
    outputSchema: ExtractDataFromPdfOutputSchema,
  },
  async (flowInput) => {
    console.log('Input to Genkit prompt (AI model):', { pdfDataUriLength: flowInput.pdfDataUri.length }); // Log length to avoid huge data in logs

    let response;
    try {
      // Pass the original flowInput (which contains pdfDataUri) directly to the prompt
      response = await extractDataFromPdfPromptObj(flowInput);
      console.log('Full response object from AI prompt:', response);
    } catch (error: any) {
      console.error('Error during AI model interaction:', error.message, error.stack);
      // Return a structured empty JSON string for jsonOutput in case of AI error
      return { jsonOutput: '{"classe":"","cours":"","date":"","nom_du_professeur":"","nombre_des_présents":0,"salle_n":"","séance":"","présences":[]}' };
    }

    if (!response || typeof response !== 'object' || !('jsonOutput' in response)) {
      console.error('AI response is missing "jsonOutput", not an object, or null. Raw response:', response);
      return { jsonOutput: '{"classe":"","cours":"","date":"","nom_du_professeur":"","nombre_des_présents":0,"salle_n":"","séance":"","présences":[]}' };
    }

    const jsonOutputValue = response.jsonOutput;
    if (typeof jsonOutputValue !== 'string') {
      console.error('The value of "jsonOutput" is not a string. Value:', jsonOutputValue);
      return { jsonOutput: '{"classe":"","cours":"","date":"","nom_du_professeur":"","nombre_des_présents":0,"salle_n":"","séance":"","présences":[]}' };
    }

    try {
      JSON.parse(jsonOutputValue); // Validate the inner JSON string
      return response; // Return { jsonOutput: "stringified_json_data" }
    } catch (parseError: any) {
      console.error('Error parsing jsonOutput string as JSON:', parseError.message, 'String value was:', jsonOutputValue);
      return { jsonOutput: '{"classe":"","cours":"","date":"","nom_du_professeur":"","nombre_des_présents":0,"salle_n":"","séance":"","présences":[]}' };
    }
  }
);
