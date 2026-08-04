import { describe, expect, it } from "vitest";
import { contentSchema, definitionId, z } from "../src/index";

describe("template SDK primitives", () => {
  it("rejects display labels as definition identifiers", () => {
    expect(() => definitionId("Hero Section")).toThrowError(/Invalid definition id/);
  });
  it("returns stable JSON pointer issues", () => {
    const schema = contentSchema({ version: 1, schema: z.object({ title: z.string().min(1) }) });
    const result = schema.safeParse({ title: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]?.path).toBe("/title");
  });
});
