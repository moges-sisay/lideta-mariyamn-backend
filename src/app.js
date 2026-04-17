const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const adminRoutes = require("./routes/adminRoutes");
const memberRoutes = require("./routes/memberRoutes");
const syncRoutes = require("./routes/syncRoutes");
const textBeeRoutes = require("./routes/textBeeRoutes");

const app = express();

app.use(
  cors({
    origin: env.clientOrigin === "*" ? true : env.clientOrigin,
  })
);
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (request, response) => {
  response.json({
    message: "Lideta backend is healthy.",
  });
});

app.use("/api", syncRoutes);
app.use("/api", memberRoutes);
app.use("/api/textbee", textBeeRoutes);
app.use("/api/admin", adminRoutes);

app.use((request, response) => {
  response.status(404).json({
    message: "Route not found.",
  });
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  const statusCode = error.name === "ValidationError" ? 400 : 500;

  return response.status(statusCode).json({
    message: error.message || "Unexpected server error.",
  });
});

module.exports = app;
