
'use server';
/**
 * @fileOverview Saves extracted PDF data to MongoDB.
 *
 * - saveToMongoDb - A function that handles saving data to MongoDB.
 * - SaveToMongoDbInput - The input type for the saveToMongoDb function (ExtractedPdfData).
 * - SaveToMongoDbOutput - The return type for the saveToMongoDb function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ExtractedPdfDataSchema, type ExtractedPdfData } from '@/ai/schemas/pdf-data-schema';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

const MONGO_DATABASE_NAME = 'pdf_data_db';
const MONGO_COLLECTION_NAME = 'extracted_documents';

// Input schema for the flow is the extracted data itself
export type SaveToMongoDbInput = ExtractedPdfData;

const SaveToMongoDbOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  recordId: z.string().optional().describe('The ID of the saved MongoDB document.'),
});
export type SaveToMongoDbOutput = z.infer<typeof SaveToMongoDbOutputSchema>;

export async function saveToMongoDb(input: SaveToMongoDbInput): Promise<SaveToMongoDbOutput> {
  return saveToMongoDbFlow(input);
}

const saveToMongoDbFlow = ai.defineFlow(
  {
    name: 'saveToMongoDbFlow',
    inputSchema: ExtractedPdfDataSchema, // Use the existing schema for input
    outputSchema: SaveToMongoDbOutputSchema,
  },
  async (dataToSave) => {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      console.error('MongoDB URI not configured in environment variables.');
      return {
        success: false,
        message: 'MongoDB connection string is not configured. Please set MONGODB_URI in .env file.',
      };
    }

    const client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      tls: true, // Explicitly enabling TLS, though srv protocol usually implies it
    });

    try {
      await client.connect();
      console.log('Connected successfully to MongoDB');
      const db = client.db(MONGO_DATABASE_NAME);
      const collection = db.collection(MONGO_COLLECTION_NAME);

      const result = await collection.insertOne(dataToSave);
      const insertedId = result.insertedId;

      console.log(`Data saved to MongoDB with ID: ${insertedId.toString()}`);
      return {
        success: true,
        message: 'Data successfully saved to MongoDB.',
        recordId: insertedId.toString(),
      };
    } catch (error: any) {
      console.error('Failed to save data to MongoDB:', error);
      return {
        success: false,
        message: `Failed to save data to MongoDB: ${error.message}`,
      };
    } finally {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
);
