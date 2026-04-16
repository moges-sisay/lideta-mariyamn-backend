const mongoose = require("mongoose");
const {
  buildDefaultPayments,
  getCurrentEthiopianYear,
} = require("../constants/ethiopianCalendar");

const paymentSchema = new mongoose.Schema(
  {
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const memberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "",
      trim: true,
    },
    committee: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    committeeLeader: {
      type: String,
      default: "",
      trim: true,
    },
    registeredByAdmin: {
      type: String,
      default: "",
      trim: true,
    },
    ethiopianYear: {
      type: Number,
      default: () => getCurrentEthiopianYear(),
    },
    payments: {
      type: Map,
      of: paymentSchema,
      default: () => buildDefaultPayments(),
    },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      flattenMaps: true,
    },
    toObject: {
      flattenMaps: true,
    },
  }
);

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
