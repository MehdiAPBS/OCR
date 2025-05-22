
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-data-from-pdf.ts';
import '@/ai/flows/summarize-pdf-data.ts';
// import '@/ai/flows/save-to-mongodb.ts'; // This flow is no longer used for MongoDB saving, using API route instead
import '@/ai/flows/save-to-google-sheet.ts';
