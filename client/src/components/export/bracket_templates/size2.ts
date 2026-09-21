import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/2-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_2: BracketPlayerTemplateMap = {
  file: "2-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A5", score: "B5", name: "A7" },
      { id: "A19", score: "B19", name: "A21" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/2-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_2: BracketTeamTemplateMap = {
  file: "2-team.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { name: "A5" },
      { name: "A19" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
