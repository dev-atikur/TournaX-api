const SENSITIVE_KEYS = new Set([
  "password",
  "oldpassword",
  "newpassword",
  "otp",
  "token",
  "secret",
  "authorization",
  "cookie",
  "localid",
  "accessid",
  "resetid",
  "otpid",
  "hashedotp",
  "twofactorsecret",
]);

function redact(value) {
  if (!value || typeof value !== "object") return value;
  const output = Array.isArray(value) ? [] : {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = "[REDACTED]";
    } else if (nested && typeof nested === "object") {
      output[key] = redact(nested);
    } else {
      output[key] = nested;
    }
  }
  return output;
}

function logInfo(payload) {
  console.log(JSON.stringify({ level: "info", time: new Date().toISOString(), ...payload }));
}

function logError(payload) {
  const safe = { ...payload };
  if (safe.err instanceof Error) {
    safe.err = {
      name: safe.err.name,
      message: safe.err.message,
      ...(process.env.NODE_ENV !== "production" ? { stack: safe.err.stack } : {}),
    };
  }
  console.error(JSON.stringify({ level: "error", time: new Date().toISOString(), ...safe }));
}

module.exports = { logInfo, logError, redact };
