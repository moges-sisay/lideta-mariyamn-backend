const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const {
  createMember,
  getCommitteeGroups,
  getMemberByPhoneNumber,
  listMembers,
  sendSingleReminder,
  updatePaymentStatus,
} = require("../controllers/memberController");

const router = express.Router();

router.get("/members", asyncHandler(listMembers));
router.post("/members", asyncHandler(createMember));
router.get("/members/by-phone/:phoneNumber", asyncHandler(getMemberByPhoneNumber));
router.get("/members/committee-groups", asyncHandler(getCommitteeGroups));
router.patch("/members/:memberId/payments/:month", asyncHandler(updatePaymentStatus));
router.post("/members/:memberId/reminders/:month", asyncHandler(sendSingleReminder));

module.exports = router;


