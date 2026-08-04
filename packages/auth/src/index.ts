import type { Actor } from "@factory/application";
export interface SessionIdentity {
  userId: string;
  expiresAt: string;
}
export interface SessionProvider {
  resolve(token: string): Promise<SessionIdentity | null>;
  revoke(token: string): Promise<void>;
}
export function authorize(actor: Actor, permission: string): void {
  if (!actor.permissions.includes(permission)) throw new Error("AUTHORIZATION_DENIED");
}
