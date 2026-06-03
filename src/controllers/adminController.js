const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const env = require("../config/env");
const { sendAdminPasswordResetCode } = require("../services/emailService");

const RESET_CODE_TTL_MINUTES = 15;

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

function createResetCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function buildResetResponse() {
  return {
    message:
      "If this admin email exists, a one-time reset code has been sent to the admin email. The code expires in 15 minutes.",
  };
}

async function signUpAdmin(request, response) {
  const { email, password, fullName = "" } = request.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const adminCount = await Admin.countDocuments();

  if (!normalizedEmail || !password) {
    return response.status(400).json({
      message: "Email and password are required.",
    });
  }

  if (adminCount > 0) {
    return response.status(403).json({
      message: "Public admin signup is closed. An existing admin must create new admin accounts.",
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

async function requestPasswordReset(request, response) {
  const normalizedEmail = String(request.body.email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return response.status(400).json({
      message: "Email is required.",
    });
  }

  const admin = await Admin.findOne({ email: normalizedEmail });

  if (!admin) {
    return response.json(buildResetResponse());
  }

  const resetCode = createResetCode();
  admin.passwordResetTokenHash = await bcrypt.hash(resetCode, 10);
  admin.passwordResetRequestedAt = new Date();
  admin.passwordResetExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
  await admin.save();

  try {
    await sendAdminPasswordResetCode({
      to: admin.email,
      resetCode,
      expiresInMinutes: RESET_CODE_TTL_MINUTES,
    });
  } catch (error) {
    admin.passwordResetTokenHash = "";
    admin.passwordResetExpiresAt = null;
    admin.passwordResetRequestedAt = null;
    await admin.save();

    console.error(`Failed to email admin password reset code to ${admin.email}:`, error.message);

    return response.status(502).json({
      message: "Reset email could not be sent right now. Please check the email configuration and try again.",
    });
  }

  console.info(`Admin password reset code emailed to ${admin.email}.`);

  return response.json(buildResetResponse());
}

async function resetPassword(request, response) {
  const normalizedEmail = String(request.body.email || "").trim().toLowerCase();
  const resetCode = String(request.body.resetCode || "").trim();
  const password = String(request.body.password || "");

  if (!normalizedEmail || !resetCode || !password) {
    return response.status(400).json({
      message: "Email, reset code, and new password are required.",
    });
  }

  if (password.length < 6) {
    return response.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }

  const admin = await Admin.findOne({ email: normalizedEmail });

  if (
    !admin ||
    !admin.passwordResetTokenHash ||
    !admin.passwordResetExpiresAt ||
    admin.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    return response.status(400).json({
      message: "Reset code is invalid or expired.",
    });
  }

  const isMatch = await bcrypt.compare(resetCode, admin.passwordResetTokenHash);

  if (!isMatch) {
    return response.status(400).json({
      message: "Reset code is invalid or expired.",
    });
  }

  admin.passwordHash = await bcrypt.hash(password, 10);
  admin.passwordResetTokenHash = "";
  admin.passwordResetExpiresAt = null;
  admin.passwordResetRequestedAt = null;
  admin.passwordChangedAt = new Date();
  await admin.save();

  return response.json({
    message: "Password reset successfully.",
    token: buildAdminToken(admin),
    admin: serializeAdmin(admin),
  });
}

async function changePassword(request, response) {
  const currentPassword = String(request.body.currentPassword || "");
  const nextPassword = String(request.body.nextPassword || "");

  if (!currentPassword || !nextPassword) {
    return response.status(400).json({
      message: "Current password and new password are required.",
    });
  }

  if (nextPassword.length < 6) {
    return response.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }

  const isMatch = await bcrypt.compare(currentPassword, request.admin.passwordHash);

  if (!isMatch) {
    return response.status(401).json({
      message: "Current password is incorrect.",
    });
  }

  request.admin.passwordHash = await bcrypt.hash(nextPassword, 10);
  request.admin.passwordResetTokenHash = "";
  request.admin.passwordResetExpiresAt = null;
  request.admin.passwordResetRequestedAt = null;
  request.admin.passwordChangedAt = new Date();
  await request.admin.save();

  return response.json({
    message: "Password changed successfully.",
    admin: serializeAdmin(request.admin),
  });
}

async function updateAdminProfile(request, response) {
  const fullName = String(request.body.fullName || "").trim();

  request.admin.fullName = fullName;
  await request.admin.save();

  return response.json({
    message: "Admin profile updated successfully.",
    admin: serializeAdmin(request.admin),
  });
}

async function getAdminSession(request, response) {
  return response.json({
    admin: serializeAdmin(request.admin),
  });
}

async function getAdminBootstrapStatus(request, response) {
  const adminCount = await Admin.countDocuments();

  return response.json({
    hasAdmins: adminCount > 0,
  });
}

async function createAdminByAdmin(request, response) {
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
    admin: serializeAdmin(admin),
  });
}

module.exports = {
  changePassword,
  createAdminByAdmin,
  getAdminBootstrapStatus,
  getAdminSession,
  loginAdmin,
  requestPasswordReset,
  resetPassword,
  serializeAdmin,
  signUpAdmin,
  updateAdminProfile,
};
