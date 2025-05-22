
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import mongoose, { type Model } from 'mongoose';
import type { ExtractedPdfData } from '@/ai/schemas/pdf-data-schema';
import { ExtractedPdfDataSchema } from '@/ai/schemas/pdf-data-schema';

const MONGO_DATABASE_NAME = 'pdf_data_db'; // Still relevant for organizational purposes if needed
const MONGO_COLLECTION_NAME = 'extracted_documents'; // This will be the Mongoose model name

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MongoDB URI not configured in environment variables.');
  // We cannot throw an error at the top level here as it prevents build
  // We'll check MONGODB_URI inside the POST handler
}

// Mongoose schema definition
const PresenceMongooseSchema = new mongoose.Schema({
  n: { type: String, default: "" },
  nom_prénom: { type: String, default: "" }
}, { _id: false }); // No separate _id for subdocuments unless needed

const ExtractedPdfDataMongooseSchema = new mongoose.Schema<ExtractedPdfData>({
  classe: { type: String, default: "" },
  cours: { type: String, default: "" },
  date: { type: String, default: "" },
  nom_du_professeur: { type: String, default: "" },
  nombre_des_présents: { type: Number, default: 0 },
  salle_n: { type: String, default: "" },
  séance: { type: String, default: "" },
  présences: [PresenceMongooseSchema]
}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

// Prevent model recompilation in Next.js dev environment
let ExtractedDocumentModel: Model<ExtractedPdfData>;
try {
  ExtractedDocumentModel = mongoose.model<ExtractedPdfData>(MONGO_COLLECTION_NAME);
} catch (e) {
  ExtractedDocumentModel = mongoose.model<ExtractedPdfData>(MONGO_COLLECTION_NAME, ExtractedPdfDataMongooseSchema);
}


// Mongoose connection helper
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the NodeJS.Global interface to declare the mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('MongoDB URI not configured. Please set MONGODB_URI in .env file.');
  }
  if (cached.conn) {
    console.log('Using cached Mongoose connection');
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable command buffering
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    };
    console.log('Creating new Mongoose connection');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('Mongoose connected successfully');
      return mongooseInstance;
    }).catch(err => {
        console.error('Mongoose connection error during initial connect:', err);
        cached.promise = null; // Reset promise on error
        throw err;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // Ensure promise is cleared on error so retries can happen
    throw err;
  }
  return cached.conn;
}

export async function POST(request: NextRequest) {
  if (!MONGODB_URI) {
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

  try {
    await dbConnect();
    console.log('Connected to MongoDB via Mongoose from API route');

    const newDocument = new ExtractedDocumentModel(dataToSave);
    const savedDocument = await newDocument.save();
    
    const insertedId = savedDocument._id.toString();

    console.log(`Data saved to MongoDB with ID: ${insertedId} using Mongoose from API route`);
    return NextResponse.json({
      success: true,
      message: 'Data successfully saved to MongoDB using Mongoose.',
      recordId: insertedId,
    });
  } catch (error: any) {
    console.error('Failed to save data to MongoDB using Mongoose from API route:', error);
    let errorMessage = `Failed to save data to MongoDB (Mongoose): ${error.message}`;
     if (error.name === 'MongoNetworkError' || error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout')) {
        errorMessage = `MongoDB Network Error (Mongoose): ${error.message}. Check IP Whitelisting, network connectivity, and if MongoDB server is running.`;
    } else if (error.name === 'MongooseServerSelectionError') {
         errorMessage = `MongoDB Server Selection Error (Mongoose): ${error.message}. Could not connect to any server in your MongoDB cluster. Verify connection string and server status.`;
    } else if (error.message && (error.message.includes('SSL') || error.message.includes('TLS'))) {
        errorMessage = `MongoDB SSL/TLS Error (Mongoose): ${error.message}. Ensure your environment supports the required TLS version/ciphers for Atlas.`;
    }
    return NextResponse.json({
      success: false,
      message: errorMessage,
    }, { status: 500 });
  }
  // Mongoose handles connection closing implicitly or keeps it open for reuse.
  // No explicit client.close() needed here like with the native driver in serverless contexts.
}
