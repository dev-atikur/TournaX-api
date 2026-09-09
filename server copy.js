require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const dns = require("dns");
const connectDB = require("./src/db/db");
const port = process.env.PORT || 5000;

const server = http.createServer(app);
dns.setServers(["8.8.8.8", "8.8.4.4"]);
connectDB();


server.listen(port, () => console.log(`Server running at http://localhost:${port}`));