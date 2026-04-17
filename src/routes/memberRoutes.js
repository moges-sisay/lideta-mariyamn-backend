const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const {
  createMember,
  getCommitteeGroups,
  listFeedback,
  getMemberByPhoneNumber,
  getPublicMemberDirectory,
  listMembers,
  sendSingleReminder,
  submitFeedback,
  updatePaymentStatus,
} = require("../controllers/memberController");

const router = express.Router();

router.get("/members", requireAdminAuth, asyncHandler(listMembers));
router.post("/members", requireAdminAuth, asyncHandler(createMember));
router.get("/members/by-phone/:phoneNumber", asyncHandler(getMemberByPhoneNumber));
router.get("/members/public-directory", asyncHandler(getPublicMemberDirectory));
router.get("/members/committee-groups", asyncHandler(getCommitteeGroups));
router.post("/members/feedback", asyncHandler(submitFeedback));
router.patch("/members/:memberId/payments/:month", requireAdminAuth, asyncHandler(updatePaymentStatus));
router.post("/members/:memberId/reminders/:month", requireAdminAuth, asyncHandler(sendSingleReminder));
router.get("/admin/feedback", requireAdminAuth, asyncHandler(listFeedback));

module.exports = router;
