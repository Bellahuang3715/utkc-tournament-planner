import type { BracketPlayerTemplateMap } from "./types";

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
