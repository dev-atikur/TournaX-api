const runMiddleware = require("../middlewares/middlewareRunner");
const {
  validateRegister,
  validateLogin,
  validateVerifyTwoFactor,
  validateOtpSession,
} = require("../validators/auth.validator");
const { protect } = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");
const userConstants = require("../constants/user.constants");
const { sendError } = require("../utils/response");
const { getPathname, matchRoute } = require("../utils/path");

const routes = async (req, res) => {
  const path = getPathname(req);

  if (path === "/api/auth/register" && req.method === "POST") {
    return runMiddleware([validateRegister], req, res, authController.register);
  }

  if (path === "/api/auth/login" && req.method === "POST") {
    return runMiddleware([validateLogin], req, res, authController.login);
  }

  if (path === "/api/auth/logout" && (req.method === "POST" || req.method === "PATCH")) {
    return runMiddleware([protect], req, res, authController.logout);
  }

  const logoutSession = matchRoute(path, "/api/auth/logout/:sessionId");
  if (logoutSession && req.method === "PATCH") {
    req.params = logoutSession;
    return runMiddleware([protect], req, res, authController.logout);
  }

  if (path === "/api/auth/logout-all" && req.method === "PATCH") {
    return runMiddleware([protect], req, res, authController.logoutAllDevices);
  }

  if (path === "/api/auth/me" && req.method === "GET") {
    return runMiddleware([protect], req, res, authController.getMe);
  }

  if (path === "/api/auth/refresh" && req.method === "POST") {
    return authController.refreshAccessId(req, res);
  }

  if (path === "/api/auth/change-password" && req.method === "PATCH") {
    return runMiddleware([protect], req, res, authController.changePassword);
  }

  if (path === "/api/auth/forgot-password" && req.method === "POST") {
    return authController.forgotPassword(req, res);
  }

  if (path === "/api/auth/reset-password" && req.method === "POST") {
    return authController.resetPassword(req, res);
  }

  if (path === "/api/auth/verify-email" && req.method === "POST") {
    return runMiddleware([validateVerifyTwoFactor], req, res, authController.verifyTwoFactor);
  }

  if (path === "/api/auth/resend-verification" && req.method === "POST") {
    return authController.resendVerification(req, res);
  }

  if (path === "/api/auth/2fa/setup" && (req.method === "POST" || req.method === "PATCH")) {
    req.params = { method: req.body.method };
    if (!Object.values(userConstants.TWO_FACTOR_METHOD).includes(req.params.method)) {
      return sendError(res, "auth/invalid-2fa-method");
    }
    return runMiddleware([protect], req, res, authController.setupTwoFactor);
  }

  const setup = matchRoute(path, "/api/auth/2fa/setup/:method");
  if (setup && req.method === "PATCH") {
    if (!Object.values(userConstants.TWO_FACTOR_METHOD).includes(setup.method)) {
      return sendError(res, "auth/invalid-2fa-method");
    }
    req.params = setup;
    return runMiddleware([protect], req, res, authController.setupTwoFactor);
  }

  if (path === "/api/auth/2fa/verify" && req.method === "POST") {
    return runMiddleware([validateVerifyTwoFactor], req, res, authController.verifyTwoFactor);
  }

  if (path === "/api/auth/2fa/resend" && req.method === "POST") {
    return runMiddleware([validateOtpSession], req, res, authController.resendTwoFactorCode);
  }

  if (path === "/api/auth/2fa/switch-method" && req.method === "POST") {
    return runMiddleware([validateOtpSession], req, res, authController.switchTwoFactorMethod);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;
