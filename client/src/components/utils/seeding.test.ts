import { describe, expect, it } from "vitest";
import type { DivisionPlayer } from "../../interfaces/division";
import {
  MIN_BRACKET_SIZE,
  assignBrackets,
  getBracketSizeOptions,
  pickBracketSizes,
} from "./seeding";

function makePlayers(n: number): DivisionPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    club: i % 2 === 0 ? "TKC" : "UOT",
    code: `A${String(i + 1).padStart(2, "0")}`,
    bias: false,
  }));
}

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

describe("assignBrackets", () => {
  it("rejects under-min player counts", () => {
    expect(() => assignBrackets(makePlayers(4))).toThrow(/at least 5/i);
  });

  it("fills seats that sum to N for a single group", () => {
    const players = makePlayers(5);
    const groups = assignBrackets(players, [5]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.size).toBe(5);
    expect(groups[0]!.players.filter(Boolean)).toHaveLength(5);
  });

  it("respects an explicit multi-group size plan", () => {
    const players = makePlayers(10);
    const groups = assignBrackets(players, [5, 5]);
    expect(groups.map((g) => g.size)).toEqual([5, 5]);
    expect(groups.reduce((n, g) => n + g.players.length, 0)).toBe(10);
    const ids = groups.flatMap((g) => g.players.map((p) => p.id));
    expect(new Set(ids).size).toBe(10);
  });
});
