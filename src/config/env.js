const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lideta-community",
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  syncAuthToken: process.env.SYNC_AUTH_TOKEN || "",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || "lideta-admin-secret",
  afroMessageToken: process.env.AFROMESSAGE_TOKEN || "",
  afroMessageIdentifierId: process.env.AFROMESSAGE_IDENTIFIER_ID || "",
  afroMessageSenderName: process.env.AFROMESSAGE_SENDER_NAME || "",
  afroMessageBaseUrl: process.env.AFROMESSAGE_BASE_URL || "https://api.afromessage.com/api",
};
