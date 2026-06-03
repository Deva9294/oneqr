import mongoose from 'mongoose';

export const connectDB = async () => {
  const atlasUri = process.env.MONGO_URI;
  const localUri = process.env.MONGO_URI_LOCAL;

  // Try Atlas first
  if (atlasUri) {
    try {
      const dbName = 'oneqr';
      let connectionUri = atlasUri.includes('/?') ? atlasUri.replace('/?', `/${dbName}?`) : atlasUri;
      if (!connectionUri.includes('retryWrites')) {
        connectionUri += connectionUri.includes('?') ? '&retryWrites=true&w=majority' : '?retryWrites=true&w=majority';
      }

      console.log('Trying MongoDB Atlas...');
      const conn = await mongoose.connect(connectionUri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.warn(`Atlas connection failed: ${err.message}`);
    }
  }

  // Fallback to local MongoDB
  if (localUri) {
    try {
      console.log('Falling back to local MongoDB...');
      const conn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB Local Connected: ${conn.connection.host}`);
      console.log('NOTE: Using local MongoDB. Install MongoDB locally or whitelist your IP in Atlas for cloud DB.');
      return;
    } catch (err) {
      console.error(`Local MongoDB also failed: ${err.message}`);
    }
  }

  const errMsg = `Could not connect to MongoDB Atlas or local MongoDB.\n\nTo fix:\n1. Whitelist IP 157.34.31.177 in MongoDB Atlas -> Network Access -> IP Whitelist -> Add IP Address -> 157.34.31.177\n2. Or install MongoDB locally and set MONGO_URI_LOCAL in .env`;
  console.error('\n=== DATABASE CONNECTION FAILED ===');
  console.error(errMsg);
  console.error('==================================\n');
  throw new Error(errMsg);
};
