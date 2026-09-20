import type { BracketPlayerTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/4-Player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_4: BracketPlayerTemplateMap = {
  file: "4-Player.xlsx",
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
