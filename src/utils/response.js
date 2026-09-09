const errorCodes = require("./errorCodes");

function sendError(res, code) {
  const error = errorCodes[code] || errorCodes["common/server-error"];
  const responseCode = errorCodes[code] ? code : "common/server-error";

  res.writeHead(error.status, { "Content-Type": "application/json" });
  return res.end(
    JSON.stringify({
      success: false,
      code: responseCode,
      message: error.message,
    }),
  );
}

function sendSuccess(res, statusCode, message, data = null) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ success: true, message, data }));
}

module.exports = { sendSuccess, sendError };
