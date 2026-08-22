import mongoose from "mongoose";

/**
 * Lazy, promise-cached MongoDB connection. Survives warm serverless containers
 * and resets cleanly if a connect attempt fails (so a transient error doesn't
 * poison the module-level cache).
 */
let cached: Promise<typeof mongoose> | null = null;

export function ensureDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI is not set"));
  }

  if (!cached) {
    cached = mongoose
      .connect(uri, {
        // Isolate this project into its own database (not the cluster default).
        dbName: process.env.MONGODB_DB_NAME ?? "effectnode-spatial-harness",
        serverSelectionTimeoutMS: 5000,
        // Fail fast on writes when disconnected instead of buffering forever.
        bufferCommands: false,
      })
      .catch((err) => {
        cached = null;
        throw err;
      });
  }

  return cached;
}

/** True when `id` is a well-formed MongoDB ObjectId. */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** True when the error is a MongoDB E11000 duplicate-key violation. */
export function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}
