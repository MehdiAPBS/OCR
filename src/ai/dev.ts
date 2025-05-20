import { config } from 'dotenv';
config();

import '@/ai/flows/extract-data-from-pdf.ts';
import '@/ai/flows/summarize-pdf-data.ts';