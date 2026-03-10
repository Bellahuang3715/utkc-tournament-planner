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
          ? (slot.participant_number ?? slot.code ?? "—")
          : (slot.participant_number ?? slot.code ?? String(slot.player_id));

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

function seededToBracketPayload(
  seeded: Array<{ group: number; size: number; players: DivisionPlayer[] }>,
): BracketCreatePayload[] {
  return seeded.map((g) => ({
    index: g.group,
    num_players: g.size,
    title: null,
    players: g.players.map((p, idx) => ({
      player_id: p.id,
      bracket_idx: idx,
    })),
  }));
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
