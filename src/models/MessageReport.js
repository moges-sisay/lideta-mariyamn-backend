const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      default: "",
      trim: true,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },
    committee: {
      type: String,
      default: "",
      trim: true,
    },
    committeeLeader: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "queued",
      trim: true,
    },
    providerStatus: {
      type: String,
      default: "",
      trim: true,
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const callbackEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      default: "",
      trim: true,
    },
    campaignId: {
      type: String,
      default: "",
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const messageReportSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
      default: "broadcast",
      trim: true,
    },
    requestStatus: {
      type: String,
      default: "queued",
      trim: true,
    },
    month: {
      type: String,
      default: "",
      trim: true,
    },
    committee: {
      type: String,
      default: "",
      trim: true,
    },
    campaignName: {
      type: String,
      default: "",
      trim: true,
    },
    campaignId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    messageTemplate: {
      type: String,
      default: "",
      trim: true,
    },
    initiatedByAdmin: {
      type: String,
      default: "",
      trim: true,
    },
    providerMessage: {
      type: String,
      default: "",
      trim: true,
    },
    providerPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
    recipients: {
      type: [recipientSchema],
      default: [],
    },
    callbackEvents: {
      type: [callbackEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

const MessageReport = mongoose.model("MessageReport", messageReportSchema);

module.exports = MessageReport;
