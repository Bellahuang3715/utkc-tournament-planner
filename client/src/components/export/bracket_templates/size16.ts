import type { BracketPlayerTemplateMap, BracketTeamTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/16-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_16: BracketPlayerTemplateMap = {
  file: "16-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A2", score: "B2", name: "A4" },
      { id: "A6", score: "B6", name: "A8" },
      { id: "A11", score: "B11", name: "A13" },
      { id: "A15", score: "B15", name: "A17" },
      { id: "A20", score: "B20", name: "A22" },
      { id: "A24", score: "B24", name: "A26" },
      { id: "A29", score: "B29", name: "A31" },
      { id: "A33", score: "B33", name: "A35" },
      { id: "A38", score: "B38", name: "A40" },
      { id: "A42", score: "B42", name: "A44" },
      { id: "A47", score: "B47", name: "A49" },
      { id: "A51", score: "B51", name: "A53" },
      { id: "A56", score: "B56", name: "A58" },
      { id: "A60", score: "B60", name: "A62" },
      { id: "A65", score: "B65", name: "A67" },
      { id: "A69", score: "B69", name: "A71" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};

/**
 * Cell maps for `public/templates/bracket_teams/16-team.xlsx`.
 * Teams only need `name` cells (no id/score).
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEAM_TEMPLATE_16: BracketTeamTemplateMap = {
  file: "16-team.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { name: "A2" },
      { name: "A6" },
      { name: "A11" },
      { name: "A15" },
      { name: "A20" },
      { name: "A24" },
      { name: "A29" },
      { name: "A33" },
      { name: "A38" },
      { name: "A42" },
      { name: "A47" },
      { name: "A51" },
      { name: "A56" },
      { name: "A60" },
      { name: "A65" },
      { name: "A69" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
