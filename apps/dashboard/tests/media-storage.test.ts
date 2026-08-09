import { describe, expect, it } from "vitest";
import { dashboardMediaPath, mediaStorageKey } from "../src/server/media-storage";

describe("media storage keys", () => {
  it("keeps duplicate file contents unique per media asset", () => {
    const common = {
      organizationId: "00000000-0000-4000-8000-000000000001",
      contentHash: "abc123",
      extension: "png",
    };

    const first = mediaStorageKey({ ...common, assetId: "asset-one" });
    const second = mediaStorageKey({ ...common, assetId: "asset-two" });

    expect(first).toBe("media/00000000-0000-4000-8000-000000000001/abc123-asset-one.png");
    expect(second).not.toBe(first);
  });

  it("serves editor previews through the dashboard before a website domain is active", () => {
    expect(dashboardMediaPath("00000000-0000-4000-8000-000000000001")).toBe(
      "/dashboard/api/media/00000000-0000-4000-8000-000000000001",
    );
  });
});
