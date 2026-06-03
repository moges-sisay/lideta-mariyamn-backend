const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const {
  createAdminByAdmin,
  changePassword,
  getAdminBootstrapStatus,
  getAdminSession,
  loginAdmin,
  requestPasswordReset,
  resetPassword,
  signUpAdmin,
  updateAdminProfile,
} = require("../controllers/adminController");
const {
  broadcastDebtors,
  bulkImportMembers,
  getAdminDashboardReport,
  sendCommitteeReminderBroadcast,
} = require("../controllers/memberController");
const {
  getSmsGatewayDiagnostics,
  listMessageReports,
} = require("../controllers/messageReportController");

const router = express.Router();

router.get("/bootstrap-status", asyncHandler(getAdminBootstrapStatus));
router.post("/signup", asyncHandler(signUpAdmin));
router.post("/login", asyncHandler(loginAdmin));
router.post("/password-reset/request", asyncHandler(requestPasswordReset));
router.post("/password-reset/confirm", asyncHandler(resetPassword));
router.get("/session", requireAdminAuth, asyncHandler(getAdminSession));
router.patch("/profile", requireAdminAuth, asyncHandler(updateAdminProfile));
router.patch("/password", requireAdminAuth, asyncHandler(changePassword));
router.post("/admins", requireAdminAuth, asyncHandler(createAdminByAdmin));
router.get("/dashboard-report", requireAdminAuth, asyncHandler(getAdminDashboardReport));
router.post("/members/bulk-import", requireAdminAuth, asyncHandler(bulkImportMembers));
router.post("/broadcast-debtors", requireAdminAuth, asyncHandler(broadcastDebtors));
router.post("/committee-reminders", requireAdminAuth, asyncHandler(sendCommitteeReminderBroadcast));
router.get("/message-reports", requireAdminAuth, asyncHandler(listMessageReports));
router.get("/gateway-diagnostics", requireAdminAuth, asyncHandler(getSmsGatewayDiagnostics));

module.exports = router;
