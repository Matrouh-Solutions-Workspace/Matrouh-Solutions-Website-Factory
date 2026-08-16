export function templateListingId(templateId: string): string {
  return `listing-${templateId.replace(/[^a-z0-9_-]/gi, "-")}`;
}
