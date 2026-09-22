/** Scoring progress for a bracket group or whole division. */
export type ScoreStatus = "not_started" | "in_progress" | "completed";

export type ScoreStatusCell = {
  slot_idx: number;
  player_id?: number | null;
  team_id?: number | null;
  score?: string | null;
};

export type ScoreStatusBracket = {
  id: number;
  num_players: number;
};

/** Expanded bracket has `2 * numPlayers - 1` slots; champion is the last. */
export function championSlotIndex(numPlayers: number): number {
  return Math.max(0, 2 * numPlayers - 2);
}

function cellHasEntity(c: ScoreStatusCell): boolean {
  return c.player_id != null || c.team_id != null;
}

/**
 * Derive group status from saved bracket cells.
 * - completed: champion slot has a player/team (final winner picked)
 * - in_progress: any score entered, or any later-round advance filled
 * - not_started: otherwise
 */
export function computeBracketScoreStatus(
  numPlayers: number,
  cells: ScoreStatusCell[],
): ScoreStatus {
  if (!Number.isFinite(numPlayers) || numPlayers < 2) return "not_started";

  const champIdx = championSlotIndex(numPlayers);
  const hasChampion = cells.some(
    (c) => c.slot_idx === champIdx && cellHasEntity(c),
  );
  if (hasChampion) return "completed";

  const hasScore = cells.some((c) => (c.score ?? "").trim().length > 0);
  const hasAdvance = cells.some(
    (c) => c.slot_idx >= numPlayers && cellHasEntity(c),
  );
  if (hasScore || hasAdvance) return "in_progress";
  return "not_started";
}

/** True when any score is entered or a later-round player/team is filled. */
export function isBracketScorekeepingStarted(
  numPlayers: number,
  cells: ScoreStatusCell[],
): boolean {
  return computeBracketScoreStatus(numPlayers, cells) !== "not_started";
}

export function isDivisionScorekeepingStarted(
  brackets: ScoreStatusBracket[],
  cellsByBracket: Record<number, ScoreStatusCell[]> | Map<number, ScoreStatusCell[]>,
): boolean {
  const getCells = (id: number): ScoreStatusCell[] => {
    if (cellsByBracket instanceof Map) return cellsByBracket.get(id) ?? [];
    return cellsByBracket[id] ?? [];
  };
  return brackets.some((b) =>
    isBracketScorekeepingStarted(b.num_players, getCells(b.id)),
  );
}

/** True when an outgoing save payload would start scorekeeping for any bracket. */
export function payloadStartsScorekeeping(
  payload: Array<{
    bracket_id: number;
    cells: ScoreStatusCell[];
  }>,
  brackets: ScoreStatusBracket[],
): boolean {
  const numPlayersById = new Map(brackets.map((b) => [b.id, b.num_players]));
  return payload.some((item) => {
    const numPlayers = numPlayersById.get(item.bracket_id);
    if (numPlayers == null) {
      // Unknown bracket (e.g. newly created finals) — any score or filled entity starts.
      return item.cells.some(
        (c) => (c.score ?? "").trim().length > 0 || cellHasEntity(c),
      );
    }
    return isBracketScorekeepingStarted(numPlayers, item.cells);
  });
}

/** Roll up group statuses into a division-level status. */
export function aggregateScoreStatuses(statuses: ScoreStatus[]): ScoreStatus {
  if (statuses.length === 0) return "not_started";
  if (statuses.every((s) => s === "completed")) return "completed";
  if (statuses.every((s) => s === "not_started")) return "not_started";
  return "in_progress";
}

export const SCORE_STATUS_LABEL: Record<ScoreStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export const SCORE_STATUS_COLOR: Record<ScoreStatus, string> = {
  not_started: "gray",
  in_progress: "yellow",
  completed: "green",
};
