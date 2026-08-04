export interface JobEnvelope<T = unknown> {
  id: string;
  type: string;
  version: number;
  organizationId?: string;
  payload: T;
  correlationId: string;
  attempt: number;
}
export interface JobQueue {
  enqueue<T>(job: Omit<JobEnvelope<T>, "attempt">): Promise<void>;
}
export interface JobHandler<T = unknown> {
  type: string;
  version: number;
  handle(job: JobEnvelope<T>, signal: AbortSignal): Promise<void>;
}
export function retryDelay(attempt: number): number {
  return Math.min(60_000, 500 * 2 ** Math.max(0, attempt - 1));
}
