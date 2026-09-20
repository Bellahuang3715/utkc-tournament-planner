import type { BracketPlayerTemplateMap } from "./types";

/**
 * Cell maps for `public/templates/bracket_players/8-player.xlsx`.
 * Collapsed: odd groups → Left, even groups → Right.
 */
export const BRACKET_TEMPLATE_8: BracketPlayerTemplateMap = {
  file: "8-player.xlsx",
  expanded: {
    sheet: "Full",
    openingSlots: [
      { id: "A4", score: "B4", name: "A6" },
      { id: "A8", score: "B8", name: "A10" },
      { id: "A13", score: "B13", name: "A15" },
      { id: "A17", score: "B17", name: "A19" },
      { id: "A22", score: "B22", name: "A24" },
      { id: "A26", score: "B26", name: "A28" },
      { id: "A31", score: "B31", name: "A33" },
      { id: "A35", score: "B35", name: "A37" },
    ],
  },
  // TODO: fill Left/Right cell maps
  collapsedLeft: { sheet: "Left", openingSlots: [] },
  collapsedRight: { sheet: "Right", openingSlots: [] },
};
