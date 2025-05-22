
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { ExtractedPdfData } from '@/ai/schemas/pdf-data-schema';
import { ExtractedPdfDataSchema } from '@/ai/schemas/pdf-data-schema';

const MONGO_DATABASE_NAME = 'pdf_data_db';
const MONGO_COLLECTION_NAME = 'extracted_documents';

export async function POST(request: NextRequest) {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('MongoDB URI not configured in environment variables.');
    return NextResponse.json({
      success: false,
      message: 'MongoDB connection string is not configured. Please set MONGODB_URI in .env file.',
    }, { status: 500 });
  }

  let dataToSave: ExtractedPdfData;
  try {
    const rawData = await request.json();
    const validationResult = ExtractedPdfDataSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('Invalid data format received:', validationResult.error.flatten());
      return NextResponse.json({
        success: false,
        message: `Invalid data format: ${validationResult.error.flatten().formErrors.join(', ')}`,
      }, { status: 400 });
    }
    dataToSave = validationResult.data;
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ success: false, message: 'Failed to parse request body.' }, { status: 400 });
  }

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    tls: true,
  });

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB from API route');
    const db = client.db(MONGO_DATABASE_NAME);
    const collection = db.collection(MONGO_COLLECTION_NAME);

    const result = await collection.insertOne(dataToSave);
    const insertedId = result.insertedId;

    console.log(`Data saved to MongoDB with ID: ${insertedId.toString()} from API route`);
    return NextResponse.json({
      success: true,
      message: 'Data successfully saved to MongoDB.',
      recordId: insertedId.toString(),
    });
  } catch (error: any) {
    console.error('Failed to save data to MongoDB from API route:', error);
    // Attempt to provide a more specific error message if available
    let errorMessage = `Failed to save data to MongoDB: ${error.message}`;
    if (error.name === 'MongoNetworkError') {
        errorMessage = `MongoDB Network Error: ${error.message}. Check IP Whitelisting and network connectivity.`;
    } else if (error.message && error.message.includes('SSL')) {
        errorMessage = `MongoDB SSL/TLS Error: ${error.message}. Ensure your environment supports the required TLS version/ciphers for Atlas.`;
    }
    return NextResponse.json({
      success: false,
      message: errorMessage,
    }, { status: 500 });
  } finally {
    await client.close();
    console.log('MongoDB connection closed in API route.');
  }
}
