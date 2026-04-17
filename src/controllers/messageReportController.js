const MessageReport = require("../models/MessageReport");
const {
  appendCallbackEvent,
  buildSmsGatewayDiagnostics,
  serializeMessageReport,
} = require("../services/messageReportService");

async function listMessageReports(request, response) {
  const reports = await MessageReport.find({}).sort({ createdAt: -1 }).limit(30);

  return response.json({
    reports: reports.map(serializeMessageReport),
  });
}

async function getSmsGatewayDiagnostics(request, response) {
  return response.json(buildSmsGatewayDiagnostics());
}

async function receiveTextBeeCreateCallback(request, response) {
  const payload = {
    ...request.query,
    ...request.body,
  };

  await appendCallbackEvent("create", payload);

  return response.json({
    ok: true,
  });
}

async function receiveTextBeeStatusCallback(request, response) {
  const payload = {
    ...request.query,
    ...request.body,
  };

  await appendCallbackEvent("status", payload);

  return response.json({
    ok: true,
  });
}

module.exports = {
  getSmsGatewayDiagnostics,
  listMessageReports,
  receiveTextBeeCreateCallback,
  receiveTextBeeStatusCallback,
};
