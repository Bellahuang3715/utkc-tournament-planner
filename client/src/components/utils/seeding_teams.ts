/**
 * Team bracket seeding: spread same-club / same-tier teams apart.
 * Team codes: "ClubId Letter" e.g. "JCC A", "JCC B". A = strongest, then B, C, ...
 * Bracket sizes: 6–16 (excluding 15). A teams get priority for bye spots. Some randomness.
 */

// ---- Types ----
export interface TeamSeedEntry {
  code: string;
  id?: number;
  /** Strong team: spread across brackets and get bye priority (like A teams). */
  bias?: boolean;
}

export interface TeamBracketGroup {
  group: number;
  size: number;
  teams: TeamSeedEntry[];
}

export interface ParsedTeam {
  code: string;
  id?: number;
  clubId: string;
  tier: string; // "A", "B", "C", ...
  tierRank: number; // 0 = A, 1 = B, ... (lower = stronger, gets bye priority)
  bias?: boolean; // strong team: spread + bye priority
}

// ---- Config (teams: 6–16 excluding 15) ----
const ALLOWED_SIZES = [6, 7, 8, 9, 10, 11, 12, 13, 14, 16] as const;
const MIN = ALLOWED_SIZES[0];
const MAX = ALLOWED_SIZES[ALLOWED_SIZES.length - 1];

export const BRACKET_BYES_TEAMS: Record<number, number> = {
  6: 2,
  7: 1,
  8: 0,
  9: 1,
  10: 6,
  11: 5,
  12: 4,
  13: 3,
  14: 2,
  16: 0,
};

const BALANCE_SPREAD = 3;

function enumerateTuples(
  k: number,
  target: number,
  candidates: number[]
): number[][] {
  if (k === 1) return candidates.includes(target) ? [[target]] : [];
  const result: number[][] = [];
  for (const c of candidates) {
    if (c > target) continue;
    const rest = enumerateTuples(k - 1, target - c, candidates);
    for (const r of rest) result.push([c, ...r]);
  }
  return result;
}

/**
 * Returns all valid bracket size combinations for N teams (includes 6- and 7-team brackets).
 * Used by the teams "Generate Brackets" modal for the size dropdown.
 */
export function getTeamBracketSizeOptions(N: number): number[][] {
  const out: number[][] = [];
  const seen = new Set<string>();
  for (let k = 1; k <= 16; k *= 2) {
    if (k * MIN > N || k * MAX < N) continue;
    const base = N / k;
    const low = Math.max(MIN, Math.floor(base) - BALANCE_SPREAD);
    const high = Math.min(MAX, Math.ceil(base) + BALANCE_SPREAD);
    const candidates = [...ALLOWED_SIZES].filter((s) => s >= low && s <= high);
    if (candidates.length === 0) continue;
    const tuples = enumerateTuples(k, N, candidates);
    for (const t of tuples) {
      const sorted = [...t].sort((a, b) => a - b);
      const spread = sorted[sorted.length - 1]! - sorted[0]!;
      if (spread > BALANCE_SPREAD) continue;
      const key = sorted.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sorted);
    }
  }
  return out.sort(
    (a, b) => a.length - b.length || (a[0] ?? 0) - (b[0] ?? 0)
  );
}

// ---- Parse "JCC A" -> { clubId, tier, tierRank } ----
const LETTER_TO_RANK: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
  U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};

export function parseTeamName(name: string): { clubId: string; tier: string; tierRank: number } {
  const trimmed = name.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) {
    return { clubId: trimmed, tier: "?", tierRank: 999 };
  }
  const clubId = trimmed.slice(0, lastSpace).trim();
  const tier = trimmed.slice(lastSpace + 1).trim().toUpperCase();
  const tierRank = LETTER_TO_RANK[tier] ?? 999;
  return { clubId, tier, tierRank };
}

export function toParsedTeam(entry: TeamSeedEntry): ParsedTeam {
  const { clubId, tier, tierRank } = parseTeamName(entry.code);
  return { code: entry.code, id: entry.id, clubId, tier, tierRank, bias: entry.bias };
}

// ---- Pick bracket sizes (same logic as players) ----
export function pickTeamBracketSizes(N: number): number[] {
  let count = 1;
  while (count * MAX < N) count <<= 1;

  if (N <= MIN * count) return Array(count).fill(MIN);

  const base = Math.floor(N / count);
  const clampedBase = Math.max(MIN, Math.min(MAX, base));
  const sizes = Array(count).fill(clampedBase);
  let extra = N - sizes.reduce((s, n) => s + n, 0);
  for (let i = 0; extra > 0; i = (i + 1) % count) {
    if (sizes[i] < MAX) {
      sizes[i]++;
      extra--;
    }
  }
  return sizes;
}

/**
 * Generate distinct permutations of a multiset (array that may have duplicates).
 */
function distinctPermutations(arr: number[]): number[][] {
  if (arr.length === 0) return [[]];
  const seen = new Set<string>();
  const out: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of distinctPermutations(rest)) {
      const candidate = [arr[i], ...p];
      const key = candidate.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        out.push(candidate);
      }
    }
  }
  return out;
}

/**
 * Order a proposed multiset of sizes (sorted) so that when applied by bracket index
 * we minimize per-index change from currentSizes, prefer adding size to the earliest
 * bracket when there's a tie (e.g. [9,10,9,10] +1 team → [10,10,9,10] not [9,10,10,10]).
 */
export function orderSizesToMatchCurrent(
  currentSizes: number[],
  proposedSorted: number[],
): number[] {
  if (currentSizes.length !== proposedSorted.length) return proposedSorted;
  const perms = distinctPermutations(proposedSorted);
  let best = proposedSorted;
  let bestCost = Infinity;
  let bestFirstIncrease = Infinity;
  let bestMatches = -1;

  for (const perm of perms) {
    const cost = perm.reduce((s, v, i) => s + Math.abs(v - (currentSizes[i] ?? 0)), 0);
    const firstIncrease =
      perm.findIndex((v, i) => v > (currentSizes[i] ?? 0)) ?? perm.length;
    const matches = perm.filter((v, i) => v === currentSizes[i]).length;

    if (
      cost < bestCost ||
      (cost === bestCost && firstIncrease < bestFirstIncrease) ||
      (cost === bestCost &&
        firstIncrease === bestFirstIncrease &&
        matches > bestMatches)
    ) {
      bestCost = cost;
      bestFirstIncrease = firstIncrease;
      bestMatches = matches;
      best = perm;
    }
  }
  return best;
}

/**
 * Choose the bracket-size combination for teams that is closest to the current layout.
 * Uses team allowed sizes (6–16, no 15). Returns sizes in an order that minimizes
 * per-bracket change (e.g. [9,10,9,10] +1 → [10,10,9,10] not [9,10,10,10]).
 */
export function pickClosestSizesTeams(
  currentSizes: number[],
  newTotalTeams: number,
): number[] {
  const options = getTeamBracketSizeOptions(newTotalTeams);
  const candidates = options.length > 0 ? options : [pickTeamBracketSizes(newTotalTeams)];

  const sortedCurrent = [...currentSizes].sort((a, b) => a - b);

  const cost = (candidate: number[]): number => {
    const a = sortedCurrent;
    const b = [...candidate].sort((x, y) => x - y);
    const len = Math.max(a.length, b.length);
    let c = 0;
    for (let i = 0; i < len; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      c += Math.abs(ai - bi);
    }
    c += Math.abs(candidate.length - currentSizes.length) * 10;
    if (candidate.length > 0) {
      const spread = Math.max(...candidate) - Math.min(...candidate);
      c += spread;
    }
    return c;
  };

  const chosenMultiset = candidates.reduce((best, cand) =>
    cost(cand) < cost(best) ? cand : best,
  );

  return orderSizesToMatchCurrent(currentSizes, chosenMultiset);
}

function byeCountForSize(size: number): number {
  return BRACKET_BYES_TEAMS[size] ?? 0;
}

/** Shuffle array in place (Fisher–Yates). */
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Lightweight RNG for reproducible-ish randomness (optional seed). */
function createRng(seed?: number): () => number {
  if (seed == null) return Math.random;
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// ---- Distribute teams into brackets ----
function distributeTeamsIntoBrackets(
  parsed: ParsedTeam[],
  sizes: number[],
  rng: () => number
): TeamBracketGroup[] {
  const brackets: TeamBracketGroup[] = sizes.map((size, i) => ({
    group: i + 1,
    size,
    teams: [],
  }));
  const capacity = sizes.slice();
  const clubInGroup: Array<Map<string, number>> = sizes.map(() => new Map());
  const aTeamCountInGroup = sizes.map(() => 0);
  const biasTeamCountInGroup = sizes.map(() => 0);

  const incClub = (g: number, clubId: string) => {
    const m = clubInGroup[g];
    m.set(clubId, (m.get(clubId) ?? 0) + 1);
  };

  // Sort: bias (strong) first, then A, B, ... (tier); shuffle within same group for randomness
  const byKey = new Map<string, ParsedTeam[]>();
  for (const t of parsed) {
    const key = `${t.bias ? "0" : "1"}_${t.tierRank}`;
    const list = byKey.get(key) ?? [];
    list.push(t);
    byKey.set(key, list);
  }
  const keys = [...byKey.keys()].sort();
  const placementOrder: ParsedTeam[] = [];
  for (const key of keys) {
    const list = byKey.get(key)!;
    shuffle(list, rng);
    placementOrder.push(...list);
  }

  const numGroups = sizes.length;
  const neighbors = (g: number) => [
    (g - 1 + numGroups) % numGroups,
    (g + 1) % numGroups,
  ];

  for (const t of placementOrder) {
    let bestGroup = -1;
    let bestScore = -Infinity;
    const candidates: number[] = [];

    for (let g = 0; g < numGroups; g++) {
      if (capacity[g] <= 0) continue;
      const clubLoad = clubInGroup[g].get(t.clubId) ?? 0;
      const neighborClubs = new Set(neighbors(g).flatMap((ng) => [...clubInGroup[ng].keys()]));
      const neighborConflict = neighborClubs.has(t.clubId) ? 1 : 0;
      const sameGroupConflict = clubLoad;
      const aPenalty = t.tierRank === 0 ? aTeamCountInGroup[g] * 5 : 0;
      const biasPenalty = t.bias ? biasTeamCountInGroup[g] * 5 : 0;
      const score =
        capacity[g] * 50 -
        sameGroupConflict * 30 -
        neighborConflict * 25 -
        aPenalty -
        biasPenalty +
        rng() * 10;

      if (score > bestScore) {
        bestScore = score;
        bestGroup = g;
        candidates.length = 0;
        candidates.push(g);
      } else if (score === bestScore) {
        candidates.push(g);
      }
    }

    const g = bestGroup >= 0 ? (candidates.length > 1 ? candidates[Math.floor(rng() * candidates.length)]! : bestGroup) : 0;
    if (capacity[g] > 0) {
      brackets[g].teams.push({ code: t.code, id: t.id, bias: t.bias });
      capacity[g]--;
      incClub(g, t.clubId);
      if (t.tierRank === 0) aTeamCountInGroup[g]++;
      if (t.bias) biasTeamCountInGroup[g]++;
    }
  }

  return brackets;
}

// ---- Within-bracket: assign byes (A teams first), then order so same club far apart ----
function orderTeamBracket(
  teams: TeamSeedEntry[],
  size: number,
  rng: () => number
): TeamSeedEntry[] {
  const parsed = teams.map(toParsedTeam);
  const byeCount = byeCountForSize(size);
  const byeStart = size - byeCount;
  const nonByeCount = size - byeCount;

  const byTierRank = new Map<number, ParsedTeam[]>();
  for (const t of parsed) {
    const list = byTierRank.get(t.tierRank) ?? [];
    list.push(t);
    byTierRank.set(t.tierRank, list);
  }
  const tierOrder = [...byTierRank.keys()].sort((a, b) => a - b);

  const byePicks: TeamSeedEntry[] = [];
  const used = new Set<ParsedTeam>();

  // Bye priority: bias (strong) teams first, then A, B, ...
  const biasList = parsed.filter((t) => t.bias);
  shuffle(biasList, rng);
  for (const t of biasList) {
    if (byePicks.length >= byeCount) break;
    byePicks.push({ code: t.code, id: t.id, bias: t.bias });
    used.add(t);
  }
  for (const rank of tierOrder) {
    const list = (byTierRank.get(rank) ?? []).filter((t) => !used.has(t));
    shuffle(list, rng);
    for (const t of list) {
      if (byePicks.length >= byeCount) break;
      byePicks.push({ code: t.code, id: t.id, bias: t.bias });
      used.add(t);
    }
  }

  const remaining = parsed.filter((t) => !used.has(t));
  shuffle(remaining, rng);

  const slots: (TeamSeedEntry | undefined)[] = Array(size);
  for (let i = 0; i < byePicks.length; i++) slots[byeStart + i] = byePicks[i];

  const spreadOrder: number[] = [];
  const mid = Math.floor(nonByeCount / 2);
  let l = 0,
    r = mid;
  while (spreadOrder.length < nonByeCount) {
    if (l < mid) spreadOrder.push(l++);
    if (r < nonByeCount) spreadOrder.push(r++);
  }

  const clubAtSlot = new Map<number, string>();
  const place = (entry: TeamSeedEntry, idx: number) => {
    slots[idx] = entry;
    const { clubId } = parseTeamName(entry.code);
    clubAtSlot.set(idx, clubId);
  };

  let remIdx = 0;
  for (const pos of spreadOrder) {
    if (slots[pos] != null) continue;
    if (remIdx >= remaining.length) break;
    const t = remaining[remIdx++]!;
    place({ code: t.code, id: t.id, bias: t.bias }, pos);
  }

  for (let i = 0; i < nonByeCount && remIdx < remaining.length; i++) {
    if (slots[i] != null) continue;
    const t = remaining[remIdx++]!;
    place({ code: t.code, id: t.id, bias: t.bias }, i);
  }

  return slots.map((s) => s ?? { code: "" }) as TeamSeedEntry[];
}

// ---- Main entry ----
/**
 * Assign team codes into bracket groups. Same-club and same-tier (e.g. "A") teams
 * are spread apart. Bias (strong) teams and A teams get priority for byes.
 * Bracket sizes 6–16 (no 15). Optional seed for reproducible runs.
 * If options.sizes is provided, use that combination (and order) instead of default.
 */
export function assignTeamBrackets(
  teamCodes: string[],
  options?: { seed?: number; teamIds?: number[]; biasTeamIds?: number[]; sizes?: number[] }
): TeamBracketGroup[] {
  const rng = createRng(options?.seed);
  const ids = options?.teamIds;
  const biasSet = new Set(options?.biasTeamIds ?? []);
  const entries: TeamSeedEntry[] = teamCodes.map((code, i) => ({
    code,
    id: ids?.[i],
    bias: ids?.[i] != null && biasSet.has(ids[i]!),
  }));

  const defaultSizes = pickTeamBracketSizes(entries.length);
  // Use chosen sizes in the exact order provided; for default, sort ascending so group order
  // matches the bracket layout dropdown (e.g. 9,9,10,10 not 10,10,9,9).
  const sizes =
    options?.sizes != null && options.sizes.length > 0
      ? options.sizes
      : [...defaultSizes].sort((a, b) => a - b);
  const parsed = entries.map(toParsedTeam);
  const grouped = distributeTeamsIntoBrackets(parsed, sizes, rng);

  for (const br of grouped) {
    br.teams = orderTeamBracket(br.teams, br.size, rng);
  }

  return grouped;
}
