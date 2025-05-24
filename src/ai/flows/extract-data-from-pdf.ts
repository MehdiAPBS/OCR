
'use server';
/**
 * @fileOverview Extracts data from a PDF using AI (Genkit), with an option for Google Cloud Vision OCR.
 *
 * - extractDataFromPdf - A function that handles the data extraction process.
 * - ExtractDataFromPdfInput - The input type for the extractDataFromPdf function.
 * - ExtractDataFromPdfOutput - The return type for the extractDataFromPdf function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { ExtractedPdfData } from '@/ai/schemas/pdf-data-schema'; 
import { ExtractedPdfDataSchema } from '@/ai/schemas/pdf-data-schema'; 

// Schema for the overall flow input
const ExtractDataFromPdfInputSchema = z.object({
  pdfDataUri: z.string().describe(
    "The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  extractionEngine: z.enum(['genkitDirect', 'googleCloudVision'])
    .default('genkitDirect')
    .describe('The engine to use for PDF data extraction.'),
});
export type ExtractDataFromPdfInput = z.infer<typeof ExtractDataFromPdfInputSchema>;

// Schema for the flow's final output to the frontend
const ExtractDataFromPdfOutputSchema = z.object({
  jsonOutput: z.string().describe('The extracted data from the PDF, as a JSON string.'),
  error: z.string().optional().describe('An error message if extraction failed.'),
});
export type ExtractDataFromPdfOutput = z.infer<typeof ExtractDataFromPdfOutputSchema>;

export async function extractDataFromPdf(input: ExtractDataFromPdfInput): Promise<ExtractDataFromPdfOutput> {
  return extractDataFromPdfFlow(input);
}

// Prompt for direct PDF processing by Genkit AI
const genkitDirectPdfProcessPrompt = ai.definePrompt({
  name: 'genkitDirectPdfProcessPrompt',
  input: { schema: z.object({ pdfDataUri: ExtractDataFromPdfInputSchema.shape.pdfDataUri }) },
  output: { schema: ExtractedPdfDataSchema },
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

// Prompt for structuring text extracted by an external OCR (like Google Cloud Vision)
const structureOcrTextPrompt = ai.definePrompt({
  name: 'structureOcrTextPrompt',
  input: { schema: z.object({ ocrText: z.string().describe("Text extracted from a document by an OCR engine.") }) },
  output: { schema: ExtractedPdfDataSchema },
  prompt: `You are an expert data extraction specialist.
You will receive text that has been extracted from a document using an OCR engine. Your task is to analyze this text and extract all the relevant information from it.
Return the extracted data as a JSON object strictly conforming to the provided schema.

CRITICAL INSTRUCTION FOR HANDLING MISSING DATA:
- For all string fields (e.g., \`classe\`, \`cours\`, \`date\`, \`nom_du_professeur\`, \`salle_n\`, \`séance\`, and within \`présences\`: \`n\`, \`nom_prénom\`), if the information cannot be found or determined from the text, you MUST use an empty string \`""\` as its value for that field.
- For the \`nombre_des_présents\` field (a number), if it cannot be determined, you MUST use the number \`0\` as its value.
- For the \`présences\` array, if no attendees are found or the data is missing for all attendees, you MUST use an empty array \`[]\` as its value. If some attendees are found but some details are missing for an individual attendee, apply the empty string rule for their \`n\` or \`nom_prénom\` fields.
- DO NOT OMIT ANY KEYS specified in the schema. The goal is to always return a JSON object that strictly conforms to the defined structure, using these empty/default values for missing information.

OCR'd Text:
{{{ocrText}}}`,
});


const extractDataFromPdfFlow = ai.defineFlow(
  {
    name: 'extractDataFromPdfFlow',
    inputSchema: ExtractDataFromPdfInputSchema,
    outputSchema: ExtractDataFromPdfOutputSchema, 
  },
  async (flowInput) => {
    console.log(`Starting PDF data extraction with engine: ${flowInput.extractionEngine}`);

    const defaultEmptyStructuredData: ExtractedPdfData = {
      classe: "", cours: "", date: "", nom_du_professeur: "",
      nombre_des_présents: 0, salle_n: "", séance: "", présences: [],
    };
    const defaultEmptyJsonOutputString = JSON.stringify(defaultEmptyStructuredData);

    try {
      let structuredData: ExtractedPdfData | null = null;

      if (flowInput.extractionEngine === 'googleCloudVision') {
        console.log('Using Google Cloud Vision OCR engine.');
        const serviceAccountCredsJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON;
        if (!serviceAccountCredsJsonString) {
          return { jsonOutput: defaultEmptyJsonOutputString, error: 'Google Service Account credentials are not configured for Vision API.' };
        }

        let visionCredentials;
        try {
          visionCredentials = JSON.parse(serviceAccountCredsJsonString);
           if (visionCredentials && visionCredentials.private_key) {
             visionCredentials.private_key = visionCredentials.private_key.replace(/\\n/g, '\n');
           }
        } catch (e: any) {
          console.error('Failed to parse Google Service Account credentials for Vision API:', e.message);
          return { jsonOutput: defaultEmptyJsonOutputString, error: `Invalid Google Service Account credentials format for Vision API: ${e.message}` };
        }
        
        const visionClient = new ImageAnnotatorClient({ credentials: visionCredentials });
        
        const base64PdfData = flowInput.pdfDataUri.substring(flowInput.pdfDataUri.indexOf(',') + 1);
        
        const request = {
          requests: [
            {
              inputConfig: {
                content: base64PdfData,
                mimeType: 'application/pdf',
              },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            },
          ],
        };

        console.log('Sending PDF to Google Cloud Vision API for OCR...');
        const [visionResult] = await visionClient.batchAnnotateFiles(request as any); // Cast to any to match SDK
        const responses = visionResult.responses?.[0]?.responses;

        if (!responses || responses.length === 0 || !responses[0].fullTextAnnotation) {
          console.error('Google Cloud Vision API did not return text annotation.');
          return { jsonOutput: defaultEmptyJsonOutputString, error: 'Google Cloud Vision OCR did not return text. The PDF might be image-only or unreadable by OCR.' };
        }
        
        const ocrText = responses[0].fullTextAnnotation.text || "";
        console.log('OCR Text from Vision API (first 500 chars):', ocrText.substring(0, 500));

        if (!ocrText.trim()) {
            console.warn('Vision API returned empty text from OCR.');
            return { jsonOutput: defaultEmptyJsonOutputString, error: 'Google Cloud Vision OCR returned empty text.' };
        }

        const { output: visionStructuredData } = await structureOcrTextPrompt({ ocrText });
        structuredData = visionStructuredData;

      } else { // Default to 'genkitDirect'
        console.log('Using Genkit Direct AI engine.');
        const { output: genkitStructuredData } = await genkitDirectPdfProcessPrompt({ pdfDataUri: flowInput.pdfDataUri });
        structuredData = genkitStructuredData;
      }

      if (!structuredData) {
        const errorMessage = "AI model did not return structured data after processing.";
        console.error(errorMessage, 'Input to prompt:', flowInput);
        return { jsonOutput: defaultEmptyJsonOutputString, error: errorMessage };
      }
      
      const jsonOutputString = JSON.stringify(structuredData);
      console.log('Successfully extracted data. Stringified output (snippet):', jsonOutputString.substring(0, 250) + (jsonOutputString.length > 250 ? "..." : ""));
      return { jsonOutput: jsonOutputString };

    } catch (error: any) {
      let errorMessage = `AI processing error: ${error.message}`;
      if (error.response?.data?.error?.message) { // For Google API specific errors
        errorMessage += ` Google API Error: ${error.response.data.error.message}`;
      }
      console.error('Error during data extraction flow:', error.message, error.stack, 'Input:', flowInput);
      return { jsonOutput: defaultEmptyJsonOutputString, error: errorMessage };
    }
  }
);
