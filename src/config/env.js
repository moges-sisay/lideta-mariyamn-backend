const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const nodeEnv = process.env.NODE_ENV || "development";

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lideta-community",
  hasCustomMongoUri: Boolean(process.env.MONGODB_URI),
  allowInMemoryDbFallback:
    process.env.ALLOW_IN_MEMORY_DB_FALLBACK === "true" ||
    (process.env.ALLOW_IN_MEMORY_DB_FALLBACK !== "false" && nodeEnv !== "production"),
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  syncAuthToken: process.env.SYNC_AUTH_TOKEN || "",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || "lideta-admin-secret",
  exposeAdminResetCode:
    process.env.EXPOSE_ADMIN_RESET_CODE === "true" ||
    (process.env.EXPOSE_ADMIN_RESET_CODE !== "false" && process.env.NODE_ENV !== "production"),
  publicApiUrl: process.env.PUBLIC_API_URL || "",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpSecure:
    process.env.SMTP_SECURE === "true" ||
    (process.env.SMTP_SECURE !== "false" && Number(process.env.SMTP_PORT || 465) === 465),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: String(process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  passwordResetFromEmail: process.env.PASSWORD_RESET_FROM_EMAIL || process.env.SMTP_USER || "",
  textBeeEndpoint:
    process.env.TEXTBEE_ENDPOINT ||
    "https://api.textbee.dev/api/v1/gateway/devices/69e1fd26b5cd3ce4c77b4522/send-sms",
  textBeeApiKey:
    process.env.TEXTBEE_API_KEY || "8a6f23a2-c72d-405c-b647-f2d49e8da034",
  textBeeTimeoutMs: Number(process.env.TEXTBEE_TIMEOUT_MS) || 15000,
};
