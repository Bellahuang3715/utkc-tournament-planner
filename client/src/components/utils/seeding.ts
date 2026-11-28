import { DivisionPlayer } from "../../interfaces/division";

// ---------------- Types ----------------
export type ClubCode = string;

// ---- Randomness (tie-breaking only; baseline logic unchanged) ----
function shuffleArray<T>(arr: T[], start = 0, end = arr.length): void {
  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Sort by compare, then shuffle within runs of equal comparison (randomize ties). */
function sortWithRandomTies<T>(arr: T[], compare: (a: T, b: T) => number): void {
  arr.sort(compare);
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j + 1 < arr.length && compare(arr[j], arr[j + 1]) === 0) j++;
    if (j > i) shuffleArray(arr, i, j + 1);
    i = j + 1;
  }
}

export interface BracketGroup {
  group: number; // 1-based
  size: number;
  players: DivisionPlayer[];
}

// ---- 1) Static config ----
export const BRACKET_BYES: Record<number, number> = {
  5: 3,
  6: 2,
  7: 1,
  8: 0,
  9: 1,
  10: 6,
  11: 5,
  12: 4,
  13: 3,
  14: 2,
  15: 1,
  16: 0,
};

const ALLOWED_SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
/** Minimum players required to create/seed a division (also the smallest bracket size). */
export const MIN_BRACKET_SIZE = ALLOWED_SIZES[0];
const MIN = MIN_BRACKET_SIZE;
const MAX = ALLOWED_SIZES[ALLOWED_SIZES.length - 1];

/** Maximum allowed spread between smallest and largest bracket in a combination (keeps sizes "approximately equal"). */
const BALANCE_SPREAD = 3;

/**
 * Enumerate non-decreasing k-tuples from candidates that sum to target with
 * max-min <= maxSpread. Avoids the ordered-permutation blowup of the old search
 * (which OOM'd around ~100 players on select-all).
 */
function enumerateBalancedCombinations(
  k: number,
  target: number,
  candidates: number[],
  maxSpread: number,
): number[][] {
  const sorted = [...candidates].sort((a, b) => a - b);
  const result: number[][] = [];
  const path: number[] = [];
  const maxCand = sorted[sorted.length - 1]!;

  const dfs = (startIdx: number, remK: number, remSum: number) => {
    if (remK === 0) {
      if (remSum === 0) result.push(path.slice());
      return;
    }
    for (let i = startIdx; i < sorted.length; i++) {
      const c = sorted[i]!;
      if (path.length > 0 && c - path[0]! > maxSpread) break;
      if (c * remK > remSum) break;
      if (maxCand * remK < remSum) continue;
      if (remK > 1 && remSum - c < c * (remK - 1)) continue;
      path.push(c);
      dfs(i, remK - 1, remSum - c); // allow repeats (non-decreasing)
      path.pop();
    }
  };

  dfs(0, k, target);
  return result;
}

/**
 * Returns all valid bracket size combinations for N players.
 * Each combination is an array of bracket sizes (from ALLOWED_SIZES) that sum to N,
 * with sizes kept approximately equal (spread between min and max in a combination <= BALANCE_SPREAD).
 * Bracket count is restricted to powers of 2 (1, 2, 4, 8, 16, ...).
 */
export function getBracketSizeOptions(N: number): number[][] {
  if (N < MIN) return [];
  const out: number[][] = [];
  for (let k = 1; k * MIN <= N; k *= 2) {
    if (k * MAX < N) continue;
    const base = N / k;
    const low = Math.max(MIN, Math.floor(base) - BALANCE_SPREAD);
    const high = Math.min(MAX, Math.ceil(base) + BALANCE_SPREAD);
    const candidates = [...ALLOWED_SIZES].filter((s) => s >= low && s <= high);
    if (candidates.length === 0) continue;
    for (const combo of enumerateBalancedCombinations(
      k,
      N,
      candidates,
      BALANCE_SPREAD,
    )) {
      out.push(combo);
    }
  }
  return out.sort(
    (a, b) => a.length - b.length || (a[0] ?? 0) - (b[0] ?? 0)
  );
}

// ---- 2) Pick bracket sizes (JS logic) ----
export function pickBracketSizes(N: number): number[] {
  // Return [] below minimum — callers that compute UI options may run on selection.
  // assignBrackets enforces the minimum when actually generating.
  if (N < MIN) return [];
  let count = 1;
  while (count * MAX < N) count <<= 1;

  if (N <= MIN * count) {
    return Array(count).fill(MIN);
  }

  const base = Math.floor(N / count);
  const clampedBase = Math.max(MIN, Math.min(MAX, base));
  const sizes = Array(count).fill(clampedBase);

  let extra = N - sizes.reduce((sum, s) => sum + s, 0);

  // round-robin distribute the extra slots
  for (let i = 0; extra > 0; i = (i + 1) % count) {
    if (sizes[i] < MAX) {
      sizes[i]++;
      extra--;
    }
  }
  return sizes;
}

/** Generate distinct permutations of a multiset. */
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
 * Order a proposed multiset of sizes so that when applied by bracket index we minimize
 * per-index change, and prefer adding size to the earliest bracket when there's a tie.
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

/** Choose the bracket-size combination for `newTotalPlayers` that is closest to the current layout. */
export function pickClosestSizes(
  currentSizes: number[],
  newTotalPlayers: number,
): number[] {
  const options = getBracketSizeOptions(newTotalPlayers);
  const candidates = options.length > 0 ? options : [pickBracketSizes(newTotalPlayers)];

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

// ---- 3) Utilities ----
function byeCountForSize(size: number): number {
  // Because BRACKET_BYES is Record<number, number>, TS still treats indexing as possibly undefined
  return BRACKET_BYES[size] ?? 0;
}

function neighborsOf(i: number, total: number): [number, number] {
  const left = (i - 1 + total) % total;
  const right = (i + 1) % total;
  return [left, right];
}

function countByClub(players: ReadonlyArray<DivisionPlayer>): Map<ClubCode, number> {
  const m = new Map<ClubCode, number>();
  for (const p of players) {
    m.set(p.club, (m.get(p.club) ?? 0) + 1);
  }
  return m;
}

function sumByesForSizes(sizes: ReadonlyArray<number>): number {
  return sizes.reduce((acc, sz) => acc + byeCountForSize(sz), 0);
}

// Largest remainder apportionment for bye quotas: proportional fairness
function computeByeQuotaByClub(
  players: ReadonlyArray<DivisionPlayer>,
  sizes: ReadonlyArray<number>
): Map<ClubCode, number> {
  const totalByes = sumByesForSizes(sizes);
  const totals = countByClub(players);
  const N = players.length || 1;

  const entries = [...totals.entries()].map(([club, cnt]) => {
    const exact = (totalByes * cnt) / N;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { club, floor, remainder };
  });

  const allocated = entries.reduce((s, e) => s + e.floor, 0);
  const remaining = totalByes - allocated;

  if (remaining > 0 && entries.length > 0) {
    sortWithRandomTies(entries, (a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining && i < entries.length; i++) {
      entries[i].floor += 1;
    }
  }

  const quota = new Map<ClubCode, number>();
  for (const e of entries) quota.set(e.club, e.floor);
  return quota;
}

// ---- 5) Strong-player aware + club-balanced group distribution ----
function distributeIntoGroups(
  players: ReadonlyArray<DivisionPlayer>,
  sizes: ReadonlyArray<number>
): BracketGroup[] {
  const bracketCount = sizes.length;

  const brackets: BracketGroup[] = sizes.map((sz, i) => ({
    group: i + 1,
    size: sz,
    players: [],
  }));

  const capacityLeft = sizes.slice();

  const strong = players.filter((p) => p.bias);
  const others = players.filter((p) => !p.bias);
  shuffleArray(strong);
  shuffleArray(others);

  const strongInGroupClub: Array<Set<ClubCode>> =
    Array.from({ length: bracketCount }, () => new Set<ClubCode>());

  const clubCountInGroup: Array<Map<ClubCode, number>> =
    Array.from({ length: bracketCount }, () => new Map<ClubCode, number>());

  const incClub = (g: number, club: ClubCode) => {
    const m = clubCountInGroup[g];
    m.set(club, (m.get(club) ?? 0) + 1);
  };

  // Place strong first (random tie-break when multiple groups have same score)
  for (const p of strong) {
    let bestScore = -Infinity;
    const tied: number[] = [];

    for (let g = 0; g < bracketCount; g++) {
      if (capacityLeft[g] <= 0) continue;

      const neigh = neighborsOf(g, bracketCount);
      const neighborConflict = neigh.some((ng) => strongInGroupClub[ng].has(p.club)) ? 1 : 0;
      const sameGroupConflict = strongInGroupClub[g].has(p.club) ? 1 : 0;
      const clubLoad = clubCountInGroup[g].get(p.club) ?? 0;

      const score =
        capacityLeft[g] * 100 - neighborConflict * 20 - sameGroupConflict * 10 - clubLoad * 3;

      if (score > bestScore) {
        bestScore = score;
        tied.length = 0;
        tied.push(g);
      } else if (score === bestScore) {
        tied.push(g);
      }
    }

    const best = tied.length > 0 ? tied[Math.floor(Math.random() * tied.length)]! : -1;
    if (best !== -1) {
      brackets[best].players.push(p);
      capacityLeft[best]--;
      strongInGroupClub[best].add(p.club);
      incClub(best, p.club);
    }
  }

  // Place others (random tie-break when multiple groups have same score)
  for (const p of others) {
    let bestScore = -Infinity;
    const tied: number[] = [];

    for (let g = 0; g < bracketCount; g++) {
      if (capacityLeft[g] <= 0) continue;

      const clubLoad = clubCountInGroup[g].get(p.club) ?? 0;
      const score = -clubLoad * 100 + capacityLeft[g];

      if (score > bestScore) {
        bestScore = score;
        tied.length = 0;
        tied.push(g);
      } else if (score === bestScore) {
        tied.push(g);
      }
    }

    const best = tied.length > 0 ? tied[Math.floor(Math.random() * tied.length)]! : -1;
    if (best !== -1) {
      brackets[best].players.push(p);
      capacityLeft[best]--;
      incClub(best, p.club);
    }
  }

  return brackets;
}

// ---- 6) In-bracket ordering ----
function orderBracket(
  players: ReadonlyArray<DivisionPlayer>,
  size: number,
  byeAssignedPerClub: Map<ClubCode, number>,
  byeQuotaByClub: Map<ClubCode, number>
): DivisionPlayer[] {
  const byeCount = byeCountForSize(size);
  const byeStart = size - byeCount;

  const strong = players.filter((p) => p.bias);
  const nonStrong = players.filter((p) => !p.bias);

  const canClubTakeMoreByes = (club: ClubCode) => {
    const used = byeAssignedPerClub.get(club) ?? 0;
    const quota = byeQuotaByClub.get(club) ?? 0;
    return used < quota;
  };

  const needScore = (club: ClubCode) => {
    const used = byeAssignedPerClub.get(club) ?? 0;
    const quota = byeQuotaByClub.get(club) ?? 0;
    return quota > 0 ? used / quota : 1e9;
  };

  const bracketByeClubs = new Set<ClubCode>();
  const byePicks: DivisionPlayer[] = [];

  const strongEligible = strong.filter((p) => canClubTakeMoreByes(p.club));
  sortWithRandomTies(strongEligible, (a, b) => needScore(a.club) - needScore(b.club));

  for (const s of strongEligible) {
    if (byePicks.length >= byeCount) break;
    if (!bracketByeClubs.has(s.club)) {
      byePicks.push(s);
      bracketByeClubs.add(s.club);
      byeAssignedPerClub.set(s.club, (byeAssignedPerClub.get(s.club) ?? 0) + 1);
    }
  }

  if (byePicks.length < byeCount) {
    const strongFallback = strong.filter((p) => !byePicks.includes(p));
    sortWithRandomTies(strongFallback, (a, b) => needScore(a.club) - needScore(b.club));

    for (const s of strongFallback) {
      if (byePicks.length >= byeCount) break;
      if (!bracketByeClubs.has(s.club)) {
        byePicks.push(s);
        bracketByeClubs.add(s.club);
        if (canClubTakeMoreByes(s.club)) {
          byeAssignedPerClub.set(s.club, (byeAssignedPerClub.get(s.club) ?? 0) + 1);
        }
      }
    }
  }

  if (byePicks.length < byeCount) {
    const nonStrongEligible = nonStrong.filter((p) => canClubTakeMoreByes(p.club));
    sortWithRandomTies(nonStrongEligible, (a, b) => needScore(a.club) - needScore(b.club));

    for (const p of nonStrongEligible) {
      if (byePicks.length >= byeCount) break;
      if (!bracketByeClubs.has(p.club)) {
        byePicks.push(p);
        bracketByeClubs.add(p.club);
        byeAssignedPerClub.set(p.club, (byeAssignedPerClub.get(p.club) ?? 0) + 1);
      }
    }
  }

  if (byePicks.length < byeCount) {
    const rest = players.filter((p) => !byePicks.includes(p));
    sortWithRandomTies(rest, (a, b) => {
      const aDup = bracketByeClubs.has(a.club) ? 1 : 0;
      const bDup = bracketByeClubs.has(b.club) ? 1 : 0;
      if (aDup !== bDup) return aDup - bDup;
      return needScore(a.club) - needScore(b.club);
    });

    for (const p of rest) {
      if (byePicks.length >= byeCount) break;
      byePicks.push(p);
      bracketByeClubs.add(p.club);
      if (canClubTakeMoreByes(p.club)) {
        byeAssignedPerClub.set(p.club, (byeAssignedPerClub.get(p.club) ?? 0) + 1);
      }
    }
  }

  const slots: Array<DivisionPlayer | undefined> = Array(size);
  const byeSet = new Set(byePicks);

  let tail = byeStart;
  for (const p of byePicks) slots[tail++] = p;

  const remaining = players.filter((p) => !byeSet.has(p));

  const nonByeLen = size - byeCount;
  const spreadOrder = (() => {
    const mid = Math.floor(nonByeLen / 2);
    const order: number[] = [];
    let l = 0, r = mid;
    while (order.length < nonByeLen) {
      if (l < mid) order.push(l++);
      if (r < nonByeLen) order.push(r++);
    }
    return order;
  })();

  const remainingStrong = remaining.filter((p) => p.bias);
  shuffleArray(remainingStrong);
  let so = 0;
  for (const s of remainingStrong) {
    while (so < spreadOrder.length && slots[spreadOrder[so]]) so++;
    if (so >= spreadOrder.length) break;
    slots[spreadOrder[so]] = s;
    so++;
  }

  const pool = remaining.filter((p) => !p.bias);
  shuffleArray(pool);

  function pickNotClub(club: ClubCode | null): DivisionPlayer | null {
    if (!club) return pool.shift() ?? null;
    const idx = pool.findIndex((p) => p.club !== club);
    if (idx === -1) return pool.shift() ?? null;
    return pool.splice(idx, 1)[0] ?? null;
  }

  for (let i = 0; i < nonByeLen; i += 2) {
    const a = i, b = i + 1;
    const clubA = slots[a]?.club ?? null;
    const clubB = slots[b]?.club ?? null;

    const fill = (idx: number, avoidClub: ClubCode | null) => {
      if (slots[idx]) return;
      const pick = pickNotClub(avoidClub);
      if (pick) slots[idx] = pick;
    };

    if (clubA && !clubB) {
      fill(b, clubA);
    } else if (!clubA && clubB) {
      fill(a, clubB);
    } else if (!clubA && !clubB) {
      const first = pickNotClub(null);
      if (first) slots[a] = first;
      const second = pickNotClub(first ? first.club : null);
      if (second) slots[b] = second;
    }
  }

  for (let i = 0; i < nonByeLen && pool.length > 0; i++) {
    if (!slots[i]) slots[i] = pool.shift();
  }

  const leftovers = remaining.filter((p) => !slots.includes(p) && !byeSet.has(p));
  for (let i = 0; i < size && leftovers.length > 0; i++) {
    if (!slots[i]) slots[i] = leftovers.shift();
  }

  // By construction, no undefined should remain, but cast safely:
  return slots.map((p) => p!) as DivisionPlayer[];
}

// ---- 7) Main entry ----
/**
 * Assign players into bracket groups. If `sizes` is provided, use that combination;
 * otherwise use pickBracketSizes(players.length).
 */
export function assignBrackets(
  players: ReadonlyArray<DivisionPlayer>,
  sizes?: number[]
): BracketGroup[] {
  if (players.length < MIN) {
    throw new Error(
      `At least ${MIN} players are required to generate brackets (got ${players.length}).`,
    );
  }
  const resolvedSizes =
    sizes != null && sizes.length > 0
      ? sizes
      : pickBracketSizes(players.length);
  if (resolvedSizes.reduce((s, n) => s + n, 0) !== players.length) {
    throw new Error(
      `Bracket sizes [${resolvedSizes.join(", ")}] do not sum to player count ${players.length}.`,
    );
  }

  const byeQuotaByClub = computeByeQuotaByClub(players, resolvedSizes);
  const byeAssignedPerClub = new Map<ClubCode, number>();

  const grouped = distributeIntoGroups(players, resolvedSizes);

  for (const br of grouped) {
    br.players = orderBracket(br.players, br.size, byeAssignedPerClub, byeQuotaByClub);
  }

  return grouped;
}
