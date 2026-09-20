function requiredInProduction(name) {
  if (process.env.NODE_ENV === "production" && !process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function validateEnv() {
  const required = [
    "MONGO_URI",
    "ACCESS_ID_SECRET",
    "LOCAL_ID_SECRET",
    "RESET_ID_SECRET",
    "OTP_ID_SECRET",
  ];

  if (process.env.NODE_ENV === "production") {
    required.forEach(requiredInProduction);
  }
}

function getAllowedOrigins() {
  const fromEnv = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  return [...new Set([...defaults, ...fromEnv])];
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function cookieSameSite() {
  const configured = (process.env.COOKIE_SAMESITE || "").toLowerCase();
  if (["strict", "lax", "none"].includes(configured)) return configured;
  return isProduction() ? "none" : "lax";
}

module.exports = {
  validateEnv,
  getAllowedOrigins,
  isProduction,
  cookieSameSite,
};
