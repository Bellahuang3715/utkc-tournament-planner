import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/6-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_6: BracketPlayerTemplateMap = {
  file: "6-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A4", score: "B4", name: "A6" },
      { id: "A8", score: "B8", name: "A10" },
      { id: "A14", score: "B14", name: "A16" },
      { id: "A18", score: "B18", name: "A20" },
      { id: "E10", score: "F10", name: "E12" },
      { id: "E20", score: "F20", name: "E22" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/6-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_6: BracketTeamTemplateMap = {
  file: "6-team.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { name: "A4" },
      { name: "A8" },
      { name: "A14" },
      { name: "A18" },
      { name: "D10" },
      { name: "D20" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
