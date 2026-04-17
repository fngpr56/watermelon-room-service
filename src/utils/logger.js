/**
 * Lightweight console logger with normalized payload formatting for server diagnostics.
 */
const REDACTED_VALUE = "[REDACTED]";
const REDACTED_KEYS = new Set([
  "authorization",
  "cookie",
  "dbpassword",
  "password",
  "passwordhash",
  "sessiontoken",
  "xwrssession",
]);

function normalizeKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeError(error, seen) {
  const output = {
    name: error.name,
    message: error.message,
  };

  if (error.code) {
    output.code = error.code;
  }

  if (Number.isInteger(error.statusCode)) {
    output.statusCode = error.statusCode;
  }

  if (Number.isInteger(error.status)) {
    output.status = error.status;
  }

  if (error.type) {
    output.type = error.type;
  }

  if (error.details !== undefined) {
    output.details = normalizeArg(error.details, seen);
  }

  if (error.cause) {
    output.cause = normalizeArg(error.cause, seen);
  }

  if (error.stack) {
    output.stack = error.stack;
  }

  for (const [key, value] of Object.entries(error)) {
    if (key in output) {
      continue;
    }

    output[key] = normalizeArg(value, seen);
  }

  return output;
}

function normalizeArg(arg, seen = new WeakSet()) {
  if (arg instanceof Error) {
    return normalizeError(arg, seen);
  }

  if (arg === null || arg === undefined) {
    return arg;
  }

  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") {
    return arg;
  }

  if (typeof arg === "bigint") {
    return Number(arg);
  }

  if (arg instanceof Date) {
    return arg.toISOString();
  }

  if (Array.isArray(arg)) {
    return arg.map((item) => normalizeArg(item, seen));
  }

  if (typeof arg === "object") {
    if (seen.has(arg)) {
      return "[Circular]";
    }

    seen.add(arg);

    const output = {};

    for (const [key, value] of Object.entries(arg)) {
      output[key] = REDACTED_KEYS.has(normalizeKey(key))
        ? REDACTED_VALUE
        : normalizeArg(value, seen);
    }

    seen.delete(arg);
    return output;
  }

  return String(arg);
}

function formatArg(arg) {
  if (typeof arg === "string") {
    return arg;
  }

  const normalized = normalizeArg(arg);

  if (normalized === undefined) {
    return "undefined";
  }

  if (typeof normalized === "string") {
    return normalized;
  }

  return JSON.stringify(normalized);
}

function write(level, ...args) {
  const timestamp = new Date().toISOString();
  const output = args.map(formatArg).join(" ");
  const line = `[${timestamp}] [${level}] ${output}`;

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

// Keep all app logs in one simple format.
export const logger = {
  http: (...args) => write("HTTP", ...args),
  info: (...args) => write("INFO", ...args),
  warn: (...args) => write("WARN", ...args),
  error: (...args) => write("ERROR", ...args),
};