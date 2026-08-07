import { createHash } from "node:crypto";
import { dashboardDatabase } from "./database";

export interface WebsiteClaimLookup {
  readonly claimId: string;
  readonly organizationId: string;
  readonly websiteId: string;
  readonly websiteName: string;
  readonly intendedEmail: string | null;
}

export async function findWebsiteClaim(token: string): Promise<WebsiteClaimLookup | null> {
  if (token.length < 32 || token.length > 128) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = await dashboardDatabase().$queryRaw<
    {
      claim_id: string;
      organization_id: string;
      website_id: string;
      website_name: string;
      intended_email: string | null;
    }[]
  >`SELECT * FROM find_website_claim(${hash})`;
  const row = rows[0];
  return row
    ? {
        claimId: row.claim_id,
        organizationId: row.organization_id,
        websiteId: row.website_id,
        websiteName: row.website_name,
        intendedEmail: row.intended_email,
      }
    : null;
}
