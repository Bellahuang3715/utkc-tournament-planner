import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/14-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_14: BracketPlayerTemplateMap = {
  file: "14-player.xlsx",
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
      { id: "A39", score: "B39", name: "A41" },
      { id: "A43", score: "B43", name: "A45" },
      { id: "A48", score: "B48", name: "A50" },
      { id: "A52", score: "B52", name: "A54" },

      { id: "E26", score: "F26", name: "E28" },
      { id: "E54", score: "F54", name: "E56" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/14-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_14: BracketTeamTemplateMap = {
  file: "14-team.xlsx",
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
      { name: "A39" },
      { name: "A43" },
      { name: "A48" },
      { name: "A52" },
      { name: "D26" },
      { name: "D54" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
