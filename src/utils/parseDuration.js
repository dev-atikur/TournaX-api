function parseDurationToSeconds(value, fallbackSeconds) {
  if (value == null || value === "") return fallbackSeconds;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value).trim();
  const match = raw.match(/^(\d+)\s*([smhd])?$/i);
  if (!match) {
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed * 60 : fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "m").toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] || 60);
}

module.exports = parseDurationToSeconds;
