import mongoose from 'mongoose';
import { memoryStore, MemoryStore } from '@/lib/db/memoryStore';
import { persistenceBridge } from './persistence';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/postpilot';

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isMemoryFallback: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: GlobalMongoose | undefined;
}

let cached: GlobalMongoose = global.mongooseCache || {
  conn: null,
  promise: null,
  isMemoryFallback: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<{ isMemoryFallback: boolean }> {
  if (cached.conn) {
    persistenceBridge.setConnected(true);
    return { isMemoryFallback: false };
  }

  if (cached.isMemoryFallback) {
    return { isMemoryFallback: true };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000, // Quick timeout to fall back to memoryStore smoothly
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log('[Database] Connected to MongoDB at', MONGODB_URI);
      persistenceBridge.setConnected(true);
      return m;
    }).catch((err) => {
      console.warn(`[Database] MongoDB connection skipped (${err.message}). Activating local resilient memory store.`);
      cached.isMemoryFallback = true;
      persistenceBridge.setConnected(false);
      return null as unknown as typeof mongoose;
    });
  }

  try {
    const conn = await cached.promise;
    if (conn) {
      cached.conn = conn;
      persistenceBridge.setConnected(true);
      return { isMemoryFallback: false };
    } else {
      cached.isMemoryFallback = true;
      persistenceBridge.setConnected(false);
      return { isMemoryFallback: true };
    }
  } catch {
    cached.isMemoryFallback = true;
    persistenceBridge.setConnected(false);
    return { isMemoryFallback: true };
  }
}

export { memoryStore, MemoryStore, persistenceBridge };
export * from '../models';

