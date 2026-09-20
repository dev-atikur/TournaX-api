const errorCodes = require("./errorCodes");

function sendError(res, code, errors = []) {
  if (res.writableEnded) return;
  const error = errorCodes[code] || errorCodes["common/server-error"];
  const responseCode = errorCodes[code] ? code : "common/server-error";

  res.writeHead(error.status, { "Content-Type": "application/json" });
  return res.end(
    JSON.stringify({
      success: false,
      message: error.message,
      code: responseCode,
      errors,
    }),
  );
}

function sendSuccess(res, statusCode, message, data = null) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ success: true, message, data }));
}

module.exports = { sendSuccess, sendError };
