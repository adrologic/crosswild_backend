const mongoose = require('mongoose');

const connectDB = async () => {
  // Fail fast with a readable message instead of a driver-level "uri undefined"
  // stack trace buried in the deploy logs.
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI environment variable is not set. Refusing to start.');
    process.exit(1);
  }

  // MONGODB_DB wins over whatever database the URI names, and supplies one when
  // the URI has none. Coolify hands out connection strings ending in ":27017/?"
  // — no database — and a URI without one silently lands you in `test`, where
  // every query returns empty and nothing looks broken. This lets the database
  // be set with a plain value that has no ? & or / to survive a paste.
  const dbName = process.env.MONGODB_DB;

  try {
    console.log(`🔍 MONGODB_URI is: SET`);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Don't hang the boot for the driver's 30s default when the DB is
      // unreachable — surface the error, exit, let Coolify restart us.
      serverSelectionTimeoutMS: 10000,
      ...(dbName ? { dbName } : {}),
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    // 'test' is the driver's fallback when no database was specified anywhere.
    // Say so loudly — the symptom is empty API responses with a healthy app.
    if (conn.connection.name === 'test' && !dbName) {
      console.warn('⚠️  Connected to the default "test" database — the URI names no database.');
      console.warn('⚠️  Set MONGODB_DB (e.g. thecrosswild) or add the name to MONGODB_URI.');
    }
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;