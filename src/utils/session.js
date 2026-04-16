import crypto from "crypto";

export const SESSION_COOKIE_NAME = "wrs_session";
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

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((cookies, chunk) => {
    const [name, ...rest] = chunk.trim().split("=");
    cookies[name] = rest.join("=");
    return cookies;
  }, {});
}

export function createSession(user) {
  // Store the expiry time inside the signed session payload.
  return {
    ...user,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
}

export function serializeSessionCookie(session, secret, secure = false) {
  // The cookie stores the payload plus a signature to catch tampering.
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signPayload(payload, secret);
  const parts = [
    `${SESSION_COOKIE_NAME}=${payload}.${signature}`,
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

export function readSessionFromRequest(req, secret) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const rawSession = cookies[SESSION_COOKIE_NAME];

  if (!rawSession) {
    return null;
  }

  const [payload, signature] = rawSession.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  // Reject broken or forged cookies.
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  const session = JSON.parse(fromBase64Url(payload));

  // Expired cookies behave like missing cookies.
  if (!session.exp || session.exp < Date.now()) {
    return null;
  }

  return session;
}