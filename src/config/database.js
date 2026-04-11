const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const env = require("./env");

let memoryServer;

async function connectDatabase() {
  mongoose.set("strictQuery", true);

  if (env.mongoUri) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log("Connected to configured MongoDB instance.");
      return;
    } catch (error) {
      console.warn(
        "Configured MongoDB connection failed. Falling back to in-memory MongoDB for development."
      );
      console.warn(error.message);
    }
  }

  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: "lideta-community",
    },
  });

  await mongoose.connect(memoryServer.getUri(), {
    dbName: "lideta-community",
  });
  console.log("Connected to in-memory MongoDB.");
}

module.exports = {
  connectDatabase,
};
