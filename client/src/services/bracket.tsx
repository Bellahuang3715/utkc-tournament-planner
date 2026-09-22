import { createAxios, handleRequestError } from "./adapter";
import {
  BracketCreatePayload,
  BracketWithPlayers,
  BracketWithTeams,
  BracketTeamsCreatePayload,
} from "../interfaces/bracket";
import { DivisionPlayer } from "../interfaces/division";
import type { TeamBracketGroup } from "../components/utils/seeding_teams";

type BracketUIPlayer = { id: string; name: string; club?: string | null };
export type BracketUITeam = { id: string; name: string };

/** Slot shape for tournament-brackets-ui Expanded.Teams (fillable / advances). */
export type BracketUITeamSlot = {
  id: string;
  noShow?: boolean;
};

/**
 * tournament-brackets-ui (CollapsedLeft/Right 12-person) uses a non-sequential index mapping.
 * Our bracket_idx 0..11 must be reordered to match the component's expected visual order.
 * Derived from component's usage: indices [0,1,8,2,3,4,9,5,6,7,10,11].
 */
const BRACKET_12_REORDER: number[] = [0, 1, 8, 2, 3, 4, 9, 5, 6, 7, 10, 11];

function reorderForBracketComponent<T>(arr: T[], size: number): T[] {
  if (size === 12 && arr.length === 12 && BRACKET_12_REORDER.length === 12) {
    return BRACKET_12_REORDER.map((i) => arr[i]);
  }
  return arr;
}

export function toUIPlayers(
  b: BracketWithPlayers,
  useCodeOnly?: boolean,
  playerIdToDisplayCode?: Record<number, string>
): BracketUIPlayer[] {
  // Ensure array length == num_players and positions line up with bracket_idx
  const arr: Array<BracketUIPlayer | null> = Array.from({ length: b.num_players }, () => null);

  for (const slot of b.players) {
    const idx = slot.bracket_idx;
    if (idx < 0 || idx >= b.num_players) continue;

    const displayId =
      useCodeOnly && playerIdToDisplayCode
        ? (playerIdToDisplayCode[slot.player_id] ?? "—")
        : useCodeOnly
          ? (slot.code ?? slot.participant_number ?? "—")
          : (slot.code ?? slot.participant_number ?? String(slot.player_id));

    arr[idx] = {
      id: displayId,
      name: slot.name ?? "",
      club: slot.club ?? null,
    };
  }

  // Fill blanks, then reorder to match tournament-brackets-ui layout (e.g. 12-person has non-sequential indices)
  const filled = arr.map((p, i) => p ?? { id: `—`, name: `TBD`, club: null });
  return reorderForBracketComponent(filled, b.num_players);
}

/** Like toUIPlayers but replaces club name with abbreviation when map is provided. */
export function toUIPlayersWithClubAbbrev(
  b: BracketWithPlayers,
  clubAbbrevByName: Map<string, string>,
  useCodeOnly?: boolean,
  playerIdToDisplayCode?: Record<number, string>
): BracketUIPlayer[] {
  return toUIPlayers(b, useCodeOnly, playerIdToDisplayCode).map((p) => ({
    ...p,
    club: p.club ? (clubAbbrevByName.get(p.club) ?? p.club) : p.club,
  }));
}

export function toUITeams(b: BracketWithTeams): BracketUITeam[] {
  const arr: Array<{ id: string; name: string } | null> = Array.from(
    { length: b.num_players },
    () => null
  );
  for (const slot of b.teams ?? []) {
    const idx = slot.bracket_idx;
    if (idx < 0 || idx >= b.num_players) continue;
    arr[idx] = {
      id: String(slot.team_id),
      name: slot.name ?? "",
    };
  }
  return arr.map((p) => p ?? { id: "—", name: "TBD" });
}

/** Team names in bracket order for tournament-brackets-ui (expects string[], not objects). */
export function toUITeamNames(b: BracketWithTeams): string[] {
  return toUITeams(b).map((t) => t.name);
}

/** Opening team slots as `{ id }` objects (display code) for fillable Expanded.Teams. */
export function toUITeamSlots(b: BracketWithTeams): BracketUITeamSlot[] {
  return toUITeamNames(b).map((name) => ({
    id: name === "TBD" || name === "—" ? "" : name,
  }));
}

function seededToBracketPayload(
  seeded: Array<{ group: number; size: number; players: DivisionPlayer[] }>,
): BracketCreatePayload[] {
  return seeded.map((g) => {
    const players = g.players
      .map((p, idx) => {
        const id = Number(p.id);
        if (!Number.isFinite(id)) return null;
        return { player_id: id, bracket_idx: idx };
      })
      .filter((s): s is { player_id: number; bracket_idx: number } => s != null);
    return {
      index: Number(g.group),
      num_players: Number(g.size),
      title: null,
      players,
    };
  });
}

export async function postDivisionBrackets(
  division_id: number,
  seeded: Array<{ group: number; size: number; players: DivisionPlayer[] }>,
  replace: boolean = true
) {
  try {
    const brackets = seededToBracketPayload(seeded);
    const axios = await createAxios();
    return await axios.post(
      `divisions/${division_id}/brackets`,
      { brackets },
      { params: { replace } }
    );
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function fetchDivisionBrackets(division_id: number) {
  const axios = await createAxios();
  return axios.get(`divisions/${division_id}/brackets`);
}

export async function fetchDivisionBracketsWithPlayers(division_id: number) {
  const axios = await createAxios();
  return axios.get(`divisions/${division_id}/brackets/with-players`);
}

export async function fetchDivisionBracketsWithTeams(division_id: number) {
  const axios = await createAxios();
  return axios.get(`divisions/${division_id}/brackets/with-teams`);
}

function seededTeamsToBracketPayload(
  seeded: TeamBracketGroup[]
): BracketTeamsCreatePayload[] {
  return seeded.map((g) => ({
    index: g.group,
    num_players: g.size,
    title: null,
    teams: g.teams
      .filter((t) => t.id != null)
      .map((t, idx) => ({ team_id: t.id!, bracket_idx: idx })),
  }));
}

export async function postDivisionBracketsTeams(
  division_id: number,
  seeded: TeamBracketGroup[],
  replace: boolean = true
) {
  try {
    const brackets = seededTeamsToBracketPayload(seeded);
    const axios = await createAxios();
    return await axios.post(
      `divisions/${division_id}/brackets/teams`,
      { brackets },
      { params: { replace } }
    );
  } catch (err: any) {
    return handleRequestError(err);
  }
}

/** Build payload from current BracketWithTeams[] (e.g. from editor state) and POST to replace. */
export async function replaceDivisionBracketsTeams(
  division_id: number,
  brackets: BracketWithTeams[]
) {
  try {
    const payload = {
      brackets: brackets
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((b) => ({
          index: b.index,
          num_players: b.num_players,
          title: b.title ?? null,
          teams: (b.teams ?? [])
            .slice()
            .sort((x, y) => x.bracket_idx - y.bracket_idx)
            .map((t) => ({ team_id: t.team_id, bracket_idx: t.bracket_idx })),
        })),
    };
    const axios = await createAxios();
    return await axios.post(
      `divisions/${division_id}/brackets/teams`,
      payload,
      { params: { replace: true } }
    );
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function updateBracketTitle(bracketId: number, title: string | null) {
  const res = await fetch(`/api/brackets/${bracketId}/title`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to update title: ${res.status}`);
  return res.json();
}

export function toCreatePayload(brackets: BracketWithPlayers[]): BracketCreatePayload[] {
  return brackets
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((b) => ({
      index: b.index,
      num_players: b.num_players,
      title: b.title ?? null,
      players: (b.players ?? [])
        .slice()
        .sort((x, y) => x.bracket_idx - y.bracket_idx)
        .map((p) => ({
          player_id: Number(p.player_id),
          bracket_idx: Number(p.bracket_idx),
        })),
    }));
}

export async function replaceDivisionBrackets(
  division_id: number,
  brackets: BracketWithPlayers[],
) {
  try {
    const axios = await createAxios();
    const payload = { brackets: toCreatePayload(brackets) };

    // IMPORTANT: replace=true
    return await axios.post(`divisions/${division_id}/brackets?replace=true`, payload);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export type BracketCell = {
  id?: number;
  bracket_id: number;
  slot_idx: number;
  player_id: number | null;
  score: string;
  name?: string | null;
  club?: string | null;
  code?: string | null;
};

/** Team advance cells (no score column). */
export type TeamBracketCell = {
  id?: number;
  bracket_id: number;
  slot_idx: number;
  team_id: number | null;
  code?: string | null;
  name?: string | null;
  club?: string | null;
};

export type BracketUIPlayerSlot = {
  id: string;
  name: string;
  club?: string | null;
  score?: string;
  noShow?: boolean;
};

/** Map display code / numeric id string → player_id for saving cells. */
export function buildPlayerIdResolver(brackets: BracketWithPlayers[]) {
  const byCode = new Map<string, number>();
  const byNumericId = new Map<string, number>();
  for (const b of brackets) {
    for (const slot of b.players ?? []) {
      byNumericId.set(String(slot.player_id), slot.player_id);
      if (slot.code) byCode.set(slot.code, slot.player_id);
      if (slot.participant_number) byCode.set(slot.participant_number, slot.player_id);
    }
  }
  return (displayId: string | undefined | null): number | null => {
    const raw = (displayId ?? "").trim();
    if (!raw || raw === "—" || raw === "TBD") return null;
    if (byNumericId.has(raw)) return byNumericId.get(raw)!;
    if (byCode.has(raw)) return byCode.get(raw)!;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
}

export function uiPlayersToBracketCells(
  players: BracketUIPlayerSlot[],
  resolvePlayerId: (displayId: string | undefined | null) => number | null,
) {
  return players.map((p, slot_idx) => ({
    slot_idx,
    player_id: resolvePlayerId(p.id),
    score: p.score ?? "",
  }));
}

/** Map display team code / numeric id string → team_id for saving cells. */
export function buildTeamIdResolver(brackets: BracketWithTeams[]) {
  const byCode = new Map<string, number>();
  const byNumericId = new Map<string, number>();
  for (const b of brackets) {
    for (const slot of b.teams ?? []) {
      byNumericId.set(String(slot.team_id), slot.team_id);
      if (slot.name) byCode.set(slot.name, slot.team_id);
    }
  }
  return (displayId: string | undefined | null): number | null => {
    const raw = (displayId ?? "").trim();
    if (!raw || raw === "—" || raw === "TBD") return null;
    if (byNumericId.has(raw)) return byNumericId.get(raw)!;
    if (byCode.has(raw)) return byCode.get(raw)!;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
}

export function uiTeamsToBracketCells(
  teams: BracketUITeamSlot[],
  resolveTeamId: (displayId: string | undefined | null) => number | null,
) {
  return teams.map((t, slot_idx) => ({
    slot_idx,
    team_id: resolveTeamId(t.id),
  }));
}

export async function fetchDivisionBracketCells(division_id: number) {
  const axios = await createAxios();
  return axios.get(`divisions/${division_id}/bracket-cells`);
}

export async function putDivisionBracketCells(
  division_id: number,
  brackets: {
    bracket_id: number;
    cells: {
      slot_idx: number;
      player_id: number | null;
      score: string;
    }[];
  }[],
) {
  try {
    const axios = await createAxios();
    return await axios.put(`divisions/${division_id}/bracket-cells`, { brackets });
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function fetchDivisionTeamBracketCells(division_id: number) {
  const axios = await createAxios();
  return axios.get(`divisions/${division_id}/team-bracket-cells`);
}

export async function putDivisionTeamBracketCells(
  division_id: number,
  brackets: {
    bracket_id: number;
    cells: {
      slot_idx: number;
      team_id: number | null;
    }[];
  }[],
) {
  try {
    const axios = await createAxios();
    return await axios.put(`divisions/${division_id}/team-bracket-cells`, {
      brackets,
    });
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function fetchDivisionLock(division_id: number) {
  const axios = await createAxios();
  return axios.get<{ data: { locked: boolean } }>(`divisions/${division_id}/lock`);
}

/** Clear all recorded scores for the division (unlocks roster/seeding). */
export async function clearDivisionBracketCells(division_id: number) {
  try {
    const axios = await createAxios();
    return await axios.delete(`divisions/${division_id}/bracket-cells`);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export const FINALS_BRACKET_TITLE = "Finals";

export function isFinalsBracket(b: { title?: string | null }) {
  return (b.title ?? "") === FINALS_BRACKET_TITLE;
}

/** Ensure a division Finals bracket exists; returns `{ data: Bracket }`. */
export async function ensureFinalsBracket(division_id: number, num_players: number) {
  try {
    const axios = await createAxios();
    return await axios.post(
      `divisions/${division_id}/brackets/finals`,
      null,
      { params: { num_players } },
    );
  } catch (err: any) {
    return handleRequestError(err);
  }
}

/** Merge saved cells into an Expanded players[] array (opening size + later slots). */
export function mergeCellsIntoUiPlayers(
  openingPlayers: BracketUIPlayerSlot[],
  cells: BracketCell[],
  clubAbbrevByName?: Map<string, string>,
): BracketUIPlayerSlot[] {
  const maxIdx = cells.reduce((m, c) => Math.max(m, c.slot_idx), openingPlayers.length - 1);
  const len = Math.max(openingPlayers.length, maxIdx + 1);
  const out: BracketUIPlayerSlot[] = Array.from({ length: len }, (_, i) => {
    const base = openingPlayers[i];
    return base
      ? { ...base, score: base.score ?? "" }
      : { id: "", name: "", club: null, score: "" };
  });

  for (const cell of cells) {
    const clubName = cell.club ?? null;
    const club =
      clubName && clubAbbrevByName
        ? clubAbbrevByName.get(clubName) ?? clubName
        : clubName;
    const displayId =
      cell.code ??
      (cell.player_id != null ? String(cell.player_id) : "");
    const existing = out[cell.slot_idx];
    // Prefer preserving seeded opening identity; always apply saved score / fill blanks.
    if (existing && (existing.id || existing.name)) {
      out[cell.slot_idx] = {
        ...existing,
        id: existing.id || displayId,
        name: existing.name || (cell.name ?? ""),
        club: existing.club || club,
        score: cell.score ?? existing.score ?? "",
      };
    } else {
      out[cell.slot_idx] = {
        id: displayId,
        name: cell.name ?? "",
        club,
        score: cell.score ?? "",
      };
    }
  }
  return out;
}

/** Merge saved cells into an Expanded teams[] array (opening size + later slots). */
export function mergeCellsIntoUiTeams(
  openingTeams: BracketUITeamSlot[],
  cells: TeamBracketCell[],
): BracketUITeamSlot[] {
  const maxIdx = cells.reduce((m, c) => Math.max(m, c.slot_idx), openingTeams.length - 1);
  const len = Math.max(openingTeams.length, maxIdx + 1);
  const out: BracketUITeamSlot[] = Array.from({ length: len }, (_, i) => {
    const base = openingTeams[i];
    return base ? { ...base } : { id: "" };
  });

  for (const cell of cells) {
    const displayId =
      cell.code ??
      (cell.team_id != null ? String(cell.team_id) : "");
    const existing = out[cell.slot_idx];
    if (existing && existing.id) {
      out[cell.slot_idx] = {
        ...existing,
        id: existing.id || displayId,
      };
    } else {
      out[cell.slot_idx] = { id: displayId };
    }
  }
  return out;
}
