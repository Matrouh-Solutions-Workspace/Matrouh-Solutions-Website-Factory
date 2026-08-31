import pino from "pino";

export function createWorkerLogger(destination?: { write(message: string): void }) {
  const options = {
    base: { service: "worker" },
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  return destination ? pino(options, destination) : pino(options);
}

export const logger = createWorkerLogger();
