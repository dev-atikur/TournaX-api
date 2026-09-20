require("dotenv").config();
const http = require("http");
const dns = require("dns");
const app = require("./src/app");
const connectDB = require("./src/db/db");
const { validateEnv } = require("./src/config/env");
const { logInfo, logError } = require("./src/utils/logger");

validateEnv();
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || "0.0.0.0";

async function start() {
  await connectDB();
  const server = http.createServer(app);
  server.listen(port, host, () => {
    logInfo({ message: "server_started", host, port });
  });
}

start().catch((error) => {
  logError({ message: "server_start_failed", err: error });
  process.exit(1);
});
