import { describe, expect, it } from "vitest";
import { circledScoreDisplay, tournamentMkdtScoreInput } from "./score_notation";

describe("tournamentMkdtScoreInput", () => {
  it("keeps allowed MKDT/H/I/- characters and uppercases", () => {
    expect(tournamentMkdtScoreInput("mk")).toBe("MK");
    expect(tournamentMkdtScoreInput("M-K")).toBe("M-K");
  });

  it("accepts circled and hansoku glyphs", () => {
    expect(tournamentMkdtScoreInput("Ⓜ")).toBe("M");
    expect(tournamentMkdtScoreInput("▲")).toBe("H");
  });

  it("collapses every pair of H into I", () => {
    expect(tournamentMkdtScoreInput("HH")).toBe("I");
    expect(tournamentMkdtScoreInput("HMH")).toBe("MI");
    expect(tournamentMkdtScoreInput("MHH")).toBe("MI");
  });

  it("strips invalid characters and caps length", () => {
    expect(tournamentMkdtScoreInput("MXK")).toBe("MK");
    expect(tournamentMkdtScoreInput("MKDTMKDTMK")).toHaveLength(8);
  });
});

describe("circledScoreDisplay", () => {
  it("circles the first M/K/D/T/I and shows H as triangle", () => {
    expect(circledScoreDisplay("MH")).toBe("Ⓜ ▲");
    expect(circledScoreDisplay("K-")).toBe("Ⓚ —");
  });

  it("collapses double H before display", () => {
    expect(circledScoreDisplay("HH")).toBe("Ⓘ");
  });
});
