function normalizePhoneNumberForStorage(phoneNumber = "") {
  const raw = String(phoneNumber).trim();

  if (!raw) {
    return "";
  }

  const digitsOnly = raw.replace(/[^\d+]/g, "");

  if (digitsOnly.startsWith("+251")) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("251")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("09")) {
    return `+251${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith("9")) {
    return `+251${digitsOnly}`;
  }

  return digitsOnly;
}

function formatPhoneNumberForSms(phoneNumber = "") {
  const normalized = normalizePhoneNumberForStorage(phoneNumber);

  if (normalized.startsWith("+251")) {
    return `0${normalized.slice(4)}`;
  }

  return normalized;
}

module.exports = {
  formatPhoneNumberForSms,
  normalizePhoneNumberForStorage,
};

