export type ClubCode = string;

export interface SeedingPlayer {
  id: string | number; // unique per player
  name: string;
  club: ClubCode;
  bias: boolean;
}

export interface BracketGroup {
  group: number;        // 1-based group index
  size: number;         // bracket size (8..16 from allowed set)
  players: SeedingPlayer[];
}

// ---- 1) Static config ----
// Use a Map to avoid loose index typing from objects.
export const BRACKET_BYES: Map<number, number> = new Map([
  [8, 0],
  [9, 1],
  [10, 6],
  [11, 5],
  [12, 4],
  [13, 3],
  [14, 2],
  [16, 0],
]);

const ALLOWED_SIZES = [8, 9, 10, 11, 12, 13, 14, 16] as const;
const MIN: number = ALLOWED_SIZES[0];
const MAX: number = ALLOWED_SIZES[ALLOWED_SIZES.length - 1];

// ---- 2) Pick bracket sizes ----
export function pickBracketSizes(N: number): number[] {
  let count = 1;
  while (count * MAX < N) count <<= 1;

  if (N <= MIN * count) {
    return Array<number>(count).fill(MIN);
  }

  const base = Math.floor(N / count);
  const sizes = Array<number>(count).fill(Math.max(MIN, Math.min(MAX, base)));
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

// ---- 3) Utilities ----
function byeCountForSize(size: number): number {
  return BRACKET_BYES.get(size) ?? 0;
}

function neighborsOf(i: number, total: number): [number, number] {
  const left = (i - 1 + total) % total;
  const right = (i + 1) % total;
  return [left, right];
}

function countByClub(players: ReadonlyArray<SeedingPlayer>): Map<ClubCode, number> {
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
  players: ReadonlyArray<SeedingPlayer>,
  sizes: ReadonlyArray<number>
): Map<ClubCode, number> {
  const totalByes = sumByesForSizes(sizes);
  const totals = countByClub(players);
  const N = players.length;

  type Entry = { club: ClubCode; floor: number; remainder: number };
  const entries: Entry[] = [...totals.entries()].map(([club, cnt]) => {
    const exact = (totalByes * cnt) / N;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { club, floor, remainder };
  });

  let allocated = entries.reduce((s, e) => s + e.floor, 0);
  const remaining = totalByes - allocated;

  entries.sort((a, b) => b.remainder - a.remainder); // biggest remainder first
  for (let i = 0; i < remaining; i++) entries[i].floor += 1;

  const quota = new Map<ClubCode, number>();
  for (const e of entries) quota.set(e.club, e.floor);
  return quota; // Map<club, targetByesForTournament>
}

// ---- 5) Strong-player aware + club-balanced group distribution ----
function distributeIntoGroups(
  players: ReadonlyArray<SeedingPlayer>,
  sizes: ReadonlyArray<number>
): BracketGroup[] {
  const bracketCount = sizes.length;

  const brackets: BracketGroup[] = sizes.map((sz, i) => ({
    group: i + 1,
    size: sz,
    players: [],
  }));
  const capacityLeft: number[] = sizes.map((s) => s);

  const strong: SeedingPlayer[] = players.filter((p) => p.bias);
  const others: SeedingPlayer[] = players.filter((p) => !p.bias);

  // Track strong clubs per group for neighbor rule
  const strongInGroupClub: Array<Set<ClubCode>> = Array.from(
    { length: bracketCount },
    () => new Set<ClubCode>()
  );

  // Track club counts per group for balancing
  const clubCountInGroup: Array<Map<ClubCode, number>> = Array.from(
    { length: bracketCount },
    () => new Map<ClubCode, number>()
  );

  const incClub = (g: number, club: ClubCode) => {
    const m = clubCountInGroup[g];
    m.set(club, (m.get(club) ?? 0) + 1);
  };

  // Place strong first with scoring
  for (const p of strong) {
    let best = -1;
    let bestScore = -Infinity;

    for (let g = 0; g < bracketCount; g++) {
      if (capacityLeft[g] <= 0) continue;

      const [left, right] = neighborsOf(g, bracketCount);
      const neighborConflict =
        (strongInGroupClub[left].has(p.club) ? 1 : 0) +
        (strongInGroupClub[right].has(p.club) ? 1 : 0);
      const sameGroupConflict = strongInGroupClub[g].has(p.club) ? 1 : 0;
      const clubLoad = clubCountInGroup[g].get(p.club) ?? 0;

      // Heuristic:
      const score = capacityLeft[g] * 100 - neighborConflict * 20 - sameGroupConflict * 10 - clubLoad * 3;

      if (score > bestScore) {
        bestScore = score;
        best = g;
      }
    }

    if (best !== -1) {
      brackets[best].players.push(p);
      capacityLeft[best]--;
      strongInGroupClub[best].add(p.club);
      incClub(best, p.club);
    }
  }

  // Place others: choose group with lowest club load, tie-break by capacity
  for (const p of others) {
    let best = -1;
    let bestScore = -Infinity;

    for (let g = 0; g < bracketCount; g++) {
      if (capacityLeft[g] <= 0) continue;
      const clubLoad = clubCountInGroup[g].get(p.club) ?? 0;
      const score = -clubLoad * 100 + capacityLeft[g]; // prefer groups with fewer of this club
      if (score > bestScore) {
        bestScore = score;
        best = g;
      }
    }

    if (best !== -1) {
      brackets[best].players.push(p);
      capacityLeft[best]--;
      incClub(best, p.club);
    }
  }

  return brackets;
}

// ---- 6) In-bracket ordering with fair byes + constraints (no nulls) ----
function orderBracket(
  players: ReadonlyArray<SeedingPlayer>,
  size: number,
  byeAssignedPerClub: Map<ClubCode, number>,
  byeQuotaByClub: Map<ClubCode, number>
): SeedingPlayer[] {
  const byeCount = byeCountForSize(size);
  const byeStart = size - byeCount; // indexes [byeStart .. size-1] are bye positions

  const strong: SeedingPlayer[] = players.filter((p) => p.bias);
  const nonStrong: SeedingPlayer[] = players.filter((p) => !p.bias);

  const canClubTakeMoreByes = (club: ClubCode): boolean => {
    const used = byeAssignedPerClub.get(club) ?? 0;
    const quota = byeQuotaByClub.get(club) ?? 0;
    return used < quota;
  };

  const needScore = (club: ClubCode): number => {
    const used = byeAssignedPerClub.get(club) ?? 0;
    const quota = byeQuotaByClub.get(club) ?? 0;
    return quota > 0 ? used / quota : Number.POSITIVE_INFINITY;
  };

  const bracketByeClubs: Set<ClubCode> = new Set();
  const byePicks: SeedingPlayer[] = [];

  // 6a) Prefer strong players that can still take byes (respect quotas)
  const strongEligible = strong
    .filter((p) => canClubTakeMoreByes(p.club))
    .sort((a, b) => needScore(a.club) - needScore(b.club));

  for (const s of strongEligible) {
    if (byePicks.length >= byeCount) break;
    if (!bracketByeClubs.has(s.club)) {
      byePicks.push(s);
      bracketByeClubs.add(s.club);
      byeAssignedPerClub.set(s.club, (byeAssignedPerClub.get(s.club) ?? 0) + 1);
    }
  }

  // 6b) Fallback strong (regardless of quota, still try to avoid duplicates)
  if (byePicks.length < byeCount) {
    const strongFallback = strong
      .filter((p) => !byePicks.includes(p))
      .sort((a, b) => needScore(a.club) - needScore(b.club));
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

  // 6c) Non-strong fairly
  if (byePicks.length < byeCount) {
    const nonStrongEligible = nonStrong
      .filter((p) => canClubTakeMoreByes(p.club))
      .sort((a, b) => needScore(a.club) - needScore(b.club));
    for (const p of nonStrongEligible) {
      if (byePicks.length >= byeCount) break;
      if (!bracketByeClubs.has(p.club)) {
        byePicks.push(p);
        bracketByeClubs.add(p.club);
        byeAssignedPerClub.set(p.club, (byeAssignedPerClub.get(p.club) ?? 0) + 1);
      }
    }
  }

  // 6d) If STILL short, take anyone left; minimize duplicates if possible
  if (byePicks.length < byeCount) {
    const rest = players.filter((p) => !byePicks.includes(p));
    rest.sort((a, b) => {
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

  // Build slots: players only, no nulls; put bye picks into tail indexes
  const slots: Array<SeedingPlayer | undefined> = Array<SeedingPlayer | undefined>(size);
  const byeSet = new Set<SeedingPlayer>(byePicks);
  let tail = byeStart;
  for (const p of byePicks) {
    slots[tail++] = p;
  }

  // Remaining players
  const remaining: SeedingPlayer[] = players.filter((p) => !byeSet.has(p));

  // Place remaining strong spaced in non-bye region
  const nonByeLen = size - byeCount;
  const spreadOrder: number[] = (() => {
    const mid = Math.floor(nonByeLen / 2);
    const order: number[] = [];
    let l = 0,
      r = mid;
    while (order.length < nonByeLen) {
      if (l < mid) order.push(l++);
      if (r < nonByeLen) order.push(r++);
    }
    return order;
  })();

  const remainingStrong: SeedingPlayer[] = remaining.filter((p) => p.bias);
  let so = 0;
  for (const s of remainingStrong) {
    while (so < spreadOrder.length && slots[spreadOrder[so]] !== undefined) so++;
    if (so >= spreadOrder.length) break;
    slots[spreadOrder[so]] = s;
    so++;
  }

  // Then fill rest with non-strong avoiding first-round same-club if possible
  const pool: SeedingPlayer[] = remaining.filter((p) => !p.bias);

  function pickNotClub(club: ClubCode | null): SeedingPlayer | null {
    if (!club) return pool.shift() ?? null;
    const idx = pool.findIndex((p) => p.club !== club);
    if (idx === -1) return pool.shift() ?? null;
    return pool.splice(idx, 1)[0] ?? null;
  }

  for (let i = 0; i < nonByeLen; i += 2) {
    const a = i,
      b = i + 1;
    const clubA = slots[a]?.club ?? null;
    const clubB = slots[b]?.club ?? null;

    const fill = (idx: number, avoidClub: ClubCode | null) => {
      if (slots[idx] !== undefined) return;
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

  // Any leftover holes in non-bye region (rare): fill sequentially
  for (let i = 0; i < nonByeLen && pool.length > 0; i++) {
    if (!slots[i]) slots[i] = pool.shift();
  }

  // Sanity: fill any remaining empties
  const leftovers = remaining.filter((p) => !slots.includes(p) && !byeSet.has(p));
  for (let i = 0; i < size && leftovers.length > 0; i++) {
    if (!slots[i]) slots[i] = leftovers.shift();
  }

  // Non-null assertion is safe by construction above
  return slots.map((p) => p!);
}

// ---- 7) Main entry ----
export function assignBrackets(players: ReadonlyArray<SeedingPlayer>): BracketGroup[] {
  const sizes = pickBracketSizes(players.length);

  // (A) Fair bye quota per club across the whole tournament
  const byeQuotaByClub: Map<ClubCode, number> = computeByeQuotaByClub(players, sizes);
  const byeAssignedPerClub: Map<ClubCode, number> = new Map();

  // (B) Place players into groups with strong + club balancing
  const grouped: BracketGroup[] = distributeIntoGroups(players, sizes);

  // (C) Order inside each bracket; assign byes fairly; no nulls
  for (const br of grouped) {
    br.players = orderBracket(br.players, br.size, byeAssignedPerClub, byeQuotaByClub);
  }

  return grouped;
}
