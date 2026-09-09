const { sendError } = require("../utils/response");
const jwt = require("jsonwebtoken");

const protect = async (req, res, next) => {
  const accessId = req.cookies.accessId;
  if (!accessId) return sendError(res, "auth/unauthorized");

  try {
    const decoded = jwt.verify(accessId, process.env.ACCESS_ID_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return sendError(res, "auth/unauthorized");
  }
};


module.exports = { protect };