import { describe, expect, it, vi } from "vitest";

const { withTenantTransaction, tx } = vi.hoisted(() => {
  const tx = {
    client: { findUnique: vi.fn().mockResolvedValue({ id: "client" }) },
    website: { create: vi.fn() },
    websiteSubscription: { create: vi.fn() },
    websiteLocale: { createMany: vi.fn() },
    websiteSettingsDraft: { create: vi.fn() },
    themeDraft: { create: vi.fn() },
    domain: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
    pageDraft: { create: vi.fn() },
    sectionDraft: { createMany: vi.fn() },
    navigationDraft: { create: vi.fn() },
    navigationNodeDraft: { createMany: vi.fn() },
  };
  return {
    tx,
    withTenantTransaction: vi.fn(
      async (_client: unknown, _context: unknown, callback: (tx: any) => Promise<void>) =>
        callback(tx),
    ),
  };
});
vi.mock("@factory/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@factory/database")>()),
  withTenantTransaction,
}));

import { persistWebsiteCreation } from "../src/server/actions/website-create-persistence";

describe("persistWebsiteCreation", () => {
  it("creates the website foundation, localized pages, and navigation in one transaction", async () => {
    const template = {
      websiteSchema: { version: 1, parse: () => ({}) },
      theme: { id: "theme", schemaVersion: 1, defaults: {} },
      pages: [{ id: "home", title: "Home", slug: { defaultValue: "/" }, defaultSections: [] }],
      sections: [],
      navigation: [
        {
          id: "main",
          localization: "localized-tree",
          visibilitySchema: { version: 1, parse: () => ({}) },
          allowedPageTypes: "all",
        },
      ],
    } as any;
    await persistWebsiteCreation({} as any, {
      organizationId: "org",
      actorId: "actor",
      websiteId: "site",
      clientId: "client",
      name: "Clinic",
      templateId: "tpl",
      templateVersion: "1",
      hostname: "clinic.example",
      cadence: null,
      expiresAt: null,
      languages: { defaultLocale: "ar", locales: ["ar", "en"] },
      template,
    });
    expect(tx.website.create).toHaveBeenCalledOnce();
    expect(tx.websiteLocale.createMany).toHaveBeenCalledOnce();
    expect(tx.pageDraft.create).toHaveBeenCalledTimes(2);
    expect(tx.navigationNodeDraft.createMany).toHaveBeenCalledTimes(2);
  });
});
