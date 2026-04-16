const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const {
  createMember,
  getCommitteeGroups,
  getMemberByPhoneNumber,
  getPublicMemberDirectory,
  listMembers,
  sendSingleReminder,
  updatePaymentStatus,
} = require("../controllers/memberController");

const router = express.Router();

router.get("/members", requireAdminAuth, asyncHandler(listMembers));
router.post("/members", requireAdminAuth, asyncHandler(createMember));
router.get("/members/by-phone/:phoneNumber", asyncHandler(getMemberByPhoneNumber));
router.get("/members/public-directory", asyncHandler(getPublicMemberDirectory));
router.get("/members/committee-groups", asyncHandler(getCommitteeGroups));
router.patch("/members/:memberId/payments/:month", requireAdminAuth, asyncHandler(updatePaymentStatus));
router.post("/members/:memberId/reminders/:month", requireAdminAuth, asyncHandler(sendSingleReminder));

module.exports = router;
