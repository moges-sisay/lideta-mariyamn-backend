const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lideta-community",
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  syncAuthToken: process.env.SYNC_AUTH_TOKEN || "",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || "lideta-admin-secret",
  publicApiUrl: process.env.PUBLIC_API_URL || "",
  textBeeEndpoint:
    process.env.TEXTBEE_ENDPOINT ||
    "https://api.textbee.dev/api/v1/gateway/devices/69e1fd26b5cd3ce4c77b4522/send-sms",
  textBeeApiKey:
    process.env.TEXTBEE_API_KEY || "8a6f23a2-c72d-405c-b647-f2d49e8da034",
  textBeeTimeoutMs: Number(process.env.TEXTBEE_TIMEOUT_MS) || 15000,
};
