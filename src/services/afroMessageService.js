const Afromessage = require("afromessage").default;
const env = require("../config/env");
const { formatPhoneNumberForSms } = require("../utils/phoneNumber");

let afroMessageClient;

function getAfroMessageClient() {
  if (afroMessageClient) {
    return afroMessageClient;
  }

  if (!env.afroMessageToken || !env.afroMessageIdentifierId) {
    throw new Error(
      "AfroMessage credentials are missing. Set AFROMESSAGE_TOKEN and AFROMESSAGE_IDENTIFIER_ID."
    );
  }

  afroMessageClient = Afromessage.getInstance({
    apiKey: env.afroMessageToken,
    identifierId: env.afroMessageIdentifierId,
    senderName: env.afroMessageSenderName,
    baseUrl: env.afroMessageBaseUrl,
  });

  return afroMessageClient;
}

function buildReminderMessage(name, month) {
  return `ሰላም ${name}፣ የልደታ ማርያም ገዳም የ${month} ወር መዋጮዎን ስላልከፈሉ እባክዎ በCBE Birr ይክፈሉ። አመሰግናለን።`;
}

async function sendPaymentReminder(to, name, month) {
  const smsClient = getAfroMessageClient();

  return smsClient.sendSms({
    to: formatPhoneNumberForSms(to),
    message: buildReminderMessage(name, month),
  });
}

module.exports = {
  sendPaymentReminder,
};

