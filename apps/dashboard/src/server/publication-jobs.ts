const activeStatuses = new Set(["queued", "running", "retryable"]);
const retryableTerminalStatuses = new Set(["failed", "dead_letter"]);

export function isActivePublicationJob(status: string | null | undefined): boolean {
  return status ? activeStatuses.has(status) : false;
}

export function canRetryPublicationJob(status: string | null | undefined): boolean {
  return status ? retryableTerminalStatuses.has(status) : false;
}
