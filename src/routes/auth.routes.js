const runMiddleware = require("../middlewares/middlewareRunner");
const { validateRegister, validateLogin, validateVerifyTwoFactor, validateOtpSession} = require("../validators/auth.validator");
const { protect } = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");
const userConstants = require("../constants/user.constants");
const { sendError } = require("../utils/response");

const routes = async (req, res) => {
  const path = req.url.split("?")[0];

  //🔹 Basic Auth
  if (path === "/api/auth/register" && req.method === "POST") {
    return await runMiddleware([validateRegister], req, res, authController.register);
  }

  if (path === "/api/auth/login" && req.method === "POST") {
    return await runMiddleware([validateLogin], req, res, authController.login);
  }

  if (path.startsWith("/api/auth/logout/") && req.method === "PATCH") {
    const sessionId = path.split("/").filter(Boolean)[3];
    
    req.params = { sessionId };
    return await runMiddleware([protect], req, res, authController.logout);
  }

  if (path === "/api/auth/logout-all" && req.method === "PATCH") {
    return await runMiddleware([protect], req, res, authController.logoutAllDevices);
  }

  if (path === "/api/auth/refresh" && req.method === "POST") {
    return await authController.refreshAccessId(req, res);
  }

  //🔹 Password
  if (path === "/api/auth/change-password" && req.method === "PATCH") {
    return await runMiddleware([protect], req, res, authController.changePassword);
  }
  if (path === "/api/auth/forgot-password" && req.method === "POST") {
    return await authController.forgotPassword(req, res);
  }

  if (path === "/api/auth/reset-password" && req.method === "POST") {
    return await authController.resetPassword(req, res);
  }

  //🔹 2FA 
  if (path.startsWith("/api/auth/2fa/setup/") && req.method === "PATCH") {
    const method = path.split("/").filter(Boolean)[4];

    if (!Object.values(userConstants.TWO_FACTOR_METHODS).includes(method)) {
      return sendError(res, "auth/invalid-2fa-method");
    }

    req.params = { method };
    return await runMiddleware([protect], req, res, authController.setupTwoFactor);
  }

  if (path === "/api/auth/2fa/verify" && req.method === "POST") {
    return await runMiddleware([validateVerifyTwoFactor], req, res, authController.verifyTwoFactor);
  }

  if (path === "/api/auth/2fa/resend" && req.method === "POST") {
    return await runMiddleware([validateOtpSession], req, res, authController.resendTwoFactorCode);
  }

  if (path === "/api/auth/2fa/switch-method" && req.method === "POST") {
    return await runMiddleware([validateOtpSession], req, res, authController.switchTwoFactorMethod);
  }

  sendError(res, "common/not-implemented");
};

module.exports = routes;