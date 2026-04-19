const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const env = require("./env");

let memoryServer;
const DEFAULT_DB_NAME = "lideta-community";

function validateMongoUri(uri = "") {
  const trimmedUri = String(uri || "").trim();

  if (!trimmedUri) {
    return;
  }

  let parsedUri;

  try {
    parsedUri = new URL(trimmedUri);
  } catch (error) {
    throw new Error(
      "MONGODB_URI is not a valid connection string. Use the full MongoDB URI from Atlas, for example: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/lideta-community?retryWrites=true&w=majority"
    );
  }

  if (!["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol)) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv://."
    );
  }

  if (!parsedUri.hostname) {
    throw new Error(
      "MONGODB_URI is missing a hostname. Paste the full MongoDB connection string from Atlas."
    );
  }

  if (parsedUri.protocol === "mongodb+srv:" && !parsedUri.hostname.includes(".")) {
    throw new Error(
      `MONGODB_URI looks incomplete. The SRV host is "${parsedUri.hostname}", but Atlas hosts usually look like "<cluster>.mongodb.net". Paste the full Atlas connection string into Render.`
    );
  }
}

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
      validateMongoUri(env.mongoUri);
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
