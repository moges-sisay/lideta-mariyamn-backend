const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const env = require("../config/env");

async function requireAdminAuth(request, response, next) {
  const authHeader = request.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({
      message: "Admin authentication is required.",
    });
  }

  try {
    const payload = jwt.verify(token, env.adminJwtSecret);
    const admin = await Admin.findById(payload.adminId);

    if (!admin) {
      return response.status(401).json({
        message: "Admin account not found.",
      });
    }

    request.admin = admin;
    return next();
  } catch (error) {
    return response.status(401).json({
      message: "Admin session is invalid or expired.",
    });
  }
}

module.exports = requireAdminAuth;
