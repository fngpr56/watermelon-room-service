import crypto from "crypto";

export const SESSION_COOKIE_NAME = "wrs_session";
export const SESSION_HEADER_NAME = "x-wrs-session";
export const SESSION_QUERY_PARAM = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function parseSessionValue(rawSession, secret) {
  const [payload, signature] = String(rawSession || "").split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  const session = JSON.parse(fromBase64Url(payload));

  if (!session.exp || session.exp < Date.now()) {
    return null;
  }

  return session;
}

export function createSession(user) {
  // Store the expiry time inside the signed session payload.
  return {
    ...user,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
}

export function serializeSessionToken(session, secret) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function serializeSessionCookie(session, secret, secure = false) {
  // The cookie stores the payload plus a signature to catch tampering.
  const parts = [
    `${SESSION_COOKIE_NAME}=${serializeSessionToken(session, secret)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie(secure = false) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function getSessionTokenFromRequest(req) {
  const headerToken = String(req.headers[SESSION_HEADER_NAME] || "").trim();

  if (headerToken) {
    return headerToken;
  }

  const queryToken = req.query?.[SESSION_QUERY_PARAM];

  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

export function readSessionFromToken(rawSession, secret) {
  if (!rawSession) {
    return null;
  }

  try {
    return parseSessionValue(String(rawSession).trim(), secret);
  } catch {
    return null;
  }
}

export function readSessionFromRequest(req, secret) {
  const rawSession = getSessionTokenFromRequest(req);
  return readSessionFromToken(rawSession, secret);
}