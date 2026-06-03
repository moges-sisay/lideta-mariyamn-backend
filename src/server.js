const app = require("./app");
const { connectDatabase } = require("./config/database");
const env = require("./config/env");

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(env.port, () => {
      console.log(`Lideta backend listening on port ${env.port}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${env.port} is already in use. Stop the existing backend process or set PORT to another value.`
        );
      } else {
        console.error("Failed to start HTTP server:", error);
      }

      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
