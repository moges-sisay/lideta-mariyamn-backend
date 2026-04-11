const Member = require("../models/Member");
const {
  buildDefaultPayments,
  flattenPayments,
  getCurrentEthiopianMonth,
  getCurrentEthiopianYear,
  isValidEthiopianMonth,
  normalizePayments,
} = require("../constants/ethiopianCalendar");
const { sendPaymentReminder } = require("../services/afroMessageService");
const delay = require("../utils/delay");
const { normalizePhoneNumberForStorage } = require("../utils/phoneNumber");

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createMember(request, response) {
  const { fullName, phoneNumber, location, status, committeeLeader } = request.body;
  const normalizedPhoneNumber = normalizePhoneNumberForStorage(phoneNumber);

  if (!fullName || !normalizedPhoneNumber) {
    return response.status(400).json({
      message: "fullName and phoneNumber are required.",
    });
  }

  const existing = await Member.findOne({ phoneNumber: normalizedPhoneNumber });
  if (existing) {
    return response.status(409).json({
      message: "A member with this phone number already exists.",
    });
  }

  const currentEthiopianYear = getCurrentEthiopianYear();
  const member = new Member({
    fullName,
    phoneNumber: normalizedPhoneNumber,
    location: location || "",
    status: status || "",
    committeeLeader: committeeLeader || "",
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

  return payload;
}

async function syncMember(request, response) {
  const { fullName, phoneNumber, location, status, committeeLeader } = request.body;
  const normalizedPhoneNumber = normalizePhoneNumberForStorage(phoneNumber);

  if (!fullName || !normalizedPhoneNumber) {
    return response.status(400).json({
      message: "fullName and phoneNumber are required.",
    });
  }

  const currentEthiopianYear = getCurrentEthiopianYear();
  let member = await Member.findOne({ phoneNumber: normalizedPhoneNumber });

  if (!member) {
    member = new Member({
      fullName,
      phoneNumber: normalizedPhoneNumber,
      location,
      status,
      committeeLeader,
      ethiopianYear: currentEthiopianYear,
      payments: buildDefaultPayments(),
    });
  } else {
    member.fullName = fullName;
    member.phoneNumber = normalizedPhoneNumber;
    member.location = location || "";
    member.status = status || "";
    member.committeeLeader = committeeLeader || "";

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
      { location: expression },
      { status: expression },
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

async function getCommitteeGroups(request, response) {
  const members = await Member.find({}).sort({ committeeLeader: 1, fullName: 1 });
  const groupsMap = members.reduce((accumulator, member) => {
    const key = member.committeeLeader || "Unassigned";

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(serializeMember(member));

    return accumulator;
  }, {});

  const groups = Object.entries(groupsMap).map(([leader, groupMembers]) => ({
    leader,
    count: groupMembers.length,
    members: groupMembers,
  }));

  return response.json({
    groups,
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

  const result = await sendPaymentReminder(member.phoneNumber, member.fullName, month);

  return response.json({
    message: `Reminder sent to ${member.fullName}.`,
    result,
  });
}

async function broadcastDebtors(request, response) {
  const { month } = request.body;

  if (!isValidEthiopianMonth(month)) {
    return response.status(400).json({
      message: "Invalid Ethiopian month supplied.",
    });
  }

  const debtors = await Member.find({
    [`payments.${month}.isPaid`]: false,
  }).sort({ fullName: 1 });

  const results = [];

  for (let index = 0; index < debtors.length; index += 1) {
    const debtor = debtors[index];

    try {
      const result = await sendPaymentReminder(debtor.phoneNumber, debtor.fullName, month);
      results.push({
        memberId: debtor.id,
        fullName: debtor.fullName,
        phoneNumber: debtor.phoneNumber,
        status: "sent",
        result,
      });
    } catch (error) {
      results.push({
        memberId: debtor.id,
        fullName: debtor.fullName,
        phoneNumber: debtor.phoneNumber,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (index < debtors.length - 1) {
      await delay(3000);
    }
  }

  return response.json({
    message: `Broadcast completed for ${month}.`,
    total: debtors.length,
    sent: results.filter((item) => item.status === "sent").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
  });
}

module.exports = {
  broadcastDebtors,
  createMember,
  getCommitteeGroups,
  getMemberByPhoneNumber,
  listMembers,
  sendSingleReminder,
  syncMember,
  updatePaymentStatus,
};
