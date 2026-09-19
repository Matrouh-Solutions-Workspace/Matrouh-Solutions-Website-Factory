import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageNumbers } from "../src/app/numbered-pagination";

describe("numbered pagination", () => {
  it("limits each page to five items", () => {
    expect(PAGE_SIZE).toBe(5);
  });

  it("shows no more than five consecutive page numbers", () => {
    expect(pageNumbers(1, 0)).toEqual([]);
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(7, 12)).toEqual([5, 6, 7, 8, 9]);
    expect(pageNumbers(12, 12)).toEqual([8, 9, 10, 11, 12]);
  });
});
