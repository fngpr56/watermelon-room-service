function normalizeArg(arg) {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }

  return arg;
}

function write(level, ...args) {
  const timestamp = new Date().toISOString();
  const output = args.map(normalizeArg);

  if (level === "ERROR") {
    console.error(`[${timestamp}] [${level}]`, ...output);
    return;
  }

  if (level === "WARN") {
    console.warn(`[${timestamp}] [${level}]`, ...output);
    return;
  }

  console.log(`[${timestamp}] [${level}]`, ...output);
}

// Keep all app logs in one simple format.
export const logger = {
  http: (...args) => write("HTTP", ...args),
  info: (...args) => write("INFO", ...args),
  warn: (...args) => write("WARN", ...args),
  error: (...args) => write("ERROR", ...args),
};