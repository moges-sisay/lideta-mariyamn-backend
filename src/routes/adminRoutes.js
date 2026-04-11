const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { broadcastDebtors } = require("../controllers/memberController");

const router = express.Router();

router.post("/broadcast-debtors", asyncHandler(broadcastDebtors));

module.exports = router;

