import { describe, expect, it } from "vitest";
import {
  MIN_BRACKET_SIZE,
  getBracketSizeOptions,
  pickBracketSizes,
} from "./seeding";

describe("individual seeding sizes", () => {
  it("requires at least MIN_BRACKET_SIZE players", () => {
    expect(MIN_BRACKET_SIZE).toBe(5);
    expect(pickBracketSizes(4)).toEqual([]);
    expect(getBracketSizeOptions(4)).toEqual([]);
  });

  it("picks a single group of 5 for five players", () => {
    expect(pickBracketSizes(5)).toEqual([5]);
    const options = getBracketSizeOptions(5);
    expect(options.some((o) => o.length === 1 && o[0] === 5)).toBe(true);
  });

  it("returns power-of-two group counts that sum to N", () => {
    for (const n of [8, 12, 16, 20, 32]) {
      const sizes = pickBracketSizes(n);
      expect(sizes.length === 0 || (sizes.length & (sizes.length - 1)) === 0).toBe(
        true,
      );
      if (sizes.length) {
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(MIN_BRACKET_SIZE);
      }
      for (const option of getBracketSizeOptions(n)) {
        expect(option.reduce((a, b) => a + b, 0)).toBe(n);
        expect((option.length & (option.length - 1)) === 0).toBe(true);
      }
    }
  });
});
