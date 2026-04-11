const env = require("../config/env");

function verifySyncToken(request, response, next) {
  if (!env.syncAuthToken) {
    return response.status(500).json({
      message: "SYNC_AUTH_TOKEN is not configured on the server.",
    });
  }

  const token = request.header("X-Auth-Token");

  if (!token || token !== env.syncAuthToken) {
    return response.status(401).json({
      message: "Invalid sync token.",
    });
  }

  next();
}

module.exports = verifySyncToken;

