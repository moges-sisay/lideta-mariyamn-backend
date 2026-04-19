const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const env = require("./env");

let memoryServer;
const DEFAULT_DB_NAME = "lideta-community";

function resolveDatabaseName(uri = "") {
  try {
    const databaseName = new URL(uri).pathname.replace(/^\//, "").trim();
    return databaseName || DEFAULT_DB_NAME;
  } catch (error) {
    return DEFAULT_DB_NAME;
  }
}

async function connectDatabase() {
  mongoose.set("strictQuery", true);

  if (env.mongoUri) {
    try {
      const dbName = resolveDatabaseName(env.mongoUri);

      await mongoose.connect(env.mongoUri, {
        dbName,
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`Connected to configured MongoDB instance (${dbName}).`);
      return;
    } catch (error) {
      const canFallbackToMemory =
        env.allowInMemoryDbFallback || !env.hasCustomMongoUri;

      if (!canFallbackToMemory) {
        console.error("Configured MongoDB connection failed.");
        throw error;
      }

      console.warn(
        "Configured MongoDB connection failed. Falling back to in-memory MongoDB for development."
      );
      console.warn(error.message);
    }
  }

  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: DEFAULT_DB_NAME,
    },
  });

  await mongoose.connect(memoryServer.getUri(), {
    dbName: DEFAULT_DB_NAME,
  });
  console.log(`Connected to in-memory MongoDB (${DEFAULT_DB_NAME}).`);
}

module.exports = {
  connectDatabase,
};
