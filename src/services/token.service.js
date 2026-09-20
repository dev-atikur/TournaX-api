const jwt = require("jsonwebtoken");
const parseDurationToSeconds = require("../utils/parseDuration");
const { setCookie, clearCookie } = require("../utils/cookies");
const { cookieSameSite, isProduction } = require("../config/env");

function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token, secret, options = {}) {
  return jwt.verify(token, secret, options);
}

function cookieOptions(expiresEnv, fallbackSeconds) {
  return {
    httpOnly: true,
    secure: isProduction() || cookieSameSite() === "none",
    sameSite: cookieSameSite(),
    path: "/",
    maxAge: parseDurationToSeconds(expiresEnv, fallbackSeconds),
  };
}

function setAuthCookies(res, { localId, accessId }) {
  if (localId) {
    setCookie(res, "localId", localId, cookieOptions(process.env.LOCAL_ID_EXPIRES_IN, 34560 * 60));
  }
  if (accessId) {
    setCookie(res, "accessId", accessId, cookieOptions(process.env.ACCESS_ID_EXPIRES_IN, 15 * 60));
  }
}

function clearAuthCookies(res) {
  clearCookie(res, "accessId");
  clearCookie(res, "localId");
}

module.exports = {
  signToken,
  verifyToken,
  cookieOptions,
  setAuthCookies,
  clearAuthCookies,
};
