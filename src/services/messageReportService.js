const env = require("../config/env");
const MessageReport = require("../models/MessageReport");
const { normalizePhoneNumberForStorage } = require("../utils/phoneNumber");

function normalizeProviderStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "queued";
  }

  if (
    normalized.includes("deliver") ||
    normalized.includes("success") ||
    normalized.includes("sent")
  ) {
    return "delivered";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("reject") ||
    normalized.includes("undeliver")
  ) {
    return "undelivered";
  }

  return "queued";
}

function buildGatewayRecipientMetadata(result = {}) {
  const statusByPhoneNumber = new Map();
  const errorByPhoneNumber = new Map();
  const batches = Array.isArray(result?.response?.batches) ? result.response.batches : [];
  const errors = Array.isArray(result?.response?.errors) ? result.response.errors : [];

  batches.forEach((batch) => {
    const recipients = Array.isArray(batch?.recipients) ? batch.recipients : [];
    recipients.forEach((phoneNumber) => {
      const normalizedPhoneNumber = normalizePhoneNumberForStorage(phoneNumber);

      if (normalizedPhoneNumber && !statusByPhoneNumber.has(normalizedPhoneNumber)) {
        statusByPhoneNumber.set(normalizedPhoneNumber, "queued");
      }
    });
  });

  errors.forEach((entry) => {
    const normalizedPhoneNumber = normalizePhoneNumberForStorage(entry?.to || entry?.phoneNumber || "");

    if (!normalizedPhoneNumber) {
      return;
    }

    statusByPhoneNumber.set(normalizedPhoneNumber, "undelivered");
    errorByPhoneNumber.set(
      normalizedPhoneNumber,
      String(entry?.error || entry?.message || "Gateway send failed.").trim()
    );
  });

  return {
    statusByPhoneNumber,
    errorByPhoneNumber,
  };
}

function buildReportRecipients(members = [], defaultStatus = "queued", errorMessage = "", result = {}) {
  const { statusByPhoneNumber, errorByPhoneNumber } = buildGatewayRecipientMetadata(result);

  return members.map((member) => {
    const normalizedPhoneNumber = normalizePhoneNumberForStorage(member.phoneNumber || "");
    const recipientStatus = statusByPhoneNumber.get(normalizedPhoneNumber) || defaultStatus;
    const recipientError = errorByPhoneNumber.get(normalizedPhoneNumber) || errorMessage;

    return {
      memberId: String(member._id || ""),
      fullName: String(member.fullName || "").trim(),
      phoneNumber: normalizedPhoneNumber,
      committee: String(member.committee || "").trim(),
      committeeLeader: String(member.committeeLeader || "").trim(),
      status: recipientStatus,
      providerStatus: recipientStatus,
      errorMessage: recipientError ? String(recipientError) : "",
      deliveredAt: null,
      updatedAt: new Date(),
    };
  });
}

function extractProviderMessage(result = {}) {
  return String(
    result?.response?.message ||
      result?.response?.detail ||
      result?.response?.error ||
      result?.message ||
      result?.acknowledge ||
      result?.error ||
      ""
  ).trim();
}

function extractCampaignId(result = {}) {
  return String(
    result?.response?.campaign_id ||
      result?.response?.campaignId ||
      result?.response?.requestId ||
      result?.response?.id ||
      result?.campaign_id ||
      result?.campaignId ||
      result?.requestId ||
      result?.id ||
      ""
  ).trim();
}

function serializeMessageReport(report) {
  const payload = report.toObject();

  payload.recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
  payload.callbackEventCount = Array.isArray(payload.callbackEvents)
    ? payload.callbackEvents.length
    : 0;
  delete payload.callbackEvents;

  return payload;
}

async function createMessageReport({
  messageType,
  requestStatus,
  month = "",
  committee = "",
  campaignName = "",
  messageTemplate = "",
  initiatedByAdmin = "",
  members = [],
  result = {},
  errorMessage = "",
}) {
  const providerMessage = extractProviderMessage(result);
  const campaignId = extractCampaignId(result);
  const recipientStatus = requestStatus === "failed" ? "undelivered" : "queued";
  const report = await MessageReport.create({
    messageType,
    requestStatus,
    month: String(month || "").trim(),
    committee: String(committee || "").trim(),
    campaignName: String(campaignName || "").trim(),
    campaignId,
    messageTemplate: String(messageTemplate || "").trim(),
    initiatedByAdmin: String(initiatedByAdmin || "").trim(),
    providerMessage,
    providerPayload: result || {},
    errorMessage: String(errorMessage || "").trim(),
    recipients: buildReportRecipients(members, recipientStatus, errorMessage, result),
  });

  return report;
}

function isPrivateHost(host = "") {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function buildSmsGatewayDiagnostics() {
  const endpoint = String(env.textBeeEndpoint || "").trim();
  const callbackBaseUrl = String(env.publicApiUrl || "").trim().replace(/\/+$/, "");
  const warnings = [];

  if (!env.textBeeApiKey) {
    warnings.push("TEXTBEE_API_KEY is missing.");
  }

  if (!endpoint) {
    warnings.push("TEXTBEE_ENDPOINT is missing.");
  }

  if (endpoint) {
    try {
      const { protocol } = new URL(endpoint);

      if (protocol !== "https:") {
        warnings.push("TEXTBEE_ENDPOINT should use HTTPS.");
      }
    } catch {
      warnings.push("TEXTBEE_ENDPOINT is not a valid URL.");
    }
  }

  if (callbackBaseUrl) {
    try {
      const { hostname, protocol } = new URL(callbackBaseUrl);

      if (protocol !== "https:") {
        warnings.push("PUBLIC_API_URL should use HTTPS if you later add delivery callbacks.");
      }

      if (isPrivateHost(hostname)) {
        warnings.push(
          "PUBLIC_API_URL points to a private/local address, so external delivery callbacks would not reach it."
        );
      }
    } catch {
      warnings.push("PUBLIC_API_URL is not a valid URL.");
    }
  }

  return {
    providerName: "TextBee Android Gateway",
    keyConfigured: Boolean(env.textBeeApiKey),
    endpointConfigured: Boolean(endpoint),
    endpoint,
    callbackBaseUrl,
    callbackEnabled: false,
    warnings,
  };
}

function extractCallbackCampaignId(payload = {}) {
  return String(
    payload.campaign_id ||
      payload.campaignId ||
      payload.campaign ||
      payload.id ||
      ""
  ).trim();
}

function extractCallbackPhoneNumber(payload = {}) {
  return normalizePhoneNumberForStorage(
    payload.to || payload.phone || payload.phoneNumber || payload.msisdn || ""
  );
}

function extractCallbackStatus(payload = {}) {
  return String(
    payload.status ||
      payload.delivery_status ||
      payload.deliveryStatus ||
      payload.message_status ||
      payload.messageStatus ||
      payload.state ||
      ""
  ).trim();
}

async function appendCallbackEvent(eventType, payload = {}) {
  const campaignId = extractCallbackCampaignId(payload);
  const phoneNumber = extractCallbackPhoneNumber(payload);
  const providerStatus = extractCallbackStatus(payload);

  const query = campaignId
    ? { campaignId }
    : phoneNumber
      ? { "recipients.phoneNumber": phoneNumber }
      : null;

  if (!query) {
    return null;
  }

  const report = await MessageReport.findOne(query).sort({ createdAt: -1 });

  if (!report) {
    return null;
  }

  report.callbackEvents.push({
    eventType,
    campaignId,
    phoneNumber,
    payload,
    receivedAt: new Date(),
  });

  if (phoneNumber) {
    const recipient = report.recipients.find((item) => item.phoneNumber === phoneNumber);

    if (recipient) {
      const normalizedStatus = normalizeProviderStatus(providerStatus);
      recipient.status = normalizedStatus;
      recipient.providerStatus = providerStatus || normalizedStatus;
      recipient.updatedAt = new Date();
      if (normalizedStatus === "delivered") {
        recipient.deliveredAt = new Date();
      }
    }
  }

  report.requestStatus =
    report.recipients.some((recipient) => recipient.status === "delivered")
      ? "accepted"
      : report.requestStatus;

  await report.save();

  return report;
}

module.exports = {
  appendCallbackEvent,
  buildSmsGatewayDiagnostics,
  createMessageReport,
  extractCampaignId,
  extractProviderMessage,
  serializeMessageReport,
};
