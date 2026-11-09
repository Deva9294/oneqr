import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
  if (!uri) {
    throw new Error('MongoDB is not configured. Set MONGO_URI in the backend environment.');
  }

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};
