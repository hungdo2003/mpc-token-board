type Level = "info" | "warn" | "error" | "debug";

function timestamp() {
  return new Date().toISOString();
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry: Record<string, unknown> = { ts: timestamp(), level, message };
  if (meta) entry.meta = meta;
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) => log("info",  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log("warn",  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") log("debug", msg, meta);
  },
};
