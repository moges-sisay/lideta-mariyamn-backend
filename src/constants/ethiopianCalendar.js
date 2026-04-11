const ETHIOPIAN_TIME_ZONE = "Africa/Addis_Ababa";

const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
];

function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getGregorianDateParts(date = new Date(), timeZone = ETHIOPIAN_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const parsed = parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = Number(part.value);
    }

    return accumulator;
  }, {});

  return {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
  };
}

function getEthiopianNewYearDay(gregorianYear) {
  return isGregorianLeapYear(gregorianYear + 1) ? 12 : 11;
}

function getCurrentEthiopianYear(date = new Date()) {
  const { year, month, day } = getGregorianDateParts(date);
  const newYearDay = getEthiopianNewYearDay(year);
  const hasStarted = month > 9 || (month === 9 && day >= newYearDay);

  return hasStarted ? year - 7 : year - 8;
}

function getCurrentEthiopianMonth(date = new Date()) {
  const { year, month, day } = getGregorianDateParts(date);
  const newYearDay = getEthiopianNewYearDay(year);
  const hasStarted = month > 9 || (month === 9 && day >= newYearDay);
  const yearStartGregorianYear = hasStarted ? year : year - 1;
  const yearStartUtc = Date.UTC(
    yearStartGregorianYear,
    8,
    getEthiopianNewYearDay(yearStartGregorianYear)
  );
  const currentUtc = Date.UTC(year, month - 1, day);
  const diffDays = Math.floor((currentUtc - yearStartUtc) / 86400000);
  const monthIndex = Math.min(12, Math.max(0, Math.floor(diffDays / 30)));

  return ETHIOPIAN_MONTHS[monthIndex];
}

function buildDefaultPayments() {
  return ETHIOPIAN_MONTHS.reduce((accumulator, month) => {
    accumulator[month] = {
      isPaid: false,
      paidAt: null,
    };

    return accumulator;
  }, {});
}

function flattenPayments(payments) {
  if (!payments) {
    return {};
  }

  if (payments instanceof Map) {
    return Object.fromEntries(payments.entries());
  }

  if (typeof payments.toObject === "function") {
    return payments.toObject();
  }

  return payments;
}

function normalizePayments(payments) {
  const nextPayments = buildDefaultPayments();
  const plainPayments = flattenPayments(payments);

  ETHIOPIAN_MONTHS.forEach((month) => {
    if (!plainPayments[month]) {
      return;
    }

    nextPayments[month] = {
      isPaid: Boolean(plainPayments[month].isPaid),
      paidAt: plainPayments[month].paidAt || null,
    };
  });

  return nextPayments;
}

function isValidEthiopianMonth(month) {
  return ETHIOPIAN_MONTHS.includes(month);
}

module.exports = {
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_TIME_ZONE,
  buildDefaultPayments,
  flattenPayments,
  getCurrentEthiopianMonth,
  getCurrentEthiopianYear,
  isValidEthiopianMonth,
  normalizePayments,
};

