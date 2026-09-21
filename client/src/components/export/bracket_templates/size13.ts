import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/13-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_13: BracketPlayerTemplateMap = {
  file: "13-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A2", score: "B2", name: "A4" },
      { id: "A6", score: "B6", name: "A8" },
      { id: "A11", score: "B11", name: "A13" },
      { id: "A15", score: "B15", name: "A17" },
      { id: "A20", score: "B20", name: "A22" },
      { id: "A24", score: "B24", name: "A26" },
      { id: "A30", score: "B30", name: "A32" },
      { id: "A34", score: "B34", name: "A36" },
      { id: "A40", score: "B40", name: "A42" },
      { id: "A44", score: "B44", name: "A46" },

      { id: "E26", score: "F26", name: "E28" },
      { id: "E36", score: "F36", name: "E38" },
      { id: "E46", score: "F46", name: "E48" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/13-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_13: BracketTeamTemplateMap = {
  file: "13-team.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { name: "A2" },
      { name: "A6" },
      { name: "A11" },
      { name: "A15" },
      { name: "A20" },
      { name: "A24" },
      { name: "A30" },
      { name: "A34" },
      { name: "A40" },
      { name: "A44" },
      { name: "D26" },
      { name: "D36" },
      { name: "D46" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
