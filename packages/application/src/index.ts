import type { OrganizationId } from "@factory/domain";
export interface Actor {
  type: "user" | "system";
  id: string;
  permissions: readonly string[];
}
export interface RequestContext {
  actor: Actor;
  organizationId: OrganizationId;
  correlationId: string;
}
export interface CommandHandler<C, R> {
  execute(context: RequestContext, command: C): Promise<R>;
}
export interface PlatformEvent {
  eventId: string;
  type: string;
  version: number;
  organizationId?: string;
  occurredAt: string;
  correlationId: string;
  payload: Readonly<Record<string, unknown>>;
}
export interface EventPublisher {
  append(event: PlatformEvent): Promise<void>;
}
