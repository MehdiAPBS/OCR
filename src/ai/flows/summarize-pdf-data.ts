// Summarize the extracted data and provide a concise overview.
'use server';
/**
 * @fileOverview Summarizes extracted data from a PDF.
 *
 * - summarizePdfData - A function that summarizes PDF data.
 * - SummarizePdfDataInput - The input type for the summarizePdfData function.
 * - SummarizePdfDataOutput - The return type for the summarizePdfData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePdfDataInputSchema = z.object({
  extractedData: z.string().describe('The extracted data from the PDF.'),
});
export type SummarizePdfDataInput = z.infer<typeof SummarizePdfDataInputSchema>;

const SummarizePdfDataOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the extracted data.'),
});
export type SummarizePdfDataOutput = z.infer<typeof SummarizePdfDataOutputSchema>;

export async function summarizePdfData(input: SummarizePdfDataInput): Promise<SummarizePdfDataOutput> {
  return summarizePdfDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePdfDataPrompt',
  input: {schema: SummarizePdfDataInputSchema},
  output: {schema: SummarizePdfDataOutputSchema},
  prompt: `Summarize the following data extracted from a PDF. Provide a concise overview of the key information.\n\nData: {{{extractedData}}}`,
});

const summarizePdfDataFlow = ai.defineFlow(
  {
    name: 'summarizePdfDataFlow',
    inputSchema: SummarizePdfDataInputSchema,
    outputSchema: SummarizePdfDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
