import type { OrganizationId } from "@factory/domain";
export interface TenantContext {
  organizationId: OrganizationId;
  actorId: string;
  correlationId: string;
}
export interface QuotaPolicy {
  assertWithin(context: TenantContext, resource: string, requested: number): Promise<void>;
}
export function requireTenant(value: TenantContext | undefined): TenantContext {
  if (!value) throw new Error("TENANT_CONTEXT_REQUIRED");
  return value;
}
