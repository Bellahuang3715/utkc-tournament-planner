import { describe, expect, it } from "vitest";
import { toUIPlayers } from "./bracket";
import type { BracketWithPlayers } from "../interfaces/bracket";

function makeBracket(
  players: Array<{
    player_id: number;
    bracket_idx: number;
    name?: string;
    club?: string | null;
    code?: string | null;
    participant_number?: string | null;
  }>,
  num_players = players.length,
): BracketWithPlayers {
  return {
    id: 1,
    index: 1,
    division_id: 1,
    num_players,
    title: "Group 1",
    players: players.map((p) => ({
      player_id: p.player_id,
      bracket_idx: p.bracket_idx,
      name: p.name ?? `Player ${p.player_id}`,
      club: p.club ?? null,
      code: p.code ?? null,
      participant_number: p.participant_number ?? null,
    })),
  } as BracketWithPlayers;
}

describe("toUIPlayers display ids", () => {
  it("uses player code when present", () => {
    const ui = toUIPlayers(
      makeBracket([
        {
          player_id: 10,
          bracket_idx: 0,
          code: "A01",
          participant_number: "99",
        },
      ]),
    );
    expect(ui[0]?.id).toBe("A01");
  });

  it("leaves id blank when code is missing (no participant_number / player_id fallback)", () => {
    const ui = toUIPlayers(
      makeBracket([
        {
          player_id: 10,
          bracket_idx: 0,
          name: "Ada",
          code: null,
          participant_number: "77",
        },
      ]),
    );
    expect(ui[0]?.id).toBe("");
    expect(ui[0]?.name).toBe("Ada");
  });

  it("keeps TBD placeholders for empty seats", () => {
    const ui = toUIPlayers(
      makeBracket(
        [{ player_id: 1, bracket_idx: 0, code: "A01" }],
        2,
      ),
    );
    expect(ui[1]?.id).toBe("—");
    expect(ui[1]?.name).toBe("TBD");
  });
});
