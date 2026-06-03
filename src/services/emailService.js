const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

function getTransporter() {
  if (!env.smtpUser || !env.smtpPass) {
    throw new Error("Password reset email is not configured. Set SMTP_USER and SMTP_PASS.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
}

async function sendAdminPasswordResetCode({ to, resetCode, expiresInMinutes }) {
  const from = env.passwordResetFromEmail || env.smtpUser;
  const subject = "Lideta admin password reset code";
  const text = [
    "A password reset was requested for your Lideta admin account.",
    "",
    `Reset code: ${resetCode}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request this reset, ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102033">
      <h2>Lideta admin password reset</h2>
      <p>A password reset was requested for your Lideta admin account.</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px">${resetCode}</p>
      <p>This code expires in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this reset, ignore this email.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendAdminPasswordResetCode,
};
