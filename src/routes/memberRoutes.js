const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const {
  createMember,
  getCommitteeGroups,
  listFeedback,
  listPaymentReferences,
  getMemberByPhoneNumber,
  getPublicMemberDirectory,
  listMembers,
  reviewPaymentReference,
  sendSingleReminder,
  submitFeedback,
  submitPaymentReference,
  updatePaymentStatus,
} = require("../controllers/memberController");

const router = express.Router();

router.get("/members", requireAdminAuth, asyncHandler(listMembers));
router.post("/members", requireAdminAuth, asyncHandler(createMember));
router.get("/members/by-phone/:phoneNumber", asyncHandler(getMemberByPhoneNumber));
router.get("/members/public-directory", asyncHandler(getPublicMemberDirectory));
router.get("/members/committee-groups", asyncHandler(getCommitteeGroups));
router.post("/members/feedback", asyncHandler(submitFeedback));
router.post("/members/:memberId/payments/:month/reference", asyncHandler(submitPaymentReference));
router.patch("/members/:memberId/payments/:month", requireAdminAuth, asyncHandler(updatePaymentStatus));
router.get("/admin/payment-references", requireAdminAuth, asyncHandler(listPaymentReferences));
router.patch("/admin/members/:memberId/payments/:month/reference", requireAdminAuth, asyncHandler(reviewPaymentReference));
router.post("/members/:memberId/reminders/:month", requireAdminAuth, asyncHandler(sendSingleReminder));
router.get("/admin/feedback", requireAdminAuth, asyncHandler(listFeedback));

module.exports = router;
