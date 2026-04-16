const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const env = require("../config/env");

function buildAdminToken(admin) {
  return jwt.sign({ adminId: admin.id }, env.adminJwtSecret, {
    expiresIn: "7d",
  });
}

function serializeAdmin(admin) {
  return {
    _id: admin.id,
    email: admin.email,
    fullName: admin.fullName || "",
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

async function signUpAdmin(request, response) {
  const { email, password, fullName = "" } = request.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return response.status(400).json({
      message: "Email and password are required.",
    });
  }

  if (password.length < 6) {
    return response.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }

  const existingAdmin = await Admin.findOne({ email: normalizedEmail });

  if (existingAdmin) {
    return response.status(409).json({
      message: "An admin with this email already exists.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({
    email: normalizedEmail,
    passwordHash,
    fullName: String(fullName || "").trim(),
  });

  return response.status(201).json({
    message: "Admin account created successfully.",
    token: buildAdminToken(admin),
    admin: serializeAdmin(admin),
  });
}

async function loginAdmin(request, response) {
  const { email, password } = request.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return response.status(400).json({
      message: "Email and password are required.",
    });
  }

  const admin = await Admin.findOne({ email: normalizedEmail });

  if (!admin) {
    return response.status(401).json({
      message: "Invalid admin credentials.",
    });
  }

  const isMatch = await bcrypt.compare(password, admin.passwordHash);

  if (!isMatch) {
    return response.status(401).json({
      message: "Invalid admin credentials.",
    });
  }

  return response.json({
    message: "Admin login successful.",
    token: buildAdminToken(admin),
    admin: serializeAdmin(admin),
  });
}

async function getAdminSession(request, response) {
  return response.json({
    admin: serializeAdmin(request.admin),
  });
}

module.exports = {
  getAdminSession,
  loginAdmin,
  serializeAdmin,
  signUpAdmin,
};
