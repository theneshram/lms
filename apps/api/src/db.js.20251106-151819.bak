import mongoose from "mongoose";

function maskUri(uri) {
  // masks credentials between // and @
  return (uri || "").replace(/\/\/([^@]+)@/, "//***:***@");
}

export async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error("MONGO_URI is not set");

  console.log("ENV:", {
    PORT: process.env.PORT,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    MONGO_URI: maskUri(uri),
  });

  // Retry a few times in case DNS hiccups
  let attempts = 0;
  const max = 5;
  while (attempts < max) {
    try {
      await mongoose.connect(uri, {
        // Not required when db name is in the URI path (/lms), but harmless:
        dbName: undefined,
        serverSelectionTimeoutMS: 5000,
      });
      console.log("✅ MongoDB connected");
      return;
    } catch (err) {
      attempts++;
      console.error(`Mongo connect failed (${attempts}/${max}):`, err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Could not connect to MongoDB after multiple attempts");
}
