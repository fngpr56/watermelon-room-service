import { env } from "../config/env.js";
import { getSession } from "../middleware/auth.js";
import { authenticateUser } from "../services/auth.service.js";
import { ApiError } from "../utils/apiError.js";
import { clearSessionCookie, createSession, serializeSessionToken } from "../utils/session.js";

function isSecureCookieEnabled(req) {
  return env.nodeEnv === "production" && req.secure;
}

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body || {};
    const result = await authenticateUser(identifier, password);

    if (!result.ok && result.reason === "invalid_identifier") {
      throw new ApiError(400, "Identifier must be a room number or email address");
    }

    if (!result.ok) {
      throw new ApiError(401, "Invalid credentials");
    }

    const session = createSession(result.session);
    const sessionToken = serializeSessionToken(session, env.sessionSecret);

    res.setHeader("Set-Cookie", clearSessionCookie(isSecureCookieEnabled(req)));

    res.json({
      redirectTo: result.redirectTo,
      userType: result.session.userType,
      sessionToken,
    });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  res.setHeader("Set-Cookie", clearSessionCookie(isSecureCookieEnabled(req)));
  res.status(204).send();
}

export function me(req, res) {
  const session = getSession(req);

  if (!session) {
    return res.status(401).json({
      error: "Not authenticated",
      statusCode: 401,
    });
  }

  res.json({ session });
}