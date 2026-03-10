export type ViewMode = "booklet" | "poster";

export interface BracketPlayerSlot {
  player_id: number;
  bracket_idx: number;
  name?: string | null;
  club?: string | null;
  code?: string | null;
  /** From players.data.participant_number; used as display ID in Division B. */
  participant_number?: string | null;
}

export interface BracketCreatePayload {
  index: number;          // 0-based within the division
  num_players: number;    // size of the bracket
  title?: string | null;  // optional
  players: BracketPlayerSlot[];
}

export type BracketWithPlayers = {
  id: number;
  index: number;         // group number (1-based in your payloads)
  division_id: number;
  num_players: number;   // size
  title?: string | null;
  players: BracketPlayerSlot[];
};

export interface BracketTeamSlot {
  team_id: number;
  bracket_idx: number;
  name?: string | null;
}

export type BracketWithTeams = {
  id: number;
  index: number;
  division_id: number;
  num_players: number;
  title?: string | null;
  teams: BracketTeamSlot[];
};

export interface BracketTeamsCreatePayload {
  index: number;
  num_players: number;
  title?: string | null;
  teams: { team_id: number; bracket_idx: number }[];
}
