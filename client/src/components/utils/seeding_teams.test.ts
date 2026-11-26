import { describe, expect, it } from "vitest";
import {
  MIN_TEAM_BRACKET_SIZE,
  assignTeamBrackets,
  getTeamBracketSizeOptions,
  pickTeamBracketSizes,
} from "./seeding_teams";

describe("team seeding sizes", () => {
  it("requires at least MIN_TEAM_BRACKET_SIZE teams", () => {
    expect(MIN_TEAM_BRACKET_SIZE).toBe(5);
    expect(pickTeamBracketSizes(4)).toEqual([]);
    expect(getTeamBracketSizeOptions(4)).toEqual([]);
  });

  it("picks sizes that sum to N", () => {
    for (const n of [5, 8, 10, 16]) {
      const sizes = pickTeamBracketSizes(n);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(MIN_TEAM_BRACKET_SIZE);
    }
  });
});

describe("assignTeamBrackets", () => {
  it("rejects under-min team counts", () => {
    expect(() => assignTeamBrackets(["A", "B", "C", "D"])).toThrow(/at least 5/i);
  });

  it("fills groups for five teams", () => {
    const codes = ["TKC A", "TKC B", "UOT A", "UOT B", "JCC A"];
    const groups = assignTeamBrackets(codes, { seed: 1, sizes: [5] });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.size).toBe(5);
    expect(groups[0]!.teams).toHaveLength(5);
  });

  it("respects an explicit size plan", () => {
    const codes = Array.from({ length: 10 }, (_, i) => `CLUB ${String.fromCharCode(65 + i)}`);
    const groups = assignTeamBrackets(codes, {
      seed: 2,
      sizes: [5, 5],
      teamIds: codes.map((_, i) => i + 1),
    });
    expect(groups.map((g) => g.size)).toEqual([5, 5]);
    expect(groups.reduce((n, g) => n + g.teams.length, 0)).toBe(10);
  });
});
