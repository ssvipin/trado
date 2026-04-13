import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI;

declare global {
    var mongooseCache :{
        conn: typeof mongoose | null,
        promise: Promise<typeof mongoose> | null
    }
}

let cache = global.mongooseCache;
if (!cache) {
    cache = global.mongooseCache = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
    console.log(MONGODB_URI);
    if(!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }
    console.log(cache.conn);
    if (cache.conn) {
        return cache.conn;
    }

    if (!cache.promise) {
        cache.promise = mongoose.connect(MONGODB_URI, {bufferCommands: false}).then((mongoose) => {
            console.log('Connected to MongoDB', mongoose);
            return mongoose;
        });
    }
    try {
        cache.conn = await cache.promise;
    } catch (error) {
        cache.promise = null;
        throw error;
    }
    return cache.conn;
}