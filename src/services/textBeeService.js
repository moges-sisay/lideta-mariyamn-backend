const env = require("../config/env");
const { normalizePhoneNumberForStorage } = require("../utils/phoneNumber");

const DEFAULT_PAYMENT_REMINDER_TEMPLATE =
  "áˆ°áˆ‹áˆ {{name}}á£ á‹¨áˆá‹°á‰³ áˆ›áˆ­á‹«áˆ áŒˆá‹³áˆ á‹¨{{month}} á‹ˆáˆ­ áˆ˜á‹‹áŒ®á‹ŽáŠ• áˆµáˆ‹áˆáŠ¨áˆáˆ‰ áŠ¥á‰£áŠ­á‹Ž á‰ CBE Birr á‹­áŠ­áˆáˆ‰á¢ áŠ áˆ˜áˆ°áŒáŠ“áˆˆáŠ•á¢";

function normalizeMessageBody(message = "") {
  return String(message).replace(/\r\n/g, "\n").trim();
}

function buildMessageContext(member = {}, month = "") {
  return {
    name: member.fullName || "áŠ á‰£áˆ",
    fullName: member.fullName || "áŠ á‰£áˆ",
    month: String(month || "").trim(),
    committee: member.committee || "",
    phoneNumber: member.phoneNumber || "",
    committeeLeader: member.committeeLeader || "",
  };
}

function renderMessageTemplate(template = "", context = {}) {
  const source = normalizeMessageBody(template) || DEFAULT_PAYMENT_REMINDER_TEMPLATE;

  return source.replace(
    /\{\{\s*(name|fullName|month|committee|phoneNumber|committeeLeader)\s*\}\}/gi,
    (_, key) => String(context[key] ?? "")
  );
}

function buildReminderMessage(member, month, customTemplate = "") {
  return renderMessageTemplate(customTemplate, buildMessageContext(member, month));
}

function formatCampaignName(campaign = "", fallbackPrefix = "Lideta") {
  const trimmed = String(campaign || "").trim();

  if (trimmed) {
    return trimmed;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${fallbackPrefix}-${timestamp}`;
}

function getTextBeeConfig() {
  const endpoint = String(env.textBeeEndpoint || "").trim();
  const apiKey = String(env.textBeeApiKey || "").trim();

  if (!endpoint || !apiKey) {
    throw new Error(
      "TextBee gateway is not configured. Set TEXTBEE_ENDPOINT and TEXTBEE_API_KEY."
    );
  }

  return { endpoint, apiKey };
}

function buildGatewayRecipients(phoneNumbers = []) {
  return Array.from(
    new Set(
      phoneNumbers
        .map((phoneNumber) => normalizePhoneNumberForStorage(phoneNumber))
        .filter(Boolean)
    )
  );
}

async function parseGatewayResponse(response) {
  const rawBody = await response.text();
  let parsedBody = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = null;
    }
  }

  return {
    rawBody,
    parsedBody,
  };
}

function buildGatewayErrorMessage(statusCode, parsedBody, rawBody) {
  const message =
    parsedBody?.message ||
    parsedBody?.error ||
    parsedBody?.detail ||
    rawBody ||
    `TextBee gateway request failed with status ${statusCode}.`;

  return String(message).trim();
}

async function postToTextBeeGateway(body) {
  const { endpoint, apiKey } = getTextBeeConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.textBeeTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const { parsedBody, rawBody } = await parseGatewayResponse(response);

    if (!response.ok) {
      const errorMessage = buildGatewayErrorMessage(response.status, parsedBody, rawBody);
      console.error("TextBee gateway returned an error response.", {
        endpoint,
        status: response.status,
        requestBody: body,
        response: parsedBody || rawBody,
      });
      throw new Error(errorMessage);
    }

    return {
      provider: "TextBee",
      endpoint,
      statusCode: response.status,
      response: parsedBody || null,
      rawResponse: rawBody,
    };
  } catch (error) {
    const message =
      error?.name === "AbortError"
        ? `TextBee gateway request timed out after ${env.textBeeTimeoutMs}ms.`
        : String(error?.message || error || "TextBee gateway request failed.");

    console.error("TextBee gateway request failed.", {
      endpoint,
      requestBody: body,
      error: message,
    });
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}

async function sendSmsMessage({ to, message }) {
  const recipients = buildGatewayRecipients([to]);
  const normalizedMessage = normalizeMessageBody(message);

  if (recipients.length === 0 || !normalizedMessage) {
    throw new Error("Both recipient phone number and message are required.");
  }

  return postToTextBeeGateway({
    recipients,
    message: normalizedMessage,
  });
}

function buildBatchedPersonalizedMessages(recipients = [], messageTemplate = "") {
  const groups = new Map();

  recipients.forEach((recipient) => {
    const phoneNumber = normalizePhoneNumberForStorage(recipient.phoneNumber);
    const message = buildReminderMessage(recipient, recipient.month, messageTemplate);

    if (!phoneNumber || !message) {
      return;
    }

    const currentGroup = groups.get(message) || [];
    currentGroup.push(phoneNumber);
    groups.set(message, currentGroup);
  });

  return Array.from(groups.entries()).map(([message, recipientList]) => ({
    message,
    recipients: buildGatewayRecipients(recipientList),
  }));
}

async function sendBulkPersonalizedSms({ recipients, messageTemplate = "", campaign = "" }) {
  const batches = buildBatchedPersonalizedMessages(recipients, messageTemplate);

  if (batches.length === 0) {
    throw new Error("At least one recipient with a valid phone number is required.");
  }

  const batchResults = [];
  const errors = [];

  for (const batch of batches) {
    try {
      const result = await postToTextBeeGateway({
        recipients: batch.recipients,
        message: batch.message,
      });

      batchResults.push({
        recipients: batch.recipients,
        message: batch.message,
        ...result,
      });
    } catch (error) {
      const errorMessage = String(error?.message || error || "TextBee batch send failed.");
      errors.push(
        ...batch.recipients.map((recipient) => ({
          to: recipient,
          message: batch.message,
          error: errorMessage,
        }))
      );
    }
  }

  const acceptedRecipients = batchResults.reduce(
    (total, batch) => total + batch.recipients.length,
    0
  );
  const failedRecipients = errors.length;

  if (acceptedRecipients === 0) {
    throw new Error(errors[0]?.error || "TextBee gateway failed to send all reminders.");
  }

  return {
    provider: "TextBee",
    campaignId: formatCampaignName(campaign, "TextBee-Broadcast"),
    response: {
      message: `Processed ${acceptedRecipients + failedRecipients} recipient(s) through TextBee.`,
      acceptedRecipients,
      failedRecipients,
      batchCount: batches.length,
      batches: batchResults,
      errors,
    },
  };
}

async function sendPaymentReminder(member, month, customTemplate = "") {
  return sendSmsMessage({
    to: member.phoneNumber,
    message: buildReminderMessage(member, month, customTemplate),
  });
}

module.exports = {
  DEFAULT_PAYMENT_REMINDER_TEMPLATE,
  buildReminderMessage,
  renderMessageTemplate,
  sendBulkPersonalizedSms,
  sendPaymentReminder,
  sendSmsMessage,
};
