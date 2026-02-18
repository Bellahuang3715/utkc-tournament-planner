export interface BracketPlayerSlot {
  player_id: number;
  bracket_idx: number;
}

export interface BracketCreatePayload {
  index: number;          // 0-based within the division
  num_players: number;    // size of the bracket
  title?: string | null;  // optional
  players: BracketPlayerSlot[];
}
