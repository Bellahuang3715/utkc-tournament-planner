import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/4-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_4: BracketPlayerTemplateMap = {
  file: "4-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A6", score: "B6", name: "A8" },
      { id: "A12", score: "B12", name: "A14" },
      { id: "A20", score: "B20", name: "A22" },
      { id: "A26", score: "B26", name: "A28" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/4-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_4: BracketTeamTemplateMap = {
  file: "4-team.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { name: "A6" },
      { name: "A12" },
      { name: "A20" },
      { name: "A26" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
