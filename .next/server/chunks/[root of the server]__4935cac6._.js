module.exports = {

"[project]/.next-internal/server/app/api/save-to-mongodb/route/actions.js [app-rsc] (server actions loader, ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
}}),
"[externals]/next/dist/compiled/next-server/app-route.runtime.dev.js [external] (next/dist/compiled/next-server/app-route.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/@opentelemetry/api [external] (@opentelemetry/api, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("@opentelemetry/api", () => require("@opentelemetry/api"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/next-server/app-page.runtime.dev.js [external] (next/dist/compiled/next-server/app-page.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/mongoose [external] (mongoose, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("mongoose", () => require("mongoose"));

module.exports = mod;
}}),
"[project]/src/ai/schemas/pdf-data-schema.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "ExtractedPdfDataSchema": (()=>ExtractedPdfDataSchema)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod/lib/index.mjs [app-route] (ecmascript)");
;
const ExtractedPdfDataSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].object({
    classe: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe('The class name. Return "" if not found.'),
    cours: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe('The course name. Return "" if not found.'),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe('The date of the session. Return "" if not found.'),
    nom_du_professeur: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe("The professor's name. Return \"\" if not found."),
    nombre_des_présents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].number().describe('The number of present students. Return 0 if not found.'),
    salle_n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe('The room number. Return "" if not found.'),
    séance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe('The session information. Return "" if not found.'),
    présences: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].object({
        n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe('The student number or ID. Return "" if not found.'),
        nom_prénom: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$lib$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["z"].string().describe("The student's full name. Return \"\" if not found.")
    })).describe('An array representing the attendees. Return [] if not found or if data is missing for all attendees.')
});
}}),
"[project]/src/app/api/save-to-mongodb/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "POST": (()=>POST)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$ai$2f$schemas$2f$pdf$2d$data$2d$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/ai/schemas/pdf-data-schema.ts [app-route] (ecmascript)");
;
;
;
const MONGO_DATABASE_NAME = 'pdf_data_db'; // Still relevant for organizational purposes if needed
const MONGO_COLLECTION_NAME = 'extracted_documents'; // This will be the Mongoose model name
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MongoDB URI not configured in environment variables.');
// We cannot throw an error at the top level here as it prevents build
// We'll check MONGODB_URI inside the POST handler
}
// Mongoose schema definition
const PresenceMongooseSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].Schema({
    n: {
        type: String,
        default: ""
    },
    nom_prénom: {
        type: String,
        default: ""
    }
}, {
    _id: false
}); // No separate _id for subdocuments unless needed
const ExtractedPdfDataMongooseSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].Schema({
    classe: {
        type: String,
        default: ""
    },
    cours: {
        type: String,
        default: ""
    },
    date: {
        type: String,
        default: ""
    },
    nom_du_professeur: {
        type: String,
        default: ""
    },
    nombre_des_présents: {
        type: Number,
        default: 0
    },
    salle_n: {
        type: String,
        default: ""
    },
    séance: {
        type: String,
        default: ""
    },
    présences: [
        PresenceMongooseSchema
    ]
}, {
    timestamps: true
}); // Add timestamps for createdAt and updatedAt
// Prevent model recompilation in Next.js dev environment
let ExtractedDocumentModel;
try {
    ExtractedDocumentModel = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].model(MONGO_COLLECTION_NAME);
} catch (e) {
    ExtractedDocumentModel = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].model(MONGO_COLLECTION_NAME, ExtractedPdfDataMongooseSchema);
}
let cached = global.mongooseCache;
if (!cached) {
    cached = global.mongooseCache = {
        conn: null,
        promise: null
    };
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
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000
        };
        console.log('Creating new Mongoose connection');
        cached.promise = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$29$__["default"].connect(MONGODB_URI, opts).then((mongooseInstance)=>{
            console.log('Mongoose connected successfully');
            return mongooseInstance;
        }).catch((err)=>{
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
async function POST(request) {
    if (!MONGODB_URI) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: 'MongoDB connection string is not configured. Please set MONGODB_URI in .env file.'
        }, {
            status: 500
        });
    }
    let dataToSave;
    try {
        const rawData = await request.json();
        const validationResult = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$ai$2f$schemas$2f$pdf$2d$data$2d$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ExtractedPdfDataSchema"].safeParse(rawData);
        if (!validationResult.success) {
            console.error('Invalid data format received:', validationResult.error.flatten());
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                message: `Invalid data format: ${validationResult.error.flatten().formErrors.join(', ')}`
            }, {
                status: 400
            });
        }
        dataToSave = validationResult.data;
    } catch (error) {
        console.error('Failed to parse request body:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: 'Failed to parse request body.'
        }, {
            status: 400
        });
    }
    try {
        await dbConnect();
        console.log('Connected to MongoDB via Mongoose from API route');
        const newDocument = new ExtractedDocumentModel(dataToSave);
        const savedDocument = await newDocument.save();
        const insertedId = savedDocument._id.toString();
        console.log(`Data saved to MongoDB with ID: ${insertedId} using Mongoose from API route`);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: 'Data successfully saved to MongoDB using Mongoose.',
            recordId: insertedId
        });
    } catch (error) {
        console.error('Failed to save data to MongoDB using Mongoose from API route:', error);
        let errorMessage = `Failed to save data to MongoDB (Mongoose): ${error.message}`;
        if (error.name === 'MongoNetworkError' || error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout')) {
            errorMessage = `MongoDB Network Error (Mongoose): ${error.message}. Check IP Whitelisting, network connectivity, and if MongoDB server is running.`;
        } else if (error.name === 'MongooseServerSelectionError') {
            errorMessage = `MongoDB Server Selection Error (Mongoose): ${error.message}. Could not connect to any server in your MongoDB cluster. Verify connection string and server status.`;
        } else if (error.message && (error.message.includes('SSL') || error.message.includes('TLS'))) {
            errorMessage = `MongoDB SSL/TLS Error (Mongoose): ${error.message}. Ensure your environment supports the required TLS version/ciphers for Atlas.`;
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: errorMessage
        }, {
            status: 500
        });
    }
// Mongoose handles connection closing implicitly or keeps it open for reuse.
// No explicit client.close() needed here like with the native driver in serverless contexts.
}
}}),

};

//# sourceMappingURL=%5Broot%20of%20the%20server%5D__4935cac6._.js.map