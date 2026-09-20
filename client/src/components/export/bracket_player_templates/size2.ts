import type { BracketPlayerTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/2-Player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_2: BracketPlayerTemplateMap = {
  file: "2-Player.xlsx",
  expanded: {
    sheet: "Full", openingSlots: [
      { id: "A5", score: "B5", name: "A7" },
      { id: "A19", score: "B19", name: "A21" },
    ]
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
