import { describe, expect, it } from "vitest";

import type { ScheduleBlock } from "../interfaces/schedule_timetable";
import {
  applyPlacementDurations,
  autoAssignDivisionBlocks,
  hasCourtCollision,
  placementDurationsOverlap,
} from "./schedule_timetable";

function at(hour: number, minute = 0) {
  return new Date(2026, 10, 27, hour, minute).toISOString();
}

describe("court collisions", () => {
  const warmup = { id: "warmup", courtId: 1, startTime: at(9), durationMins: 30 };

  it("rejects overlapping blocks only on the same court", () => {
    const candidate = { courtId: 1, startTime: at(9, 20), durationMins: 20 };
    expect(hasCourtCollision([warmup], candidate)).toBe(true);
    expect(hasCourtCollision([warmup], { ...candidate, courtId: 2 })).toBe(false);
  });

  it("allows back-to-back bookings and ignores the block being edited", () => {
    expect(
      hasCourtCollision([warmup], { courtId: 1, startTime: at(9, 30), durationMins: 10 }),
    ).toBe(false);
    expect(
      hasCourtCollision([warmup], { courtId: 1, startTime: at(8, 50), durationMins: 10 }),
    ).toBe(false);
    expect(hasCourtCollision([warmup], warmup, warmup.id)).toBe(false);
  });

  it("pushes subsequent bookings on the affected court when an edit creates a collision", () => {
    const following = { id: "group", courtId: 1, startTime: at(9, 30), durationMins: 20 };
    const later = { id: "final", courtId: 1, startTime: at(9, 50), durationMins: 10 };
    const otherCourt = { ...following, id: "other", courtId: 2 };
    const placements = [warmup, following, later, otherCourt];
    const durations = new Map([[warmup.id, 40]]);
    expect(placementDurationsOverlap(placements, durations)).toBe(true);
    const shifted = applyPlacementDurations(placements, durations, true);
    expect(shifted.map(({ startTime }) => startTime)).toEqual([
      at(9), at(9, 40), at(10), at(9, 30),
    ]);
    expect(shifted[0].durationMins).toBe(40);
    expect(placementDurationsOverlap(shifted, durations)).toBe(false);
    expect(placements[1].startTime).toBe(at(9, 30));
  });
});

describe("auto-assigning division groups", () => {
  const first: ScheduleBlock = {
    kind: "division",
    divisionId: 1,
    bracketId: 1,
    divisionName: "Individuals",
    bracketName: "Group 1",
    numPlayers: 5,
    minsPerPlayer: 5,
    estimatedMins: 20,
  };
  const second = { ...first, bracketId: 2, bracketName: "Group 2" };
  const options = {
    config: { startTime: "09:00", endTime: "09:30", intervalMins: 30 },
    scheduleDate: new Date(2026, 10, 27),
    blocks: [second, first],
  };

  it("fills the remaining space after a fixed booking and returns the group that does not fit", () => {
    const { assigned, unplaced } = autoAssignDivisionBlocks({
      ...options,
      courtIds: [1],
      fixedPlacements: [{ courtId: 1, startTime: at(9), durationMins: 10 }],
    });
    expect(assigned).toMatchObject([
      { bracketId: first.bracketId, courtId: 1, startTime: at(9, 10), durationMins: 20 },
    ]);
    expect(unplaced).toEqual([second]);
  });

  it("stages groups in the same division consecutively when the window permits", () => {
    const { assigned, unplaced } = autoAssignDivisionBlocks({
      ...options,
      config: { ...options.config, endTime: "09:40" },
      courtIds: [1, 2],
      fixedPlacements: [],
    });
    expect(assigned).toMatchObject([
      { bracketId: first.bracketId, courtId: 1, startTime: at(9) },
      { bracketId: second.bracketId, courtId: 1, startTime: at(9, 20) },
    ]);
    expect(unplaced).toEqual([]);
  });

  it("returns every group as unplaced when there are no courts", () => {
    expect(autoAssignDivisionBlocks({ ...options, courtIds: [], fixedPlacements: [] })).toEqual({
      assigned: [],
      unplaced: options.blocks,
    });
  });
});
