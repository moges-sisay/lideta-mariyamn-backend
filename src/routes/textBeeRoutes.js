const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const {
  receiveTextBeeCreateCallback,
  receiveTextBeeStatusCallback,
} = require("../controllers/messageReportController");

const router = express.Router();

router.get("/callbacks/create", asyncHandler(receiveTextBeeCreateCallback));
router.post("/callbacks/create", asyncHandler(receiveTextBeeCreateCallback));
router.get("/callbacks/status", asyncHandler(receiveTextBeeStatusCallback));
router.post("/callbacks/status", asyncHandler(receiveTextBeeStatusCallback));

module.exports = router;
