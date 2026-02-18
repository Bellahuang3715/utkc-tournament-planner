import { createAxios, handleRequestError } from "./adapter";
import { BracketCreatePayload } from "../interfaces/bracket";
import { DivisionPlayer } from "../interfaces/division";

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
