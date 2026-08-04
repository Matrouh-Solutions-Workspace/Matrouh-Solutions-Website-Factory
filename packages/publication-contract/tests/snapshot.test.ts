import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/index";
describe("canonicalize", () => {
  it("sorts object keys recursively", () => {
    expect(canonicalize({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}');
  });
});
