const { DEFAULT_SCORING } = require("../constants/tournament.constants");

function getPlacementPoints(scoringRules = {}, placement) {
  const source = scoringRules.placementPoints || DEFAULT_SCORING.placementPoints;
  const table = source instanceof Map ? Object.fromEntries(source) : source;
  const value = table[placement] ?? table[String(placement)];
  return Number(value || 0);
}

function calculateMatchPoints({ placement, kills = 0, bonusPoints = 0 }, scoringRules = {}) {
  const killPointValue = Number(
    scoringRules.killPoints ?? DEFAULT_SCORING.killPoints,
  );
  const defaultBonus = Number(scoringRules.bonusPoints ?? DEFAULT_SCORING.bonusPoints);
  const placementPoints = getPlacementPoints(scoringRules, placement);
  const killPoints = Number(kills || 0) * killPointValue;
  const bonus = Number(bonusPoints || 0) + defaultBonus;
  const totalPoints = placementPoints + killPoints + bonus;

  return {
    placementPoints,
    killPoints,
    bonusPoints: bonus,
    totalPoints,
  };
}

module.exports = { calculateMatchPoints, getPlacementPoints };
