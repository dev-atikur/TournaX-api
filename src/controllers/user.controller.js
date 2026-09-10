const userModel = require("../models/user.model");
const { cleanObject } = require("../utils/cleanData");
const { sendError, sendSuccess } = require("../utils/response");


//🔹 get current user data User function
async function getCurrentUserData(req, res) {
  try {
   const user = await userModel.findById(req.user.id);
   console.log(user);
   
   sendSuccess(res, 201, "User data fetch successfully.", cleanObject(user));
  } catch (error) {
    console.log(error);
    return sendError(res, "common/server-error");
  }
}


module.exports = { getCurrentUserData };