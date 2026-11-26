import { describe, expect, it } from "vitest";
import {
  aggregateScoreStatuses,
  championSlotIndex,
  computeBracketScoreStatus,
  isDivisionScorekeepingStarted,
  payloadStartsScorekeeping,
} from "./score_status";

describe("championSlotIndex", () => {
  it("uses 2N-2 for expanded brackets", () => {
    expect(championSlotIndex(5)).toBe(8);
    expect(championSlotIndex(8)).toBe(14);
  });
});

describe("computeBracketScoreStatus", () => {
  it("returns not_started with empty cells", () => {
    expect(computeBracketScoreStatus(5, [])).toBe("not_started");
  });

  it("returns in_progress when a score is entered", () => {
    expect(
      computeBracketScoreStatus(5, [{ slot_idx: 0, player_id: 1, score: "M" }]),
    ).toBe("in_progress");
  });

  it("returns in_progress when a later-round advance is filled", () => {
    expect(
      computeBracketScoreStatus(5, [{ slot_idx: 5, player_id: 2 }]),
    ).toBe("in_progress");
  });

  it("returns completed when the champion slot is filled", () => {
    expect(
      computeBracketScoreStatus(5, [{ slot_idx: 8, player_id: 3 }]),
    ).toBe("completed");
  });
});

describe("isDivisionScorekeepingStarted", () => {
  it("is true when any bracket has started", () => {
    expect(
      isDivisionScorekeepingStarted(
        [{ id: 1, num_players: 5 }],
        { 1: [{ slot_idx: 0, score: "K" }] },
      ),
    ).toBe(true);
  });

  it("is false when no bracket has started", () => {
    expect(
      isDivisionScorekeepingStarted([{ id: 1, num_players: 5 }], { 1: [] }),
    ).toBe(false);
  });
});

describe("payloadStartsScorekeeping", () => {
  it("detects a payload that would start scorekeeping", () => {
    expect(
      payloadStartsScorekeeping(
        [{ bracket_id: 1, cells: [{ slot_idx: 0, score: "M" }] }],
        [{ id: 1, num_players: 5 }],
      ),
    ).toBe(true);
  });

  it("is false for empty payload cells", () => {
    expect(
      payloadStartsScorekeeping(
        [{ bracket_id: 1, cells: [{ slot_idx: 0, player_id: 1, score: "" }] }],
        [{ id: 1, num_players: 5 }],
      ),
    ).toBe(false);
  });
});

describe("aggregateScoreStatuses", () => {
  it("rolls up group statuses", () => {
    expect(aggregateScoreStatuses([])).toBe("not_started");
    expect(aggregateScoreStatuses(["not_started", "not_started"])).toBe(
      "not_started",
    );
    expect(aggregateScoreStatuses(["completed", "completed"])).toBe("completed");
    expect(aggregateScoreStatuses(["not_started", "completed"])).toBe(
      "in_progress",
    );
  });
});
