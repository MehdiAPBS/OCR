
'use server';
/**
 * @fileOverview Extracts data from a PDF using OCR (Tesseract.js) and AI (Genkit).
 *
 * - extractDataFromPdf - A function that handles the data extraction process.
 * - ExtractDataFromPdfInput - The input type for the extractDataFromPdf function.
 * - ExtractDataFromPdfOutput - The return type for the extractDataFromPdf function.
 */

import { ai } from '@/ai/genkit';
import {z} from 'genkit';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.js';
// pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js'); // May be needed depending on environment
import { createCanvas } from 'canvas';

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

// Schema for the Genkit prompt input (after OCR)
const PromptInputSchema = z.object({
  ocrText: z.string().describe('Text extracted from the PDF document using OCR.'),
});

// Helper class for pdfjs-dist in Node.js
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas: canvas,
      context: context,
    };
  }

  reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
    if (!canvasAndContext.canvas) {
      // Sanity check it is really supplied.
      throw new Error('Canvas is not specified');
    }
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: any; context: any }) {
    if (!canvasAndContext.canvas) {
      // Sanity check it is really supplied.
      throw new Error('Canvas is not specified');
    }
    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function pdfPageToImageDataUri(pdfData: Uint8Array, pageNum: number): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDocument = await loadingTask.promise;
  if (pageNum > pdfDocument.numPages) {
    console.warn(`Requested page ${pageNum} is out of bounds. PDF has ${pdfDocument.numPages} pages. Using last page.`);
    pageNum = pdfDocument.numPages;
  }
  if (pageNum === 0 && pdfDocument.numPages > 0) {
    pageNum = 1; // Default to first page if 0 and pages exist
  }
  if (pdfDocument.numPages === 0) {
    throw new Error("PDF document has no pages.");
  }

  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for potentially better OCR

  const canvasFactory = new NodeCanvasFactory();
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
  
  const renderContext = {
    canvasContext: canvasAndContext.context,
    viewport: viewport,
    canvasFactory: canvasFactory,
  };
  
  await page.render(renderContext).promise;
  const imageDataUrl = canvasAndContext.canvas.toDataURL('image/png');
  
  page.cleanup(); 
  canvasFactory.destroy(canvasAndContext);

  return imageDataUrl;
}


export async function extractDataFromPdf(input: ExtractDataFromPdfInput): Promise<ExtractDataFromPdfOutput> {
 const response = await extractDataFromPdfFlow(input);
 return response;
}

const extractDataFromPdfPromptObj = ai.definePrompt({
  name: 'extractDataFromPdfPrompt',
  input: { schema: PromptInputSchema }, 
  output: { schema: ExtractDataFromPdfOutputSchema },
  prompt: `You are an expert data extraction specialist.
You will receive text content extracted via OCR from a PDF document. Your task is to analyze this text and extract all the relevant information from it and return it as a JSON object.

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
If any individual field specified above (e.g., \`classe\`, \`cours\`, \`date\`, \`nom_du_professeur\`, \`salle_n\`, \`séance\`) cannot be found or determined from the OCR text, you MUST include the key in the JSON output but use an empty string \`""\` as its value.
For the \`nombre_des_présents\` field, if it cannot be determined, use the number \`0\`.
For the \`présences\` array, if no attendees are found or the data is missing, you MUST include the \`présences\` key with an empty array \`[]\` as its value. Within objects in the 'présences' array, if 'n' or 'nom_prénom' cannot be found, use an empty string \`""\` for their values.
DO NOT OMIT ANY KEYS specified in the structure. The goal is to always return a JSON string that strictly conforms to the defined structure, using empty/default values for missing information.

Format the entire JSON object (structured as described above) as a single string value for the 'jsonOutput' key. Only output the JSON object containing the 'jsonOutput' key. For example: {"jsonOutput": "{\\"classe\\": \\"...", \\"présences\\": [], ...}"}

Extracted OCR Text:
{{{ocrText}}}`,
});

const extractDataFromPdfFlow = ai.defineFlow(
  {
    name: 'extractDataFromPdfFlow',
    inputSchema: ExtractDataFromPdfInputSchema, // Flow still takes pdfDataUri
    outputSchema: ExtractDataFromPdfOutputSchema,
  }, 
  async (flowInput) => {
    let ocrText = '';
    try {
      console.log('Starting PDF to Text conversion...');
      const base64PdfData = flowInput.pdfDataUri.split(',')[1];
      if (!base64PdfData) {
        throw new Error('Invalid PDF data URI format. Missing base64 data.');
      }
      const pdfBuffer = Buffer.from(base64PdfData, 'base64');
      
      // For simplicity, processing only the first page.
      // A more robust solution might iterate through pages or allow page selection.
      const imageDataUri = await pdfPageToImageDataUri(new Uint8Array(pdfBuffer), 1);
      console.log('PDF page converted to image data URI.');

      console.log('Starting Tesseract OCR...');
      const { data: { text: tesseractOutputText } } = await Tesseract.recognize(
        imageDataUri,
        'fra', // Using French for OCR
        { 
          // logger: m => console.log(m) // Uncomment for detailed Tesseract progress
        }
      );
      ocrText = tesseractOutputText;
      console.log('Tesseract OCR completed. Extracted text length:', ocrText.length);
      if (!ocrText.trim()) {
        console.warn('Tesseract OCR returned empty or whitespace-only text.');
      }

    } catch (ocrError: any) {
      console.error('Error during Tesseract/pdfjs OCR processing:', ocrError.message, ocrError.stack);
      ocrText = ""; // Fallback to empty text if OCR fails
      // Optionally, could return { jsonOutput: '{}' } here directly if OCR is critical and fails
    }
    
    const promptInput = { ocrText };
    console.log('Input to Genkit prompt (AI model):', { ocrTextLength: promptInput.ocrText.length }); // Log length to avoid huge text in logs

    let response;
    try {
      response = await extractDataFromPdfPromptObj(promptInput); 
      console.log('Full response object from AI prompt:', response); 
    } catch (error: any) {
      console.error('Error during AI model interaction:', error.message, error.stack);
      return { jsonOutput: '{}' }; 
    }

    if (!response || typeof response !== 'object' || !('jsonOutput' in response)) {
      console.error('AI response is missing "jsonOutput", not an object, or null. Raw response:', response);
      return { jsonOutput: '{}' }; 
    }

    const jsonOutputValue = response.jsonOutput;
    if (typeof jsonOutputValue !== 'string') {
      console.error('The value of "jsonOutput" is not a string. Value:', jsonOutputValue);
      return { jsonOutput: '{}' };
    }

    try {
      JSON.parse(jsonOutputValue); // Validate the inner JSON string
      return response; // Return { jsonOutput: "stringified_json_data" }
    } catch (parseError: any) {
      console.error('Error parsing jsonOutput string as JSON:', parseError.message, 'String value was:', jsonOutputValue);
      return { jsonOutput: '{}' };
    }
  }
);
