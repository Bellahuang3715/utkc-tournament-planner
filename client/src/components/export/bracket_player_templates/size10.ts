import type { BracketPlayerTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/10-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_10: BracketPlayerTemplateMap = {
  file: "10-player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A14", score: "B14", name: "A16" },
      { id: "A18", score: "B18", name: "A20" },
      { id: "A34", score: "B34", name: "A36" },
      { id: "A38", score: "B38", name: "A40" },
      { id: "E6", score: "F6", name: "E8" },
      { id: "E10", score: "F10", name: "E12" },
      { id: "E20", score: "F20", name: "E22" },
      { id: "E27", score: "F27", name: "E29" },
      { id: "E31", score: "F31", name: "E33" },
      { id: "E40", score: "F40", name: "E42" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
