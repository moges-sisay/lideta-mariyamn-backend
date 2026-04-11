const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const verifySyncToken = require("../middleware/verifySyncToken");
const { syncMember } = require("../controllers/memberController");

const router = express.Router();

router.post("/sync-member", verifySyncToken, asyncHandler(syncMember));

module.exports = router;

