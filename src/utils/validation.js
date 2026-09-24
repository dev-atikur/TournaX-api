const mongoose = require("mongoose");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^(?!.*\.\.)(?!.*__)[a-zA-Z0-9._]{3,30}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

function isEmail(value) {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim().toLowerCase());
}

function isUsername(value) {
  return typeof value === "string" && USERNAME_REGEX.test(value);
}

function isPassword(value) {
  return typeof value === "string" && value.length >= 8 && PASSWORD_REGEX.test(value);
}

function isObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function isPhone(value) {
  return typeof value === "string" && PHONE_REGEX.test(value.trim());
}

function sanitizeString(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

module.exports = {
  EMAIL_REGEX,
  USERNAME_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  isEmail,
  isUsername,
  isPassword,
  isObjectId,
  isPhone,
  sanitizeString,
};
