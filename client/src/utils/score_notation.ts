/** Circled M/K/D/T/I for score display. */
const CIRCLED = { M: "Ⓜ", K: "Ⓚ", D: "Ⓓ", T: "Ⓣ", I: "Ⓘ" } as const;

const RAW: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CIRCLED).map(([k, v]) => [v, k])),
  "▲": "H",
  "—": "-",
  "–": "-",
};

const ALLOWED = new Set(["M", "K", "D", "T", "H", "I", "-"]);

/**
 * Every two H's in the same cell (not necessarily consecutive) become one I.
 * The first H of each pair is removed; the second becomes I.
 * e.g. HMH → MI, MHH → MI, HH → I
 */
function collapseDoubleHansoku(score: string): string {
  const chars = Array.from(score);
  const hIndexes = chars
    .map((ch, i) => (ch === "H" ? i : -1))
    .filter((i) => i >= 0);

  const remove = new Set<number>();
  const insertI = new Set<number>();
  for (let p = 0; p + 1 < hIndexes.length; p += 2) {
    remove.add(hIndexes[p]);
    insertI.add(hIndexes[p + 1]);
    remove.add(hIndexes[p + 1]);
  }

  return chars
    .map((ch, i) => {
      if (insertI.has(i)) return "I";
      if (remove.has(i)) return "";
      return ch;
    })
    .join("");
}

function normalizeChar(ch: string): string {
  if (RAW[ch]) return RAW[ch];
  if (ch === "-") return "-";
  return ch.toUpperCase();
}

/** M/K/D/T/I → circled, H → ▲ — pass as `formatScoreDisplay`. */
export function circledScoreDisplay(score: string) {
  const s = collapseDoubleHansoku(score || "");
  if (!s) return "";
  return Array.from(s)
    .map((ch, i) => {
      if (ch === "H") return "▲";
      if (ch === "-") return "—";
      if (i === 0 && ch in CIRCLED) return CIRCLED[ch as keyof typeof CIRCLED];
      return ch;
    })
    .join(" ");
}

/** Allow M/K/D/T/H/I/`-` (circled + ▲ accepted); any two H → I — `scoreInputTransform`. */
export function tournamentMkdtScoreInput(input = "") {
  const noSpaces = String(input).replace(/\s+/g, "");
  let first = "";
  if (noSpaces) {
    const c0 = normalizeChar(noSpaces[0]);
    first = ALLOWED.has(c0) ? c0 : "";
  }
  const rest = Array.from(noSpaces.slice(1))
    .map(normalizeChar)
    .filter((ch) => ALLOWED.has(ch))
    .join("");
  return collapseDoubleHansoku(first + rest);
}
