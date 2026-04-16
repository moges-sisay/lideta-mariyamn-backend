const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const {
  getAdminSession,
  loginAdmin,
  signUpAdmin,
} = require("../controllers/adminController");
const {
  broadcastDebtors,
  bulkImportMembers,
  getAdminDashboardReport,
  sendCommitteeReminderBroadcast,
} = require("../controllers/memberController");

const router = express.Router();

router.post("/signup", asyncHandler(signUpAdmin));
router.post("/login", asyncHandler(loginAdmin));
router.get("/session", requireAdminAuth, asyncHandler(getAdminSession));
router.get("/dashboard-report", requireAdminAuth, asyncHandler(getAdminDashboardReport));
router.post("/members/bulk-import", requireAdminAuth, asyncHandler(bulkImportMembers));
router.post("/broadcast-debtors", requireAdminAuth, asyncHandler(broadcastDebtors));
router.post("/committee-reminders", requireAdminAuth, asyncHandler(sendCommitteeReminderBroadcast));

module.exports = router;
