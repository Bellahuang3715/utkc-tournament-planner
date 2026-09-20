import type { BracketPlayerTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/5-Player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_5: BracketPlayerTemplateMap = {
  file: "5-Player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A4", score: "B4", name: "A6" },
      { id: "A8", score: "B8", name: "A10" },
      { id: "E16", score: "F16", name: "E18" },
      { id: "E20", score: "F20", name: "E22" },
      { id: "E10", score: "F10", name: "E12" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
