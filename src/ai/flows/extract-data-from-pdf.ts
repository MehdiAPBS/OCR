
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

// Schema for the actual data structure we want the AI to extract
const ExtractedPdfDataSchema = z.object({
  classe: z.string().describe('The class concerned by the attendance sheet. Return "" if not found.'),
  cours: z.string().describe('The course concerned by the attendance sheet. Return "" if not found.'),
  date: z.string().describe('The date of the attendance sheet. Return "" if not found.'),
  nom_du_professeur: z.string().describe('The name of the professor. Return "" if not found.'),
  nombre_des_présents: z.number().describe('The total number of attendees. Return 0 if not found.'),
  salle_n: z.string().describe('The room number. Return "" if not found.'),
  séance: z.string().describe('The session time. Return "" if not found.'),
  présences: z.array(z.object({
    n: z.string().describe("The student number. Return \"\" if not found."),
    nom_prénom: z.string().describe("The student's full name. Return \"\" if not found."),
  })).describe('An array representing the attendees. Return [] if not found or if data is missing for all attendees.'),
});
// This type is internal to the flow's processing.

// Schema for the flow's final output to the frontend (still a stringified JSON)
const ExtractDataFromPdfOutputSchema = z.object({
  jsonOutput: z.string().describe('The extracted data from the PDF, as a JSON string.'),
});
export type ExtractDataFromPdfOutput = z.infer<typeof ExtractDataFromPdfOutputSchema>;


export async function extractDataFromPdf(input: ExtractDataFromPdfInput): Promise<ExtractDataFromPdfOutput> {
  return extractDataFromPdfFlow(input);
}

const extractDataFromPdfPromptObj = ai.definePrompt({
  name: 'extractDataFromPdfPrompt',
  input: { schema: ExtractDataFromPdfInputSchema },
  output: { schema: ExtractedPdfDataSchema }, // AI is now asked to output the direct data structure
  prompt: `You are an expert data extraction specialist.
You will receive a PDF document. Your task is to analyze this document and extract all the relevant information from it.

Return the extracted data as a JSON object strictly conforming to the provided schema.

CRITICAL INSTRUCTION FOR HANDLING MISSING DATA:
- For all string fields (e.g., \`classe\`, \`cours\`, \`date\`, \`nom_du_professeur\`, \`salle_n\`, \`séance\`, and within \`présences\`: \`n\`, \`nom_prénom\`), if the information cannot be found or determined from the PDF, you MUST use an empty string \`""\` as its value for that field.
- For the \`nombre_des_présents\` field (a number), if it cannot be determined, you MUST use the number \`0\` as its value.
- For the \`présences\` array, if no attendees are found or the data is missing for all attendees, you MUST use an empty array \`[]\` as its value. If some attendees are found but some details are missing for an individual attendee, apply the empty string rule for their \`n\` or \`nom_prénom\` fields.
- DO NOT OMIT ANY KEYS specified in the schema. The goal is to always return a JSON object that strictly conforms to the defined structure, using these empty/default values for missing information.

PDF Document:
{{media url=pdfDataUri}}`,
});

const extractDataFromPdfFlow = ai.defineFlow(
  {
    name: 'extractDataFromPdfFlow',
    inputSchema: ExtractDataFromPdfInputSchema,
    outputSchema: ExtractDataFromPdfOutputSchema, // Flow still outputs the stringified version for the frontend
  },
  async (flowInput) => {
    console.log('Input to Genkit flow for PDF processing. PDF Data URI length:', flowInput.pdfDataUri.length);

    const defaultEmptyStructuredData = {
      classe: "",
      cours: "",
      date: "",
      nom_du_professeur: "",
      nombre_des_présents: 0,
      salle_n: "",
      séance: "",
      présences: [],
    };
    const defaultEmptyJsonOutputString = JSON.stringify(defaultEmptyStructuredData);

    try {
      const { output: structuredData } = await extractDataFromPdfPromptObj(flowInput);

      if (!structuredData) {
        console.error('AI model did not return structured data. Returning default empty structure.');
        return { jsonOutput: defaultEmptyJsonOutputString };
      }
      
      // structuredData should be an object matching ExtractedPdfDataSchema due to Genkit's schema enforcement.
      // Now, stringify this structured data for the jsonOutput field.
      const jsonOutputString = JSON.stringify(structuredData);
      console.log('Successfully extracted data from AI. Stringified output (snippet):', jsonOutputString.substring(0, 250) + (jsonOutputString.length > 250 ? "..." : ""));
      return { jsonOutput: jsonOutputString };

    } catch (error: any) {
      console.error('Error during AI model interaction or data processing in extractDataFromPdfFlow:', error.message, error.stack);
      // In case of any error during the prompt call or processing, return the default empty structure.
      return { jsonOutput: defaultEmptyJsonOutputString };
    }
  }
);
