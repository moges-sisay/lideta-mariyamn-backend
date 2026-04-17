const Member = require("../models/Member");
const Feedback = require("../models/Feedback");
const {
  buildDefaultPayments,
  flattenPayments,
  getCurrentEthiopianMonth,
  getCurrentEthiopianYear,
  isValidEthiopianMonth,
  normalizePayments,
} = require("../constants/ethiopianCalendar");
const {
  DEFAULT_PAYMENT_REMINDER_TEMPLATE,
  sendBulkPersonalizedSms,
  sendPaymentReminder,
} = require("../services/textBeeService");
const {
  createMessageReport,
  extractCampaignId,
  extractProviderMessage,
} = require("../services/messageReportService");
const { normalizePhoneNumberForStorage } = require("../utils/phoneNumber");
const {
  calculateSimilarity,
  createCommitteeGroups,
  getMemberCommittee,
  normalizeCommitteeValue,
} = require("../utils/committeeGroups");

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRegisteredAdminEmail(request) {
  return request.admin?.email || "";
}

function getRequestedMessageTemplate(request) {
  return String(request.body?.message || "").trim();
}

function buildReportMemberList(members = []) {
  return members.map((member) => serializeMember(member));
}

function buildBroadcastCampaignName(prefix, month, committee = "") {
  const parts = [prefix, month];

  if (committee) {
    parts.push(committee);
  }

  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" - ");
}

function buildMemberPayload(input = {}, request) {
  const fullName = String(input.fullName || "").trim();
  const phoneNumber = normalizePhoneNumberForStorage(input.phoneNumber);
  const committee = String(input.committee || "").trim();
  const gender = String(input.gender || "").trim().toLowerCase();

  return {
    fullName,
    phoneNumber,
    currentLocation: String(input.currentLocation || input.location || "").trim(),
    location: String(input.currentLocation || input.location || "").trim(),
    educationEmploymentStatus: String(
      input.educationEmploymentStatus || input.status || ""
    ).trim(),
    gender: gender === "female" ? "female" : gender === "male" ? "male" : "",
    status: String(input.educationEmploymentStatus || input.status || "").trim(),
    committee,
    committeeLeader: String(input.committeeLeader || "").trim(),
    registeredByAdmin: getRegisteredAdminEmail(request),
  };
}

async function createMember(request, response) {
  const payload = buildMemberPayload(request.body, request);

  if (!payload.fullName || !payload.phoneNumber || !payload.committee) {
    return response.status(400).json({
      message: "fullName, phoneNumber, and committee are required.",
    });
  }

  const existing = await Member.findOne({ phoneNumber: payload.phoneNumber });
  if (existing) {
    return response.status(409).json({
      message: "A member with this phone number already exists.",
    });
  }

  const currentEthiopianYear = getCurrentEthiopianYear();
  const member = new Member({
    ...payload,
    ethiopianYear: currentEthiopianYear,
    payments: buildDefaultPayments(),
  });

  await member.save();

  return response.status(201).json({
    message: "Member created successfully.",
    member: serializeMember(member),
  });
}

function serializeMember(member) {
  const payload = member.toObject();

  payload.payments = normalizePayments(payload.payments);
  payload.currentLocation = payload.currentLocation || payload.location || "";
  payload.educationEmploymentStatus =
    payload.educationEmploymentStatus || payload.status || "";
  payload.gender = payload.gender || "";
  payload.committee = payload.committee || "";
  payload.committeeLeader = payload.committeeLeader || "";
  payload.registeredByAdmin = payload.registeredByAdmin || "";

  return payload;
}

async function syncMember(request, response) {
  const payload = buildMemberPayload(request.body, request);

  if (!payload.fullName || !payload.phoneNumber) {
    return response.status(400).json({
      message: "fullName and phoneNumber are required.",
    });
  }

  const currentEthiopianYear = getCurrentEthiopianYear();
  let member = await Member.findOne({ phoneNumber: payload.phoneNumber });

  if (!member) {
    member = new Member({
      ...payload,
      ethiopianYear: currentEthiopianYear,
      payments: buildDefaultPayments(),
    });
  } else {
    member.fullName = payload.fullName;
    member.phoneNumber = payload.phoneNumber;
    member.currentLocation = payload.currentLocation;
    member.location = payload.location;
    member.educationEmploymentStatus = payload.educationEmploymentStatus;
    member.gender = payload.gender;
    member.status = payload.status;
    member.committee = payload.committee;
    member.committeeLeader = payload.committeeLeader;
    member.registeredByAdmin = payload.registeredByAdmin || member.registeredByAdmin;

    if (member.ethiopianYear !== currentEthiopianYear) {
      member.ethiopianYear = currentEthiopianYear;
      member.payments = buildDefaultPayments();
    } else {
      member.payments = normalizePayments(flattenPayments(member.payments));
    }
  }

  await member.save();

  return response.status(200).json({
    message: "Member synced successfully.",
    member: serializeMember(member),
  });
}

async function listMembers(request, response) {
  const { search = "" } = request.query;
  const filters = {};

  if (search) {
    const expression = new RegExp(escapeRegExp(String(search)), "i");
    filters.$or = [
      { fullName: expression },
      { phoneNumber: expression },
      { currentLocation: expression },
      { educationEmploymentStatus: expression },
      { gender: expression },
      { committee: expression },
      { committeeLeader: expression },
    ];
  }

  const members = await Member.find(filters).sort({ fullName: 1 });

  return response.json({
    month: getCurrentEthiopianMonth(),
    year: getCurrentEthiopianYear(),
    members: members.map(serializeMember),
  });
}

async function getMemberByPhoneNumber(request, response) {
  const normalizedPhoneNumber = normalizePhoneNumberForStorage(request.params.phoneNumber);
  const member = await Member.findOne({ phoneNumber: normalizedPhoneNumber });

  if (!member) {
    return response.status(404).json({
      message: "Member not found.",
    });
  }

  return response.json({
    member: serializeMember(member),
  });
}

async function getPublicMemberDirectory(request, response) {
  const selectedMonth = request.query.month || getCurrentEthiopianMonth();
  const search = String(request.query.search || "").trim();
  const filters = {};

  if (!isValidEthiopianMonth(selectedMonth)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  if (search) {
    const expression = new RegExp(escapeRegExp(search), "i");
    filters.$or = [
      { fullName: expression },
      { currentLocation: expression },
      { educationEmploymentStatus: expression },
      { gender: expression },
      { committee: expression },
      { committeeLeader: expression },
    ];
  }

  const members = await Member.find(filters).sort({ fullName: 1 });

  return response.json({
    month: selectedMonth,
    year: getCurrentEthiopianYear(),
    members: members.map((member) => {
      const serialized = serializeMember(member);

      return {
        _id: serialized._id,
        fullName: serialized.fullName,
        currentLocation: serialized.currentLocation,
        educationEmploymentStatus: serialized.educationEmploymentStatus,
        gender: serialized.gender,
        committee: serialized.committee,
        committeeLeader: serialized.committeeLeader,
        ethiopianYear: serialized.ethiopianYear,
        currentMonthPayment: serialized.payments?.[selectedMonth] || {
          isPaid: false,
          paidAt: null,
        },
      };
    }),
  });
}

async function getCommitteeGroups(request, response) {
  const members = await Member.find({}).sort({ committee: 1, fullName: 1 });
  const serializedMembers = members.map(serializeMember);
  const groups = createCommitteeGroups(serializedMembers).map((group) => ({
    committee: group.committee,
    count: group.members.length,
    members: group.members,
  }));

  return response.json({
    groups,
  });
}

function buildCommitteeReport(groups, selectedMonth, committeeFilter = "") {
  const normalizedFilter = normalizeCommitteeValue(committeeFilter);
  const visibleGroups = normalizedFilter
    ? groups.filter(
        (group) =>
          group.normalizedCommittee === normalizedFilter ||
          group.normalizedCommittee.includes(normalizedFilter)
      )
    : groups;

  const committees = visibleGroups.map((group) => {
    const paidMembers = group.members.filter((member) => member.payments?.[selectedMonth]?.isPaid);
    const unpaidMembers = group.members.filter((member) => !member.payments?.[selectedMonth]?.isPaid);

    return {
      committee: group.committee,
      normalizedCommittee: group.normalizedCommittee,
      count: group.members.length,
      paidCount: paidMembers.length,
      unpaidCount: unpaidMembers.length,
      paidMembers,
      unpaidMembers,
      members: group.members,
    };
  });

  return {
    committees,
    totals: {
      members: committees.reduce((sum, group) => sum + group.count, 0),
      paid: committees.reduce((sum, group) => sum + group.paidCount, 0),
      unpaid: committees.reduce((sum, group) => sum + group.unpaidCount, 0),
    },
  };
}

async function getAdminDashboardReport(request, response) {
  const selectedMonth = request.query.month || getCurrentEthiopianMonth();
  const committeeFilter = String(request.query.committee || "");

  if (!isValidEthiopianMonth(selectedMonth)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  const members = await Member.find({}).sort({ committee: 1, fullName: 1 });
  const groups = createCommitteeGroups(members.map(serializeMember));
  const report = buildCommitteeReport(groups, selectedMonth, committeeFilter);

  return response.json({
    month: selectedMonth,
    ...report,
  });
}

async function updatePaymentStatus(request, response) {
  const { memberId, month } = request.params;
  const { isPaid } = request.body;

  if (!isValidEthiopianMonth(month)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  if (typeof isPaid !== "boolean") {
    return response.status(400).json({
      message: "isPaid must be a boolean value.",
    });
  }

  const member = await Member.findById(memberId);

  if (!member) {
    return response.status(404).json({
      message: "Member not found.",
    });
  }

  const nextPayments = normalizePayments(flattenPayments(member.payments));
  nextPayments[month] = {
    isPaid,
    paidAt: isPaid ? new Date() : null,
  };

  member.payments = nextPayments;
  await member.save();

  return response.json({
    message: `${month} payment updated successfully.`,
    member: serializeMember(member),
  });
}

async function sendSingleReminder(request, response) {
  const { memberId, month } = request.params;
  const messageTemplate = getRequestedMessageTemplate(request);

  if (!isValidEthiopianMonth(month)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  const member = await Member.findById(memberId);

  if (!member) {
    return response.status(404).json({
      message: "Member not found.",
    });
  }

  const payments = normalizePayments(flattenPayments(member.payments));

  if (payments[month]?.isPaid) {
    return response.status(400).json({
      message: `${member.fullName} has already paid for ${month}.`,
    });
  }

  const serializedMember = serializeMember(member);
  let result;

  try {
    result = await sendPaymentReminder(
      serializedMember,
      month,
      messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE
    );

    await createMessageReport({
      messageType: "single",
      requestStatus: "accepted",
      month,
      committee: serializedMember.committee,
      campaignName: buildBroadcastCampaignName("Lideta Single Reminder", month, serializedMember.fullName),
      messageTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
      initiatedByAdmin: getRegisteredAdminEmail(request),
      members: [serializedMember],
      result,
    });
  } catch (error) {
    await createMessageReport({
      messageType: "single",
      requestStatus: "failed",
      month,
      committee: serializedMember.committee,
      campaignName: buildBroadcastCampaignName("Lideta Single Reminder", month, serializedMember.fullName),
      messageTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
      initiatedByAdmin: getRegisteredAdminEmail(request),
      members: [serializedMember],
      result: {
        error: String(error || ""),
      },
      errorMessage: String(error || ""),
    });

    throw error;
  }

  return response.json({
    message: `Reminder sent to ${member.fullName}.`,
    result,
    providerMessage: extractProviderMessage(result),
  });
}

async function broadcastDebtors(request, response) {
  const { month } = request.body;
  const messageTemplate = getRequestedMessageTemplate(request);

  if (!isValidEthiopianMonth(month)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  const debtors = await Member.find({
    [`payments.${month}.isPaid`]: false,
  }).sort({ fullName: 1 });

  if (debtors.length === 0) {
    return response.json({
      message: `No unpaid members found for ${month}.`,
      total: 0,
      queued: 0,
      campaignId: null,
      usedTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
    });
  }

  const serializedDebtors = buildReportMemberList(debtors);
  const campaignName = buildBroadcastCampaignName("Lideta All Members", month);
  let result;

  try {
    result = await sendBulkPersonalizedSms({
      recipients: serializedDebtors.map((member) => ({
        ...member,
        month,
      })),
      messageTemplate,
      campaign: campaignName,
    });

    await createMessageReport({
      messageType: "broadcast",
      requestStatus: "accepted",
      month,
      campaignName,
      messageTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
      initiatedByAdmin: getRegisteredAdminEmail(request),
      members: serializedDebtors,
      result,
    });
  } catch (error) {
    await createMessageReport({
      messageType: "broadcast",
      requestStatus: "failed",
      month,
      campaignName,
      messageTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
      initiatedByAdmin: getRegisteredAdminEmail(request),
      members: serializedDebtors,
      result: {
        error: String(error || ""),
      },
      errorMessage: String(error || ""),
    });

    throw error;
  }

  return response.json({
    message: `Broadcast completed for ${month}.`,
    total: debtors.length,
    queued: debtors.length,
    campaignId: extractCampaignId(result) || null,
    providerMessage: extractProviderMessage(result),
    usedTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
  });
}

async function sendCommitteeReminderBroadcast(request, response) {
  const { month, committee = "" } = request.body;
  const messageTemplate = getRequestedMessageTemplate(request);

  if (!isValidEthiopianMonth(month)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  if (!String(committee).trim()) {
    return response.status(400).json({
      message: "Committee is required.",
    });
  }

  const targetCommittee = normalizeCommitteeValue(committee);
  const allMembers = await Member.find({
    [`payments.${month}.isPaid`]: false,
  }).sort({ fullName: 1 });

  const debtors = allMembers.filter((member) => {
    const memberCommittee = normalizeCommitteeValue(getMemberCommittee(member));
    return (
      memberCommittee === targetCommittee ||
      calculateSimilarity(memberCommittee, targetCommittee) >= 0.75
    );
  });

  if (debtors.length === 0) {
    return response.json({
      message: `No unpaid members found for ${committee}.`,
      committee,
      total: 0,
      queued: 0,
      campaignId: null,
      usedTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
    });
  }

  const serializedDebtors = buildReportMemberList(debtors);
  const campaignName = buildBroadcastCampaignName("Lideta Committee", month, committee);
  let result;

  try {
    result = await sendBulkPersonalizedSms({
      recipients: serializedDebtors.map((member) => ({
        ...member,
        month,
      })),
      messageTemplate,
      campaign: campaignName,
    });

    await createMessageReport({
      messageType: "committee",
      requestStatus: "accepted",
      month,
      committee,
      campaignName,
      messageTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
      initiatedByAdmin: getRegisteredAdminEmail(request),
      members: serializedDebtors,
      result,
    });
  } catch (error) {
    await createMessageReport({
      messageType: "committee",
      requestStatus: "failed",
      month,
      committee,
      campaignName,
      messageTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
      initiatedByAdmin: getRegisteredAdminEmail(request),
      members: serializedDebtors,
      result: {
        error: String(error || ""),
      },
      errorMessage: String(error || ""),
    });

    throw error;
  }

  return response.json({
    message: `Committee reminder broadcast completed for ${committee}.`,
    committee,
    total: debtors.length,
    queued: debtors.length,
    campaignId: extractCampaignId(result) || null,
    providerMessage: extractProviderMessage(result),
    usedTemplate: messageTemplate || DEFAULT_PAYMENT_REMINDER_TEMPLATE,
  });
}

async function bulkImportMembers(request, response) {
  const rows = Array.isArray(request.body?.rows) ? request.body.rows : [];

  if (rows.length === 0) {
    return response.status(400).json({
      message: "Upload rows are required.",
    });
  }

  const currentEthiopianYear = getCurrentEthiopianYear();
  const createdMembers = [];
  const updatedMembers = [];
  const skippedRows = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const payload = buildMemberPayload(rows[index], request);

    if (!payload.fullName || !payload.phoneNumber || !payload.committee) {
      skippedRows.push({
        row: rowNumber,
        reason: "fullName, phoneNumber, and committee are required.",
      });
      continue;
    }

    let member = await Member.findOne({ phoneNumber: payload.phoneNumber });

    if (!member) {
      member = new Member({
        ...payload,
        ethiopianYear: currentEthiopianYear,
        payments: buildDefaultPayments(),
      });
      await member.save();
      createdMembers.push(serializeMember(member));
      continue;
    }

    member.fullName = payload.fullName;
    member.phoneNumber = payload.phoneNumber;
    member.currentLocation = payload.currentLocation;
    member.location = payload.location;
    member.educationEmploymentStatus = payload.educationEmploymentStatus;
    member.gender = payload.gender;
    member.status = payload.status;
    member.committee = payload.committee;
    member.committeeLeader = payload.committeeLeader;
    member.registeredByAdmin = payload.registeredByAdmin || member.registeredByAdmin;
    await member.save();
    updatedMembers.push(serializeMember(member));
  }

  return response.status(201).json({
    message: "Bulk member import completed.",
    createdCount: createdMembers.length,
    updatedCount: updatedMembers.length,
    skippedCount: skippedRows.length,
    createdMembers,
    updatedMembers,
    skippedRows,
  });
}

async function submitFeedback(request, response) {
  const fullName = String(request.body.fullName || "").trim();
  const phoneNumber = normalizePhoneNumberForStorage(request.body.phoneNumber || "");
  const message = String(request.body.message || "").trim();

  if (!message) {
    return response.status(400).json({
      message: "Feedback message is required.",
    });
  }

  const feedback = await Feedback.create({
    fullName,
    phoneNumber,
    message,
  });

  return response.status(201).json({
    message: "Feedback submitted successfully.",
    feedback,
  });
}

async function listFeedback(request, response) {
  const feedbackItems = await Feedback.find({}).sort({ createdAt: -1 });

  return response.json({
    feedback: feedbackItems,
  });
}

module.exports = {
  broadcastDebtors,
  bulkImportMembers,
  createMember,
  getAdminDashboardReport,
  getCommitteeGroups,
  getMemberByPhoneNumber,
  getPublicMemberDirectory,
  listMembers,
  listFeedback,
  sendCommitteeReminderBroadcast,
  sendSingleReminder,
  submitFeedback,
  syncMember,
  updatePaymentStatus,
};
