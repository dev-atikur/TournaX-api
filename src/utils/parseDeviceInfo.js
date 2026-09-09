const { UAParser } = require("ua-parser-js");

function parseDeviceInfo(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type || "desktop"; // mobile/tablet না হলে desktop ধরে নিন

  const deviceName = result.device.model
    ? `${result.device.vendor || ""} ${result.device.model}`.trim()
    : `${result.browser.name || "Unknown"} on ${result.os.name || "Unknown OS"}`;

  return {
    deviceName,
    deviceType,
    os: result.os.name || "Unknown",
    browser: result.browser.name || "Unknown",
  };
}

module.exports = parseDeviceInfo;
