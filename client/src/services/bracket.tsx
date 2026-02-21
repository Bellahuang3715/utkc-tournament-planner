import { createAxios, handleRequestError } from "./adapter";
import { BracketCreatePayload, BracketWithPlayers } from "../interfaces/bracket";
import { DivisionPlayer } from "../interfaces/division";

type BracketUIPlayer = { id: string; name: string; club?: string | null };

export function toUIPlayers(b: BracketWithPlayers): BracketUIPlayer[] {
  // Ensure array length == num_players and positions line up with bracket_idx
  const arr: Array<BracketUIPlayer | null> = Array.from({ length: b.num_players }, () => null);

  for (const slot of b.players) {
    const idx = slot.bracket_idx;
    if (idx < 0 || idx >= b.num_players) continue;

    arr[idx] = {
      id: slot.code ?? String(slot.player_id),     // fallback if code missing
      name: slot.name ?? "",
      club: slot.club ?? null,
    };
  }

  // Your component probably expects a full array (no nulls). Fill blanks:
  return arr.map((p, i) => p ?? { id: `—`, name: `TBD`, club: null });
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
