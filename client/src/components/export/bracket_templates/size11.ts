import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/11-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_11: BracketPlayerTemplateMap = {
  file: "11-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A4", score: "B4", name: "A6" },
      { id: "A8", score: "B8", name: "A10" },
      { id: "A14", score: "B14", name: "A16" },
      { id: "A18", score: "B18", name: "A20" },
      { id: "A25", score: "B25", name: "A27" },
      { id: "A29", score: "B29", name: "A31" },
      { id: "E10", score: "F10", name: "E12" },
      { id: "E20", score: "F20", name: "E22" },
      { id: "E31", score: "F31", name: "E33" },
      { id: "E36", score: "F36", name: "E38" },
      { id: "E40", score: "F40", name: "E42" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/11-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_11: BracketTeamTemplateMap = {
  file: "11-team.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { name: "A4" },
      { name: "A8" },
      { name: "A14" },
      { name: "A18" },
      { name: "A25" },
      { name: "A29" },
      { name: "D10" },
      { name: "D20" },
      { name: "D31" },
      { name: "D36" },
      { name: "D40" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
