const mongoose = require('mongoose');

const connectDB = async () => {
  // Fail fast with a readable message instead of a driver-level "uri undefined"
  // stack trace buried in the deploy logs.
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI environment variable is not set. Refusing to start.');
    process.exit(1);
  }

  try {
    console.log(`🔍 MONGODB_URI is: SET`);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Don't hang the boot for the driver's 30s default when the DB is
      // unreachable — surface the error, exit, let Coolify restart us.
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;