'use server';
/**
 * @fileOverview Extracts data from a PDF using OCR and AI.
 *
 * - extractDataFromPdf - A function that handles the data extraction process.
 * - ExtractDataFromPdfInput - The input type for the extractDataFromPdf function.
 * - ExtractDataFromPdfOutput - The return type for the extractDataFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractDataFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractDataFromPdfInput = z.infer<typeof ExtractDataFromPdfInputSchema>;

const ExtractDataFromPdfOutputSchema = z.object({
  extractedData: z.record(z.string(), z.any()).describe('The extracted data from the PDF, as a JSON object.'),
});
export type ExtractDataFromPdfOutput = z.infer<typeof ExtractDataFromPdfOutputSchema>;

export async function extractDataFromPdf(input: ExtractDataFromPdfInput): Promise<ExtractDataFromPdfOutput> {
  return extractDataFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractDataFromPdfPrompt',
  input: {schema: ExtractDataFromPdfInputSchema},
  output: {schema: ExtractDataFromPdfOutputSchema},
  prompt: `You are an expert data extraction specialist.

You will receive a PDF document and your task is to extract all the relevant information from it and return it as a JSON object. Use OCR to read the PDF content.

PDF Document: {{media url=pdfDataUri}}`,
});

const extractDataFromPdfFlow = ai.defineFlow(
  {
    name: 'extractDataFromPdfFlow',
    inputSchema: ExtractDataFromPdfInputSchema,
    outputSchema: ExtractDataFromPdfOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
