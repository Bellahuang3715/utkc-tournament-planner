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
  8: 0,
  9: 1,
  10: 6,
  11: 5,
  12: 4,
  13: 3,
  14: 2,
  16: 0,
};

const ALLOWED_SIZES = [8, 9, 10, 11, 12, 13, 14, 16] as const;
const MIN = ALLOWED_SIZES[0];
const MAX = ALLOWED_SIZES[ALLOWED_SIZES.length - 1];

// ---- 2) Pick bracket sizes (JS logic) ----
export function pickBracketSizes(N: number): number[] {
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

  sortWithRandomTies(entries, (a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) entries[i].floor += 1;

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
export function assignBrackets(players: ReadonlyArray<DivisionPlayer>): BracketGroup[] {
  const sizes = pickBracketSizes(players.length);

  const byeQuotaByClub = computeByeQuotaByClub(players, sizes);
  const byeAssignedPerClub = new Map<ClubCode, number>();

  const grouped = distributeIntoGroups(players, sizes);

  for (const br of grouped) {
    br.players = orderBracket(br.players, br.size, byeAssignedPerClub, byeQuotaByClub);
  }

  return grouped;
}

const divisionAPlayers = [
{ code: "P001", name: "Amina Yusuf", club: "TKC", bias: false },
{ code: "P002", name: "Hiroki Tanaka", club: "TKC", bias: false },
{ code: "P003", name: "Lucas Oliveira", club: "TKC", bias: true },
{ code: "P004", name: "Priya Singh", club: "TKC", bias: false },
{ code: "P005", name: "Li Wei", club: "TKC", bias: false },
{ code: "P006", name: "Jamal Thompson", club: "TKC", bias: false },
{ code: "P007", name: "Sofia García", club: "TKC", bias: true },
{ code: "P008", name: "Viktor Johansson", club: "TKC", bias: false },
{ code: "P009", name: "Zuri Ndlovu", club: "TKC", bias: false },
{ code: "P010", name: "Amara Diop", club: "TKC", bias: false },
{ code: "P011", name: "Kenji Watanabe", club: "TKC", bias: false },
{ code: "P012", name: "María Estévez", club: "TKC", bias: false },
{ code: "P013", name: "Oskar Lindgren", club: "TKC", bias: false },
{ code: "P014", name: "Aisha El-Sayed", club: "TKC", bias: false },
{ code: "P015", name: "Linh Tran", club: "TKC", bias: false },
{ code: "P016", name: "Diego Castillo", club: "ETO", bias: false },
{ code: "P017", name: "Fatima Al-Hassan", club: "ETO", bias: false },
{ code: "P018", name: "Olivia Montgomery", club: "ETO", bias: false },
{ code: "P019", name: "Thiago Oliveira", club: "ETO", bias: false },
{ code: "P020", name: "Zara Novak", club: "ETO", bias: false },
{ code: "P021", name: "Amina Yusuf", club: "ETO", bias: false },
{ code: "P022", name: "Hiroki Tanaka", club: "ETO", bias: true },
{ code: "P023", name: "Lucas Oliveira", club: "ETO", bias: false },
{ code: "P024", name: "Priya Singh", club: "ETO", bias: false },
{ code: "P025", name: "Li Wei", club: "ETO", bias: false },
{ code: "P026", name: "Jamal Thompson", club: "ETO", bias: false },
{ code: "P027", name: "Sofia García", club: "ETO", bias: false },
{ code: "P028", name: "Viktor Johansson", club: "UOT", bias: false },
{ code: "P029", name: "Zuri Ndlovu", club: "UOT", bias: true },
{ code: "P030", name: "Amara Diop", club: "UOT", bias: false },
{ code: "P031", name: "Kenji Watanabe", club: "UOT", bias: false },
{ code: "P032", name: "María Estévez", club: "UOT", bias: false },
{ code: "P033", name: "Oskar Lindgren", club: "UOT", bias: true },
{ code: "P034", name: "Aisha El-Sayed", club: "UOT", bias: false },
{ code: "P035", name: "Linh Tran", club: "UOT", bias: false },
{ code: "P036", name: "Diego Castillo", club: "UOT", bias: false },
{ code: "P037", name: "Fatima Al-Hassan", club: "UOT", bias: false },
{ code: "P038", name: "Olivia Montgomery", club: "UOT", bias: false },
{ code: "P039", name: "Thiago Oliveira", club: "JCC", bias: false },
{ code: "P040", name: "Zara Novak", club: "JCC", bias: false },
{ code: "P041", name: "Amina Yusuf", club: "JCC", bias: false },
{ code: "P042", name: "Hiroki Tanaka", club: "JCC", bias: false },
{ code: "P043", name: "Lucas Oliveira", club: "JCC", bias: false },
{ code: "P044", name: "Priya Singh", club: "JCC", bias: true },
{ code: "P045", name: "Li Wei", club: "JCC", bias: false },
{ code: "P046", name: "Jamal Thompson", club: "JCC", bias: false },
{ code: "P047", name: "Sofia García", club: "JCC", bias: false },
{ code: "P048", name: "Viktor Johansson", club: "JCC", bias: false },
{ code: "P049", name: "Zuri Ndlovu", club: "UWA", bias: false },
{ code: "P050", name: "Amara Diop", club: "UWA", bias: false },
{ code: "P051", name: "Kenji Watanabe", club: "UWA", bias: false },
{ code: "P052", name: "María Estévez", club: "UWA", bias: false },
{ code: "P053", name: "Oskar Lindgren", club: "UWA", bias: false },
{ code: "P054", name: "Aisha El-Sayed", club: "UWA", bias: false },
{ code: "P055", name: "Linh Tran", club: "UWA", bias: false },
{ code: "P056", name: "Diego Castillo", club: "UWA", bias: false },
{ code: "P057", name: "Fatima Al-Hassan", club: "UWA", bias: false },
{ code: "P058", name: "Olivia Montgomery", club: "UWA", bias: false },
{ code: "P059", name: "Thiago Oliveira", club: "TMU", bias: false },
{ code: "P060", name: "Zara Novak", club: "TMU", bias: false },
{ code: "P061", name: "Amina Yusuf", club: "TMU", bias: false },
{ code: "P062", name: "Hiroki Tanaka", club: "TMU", bias: false },
{ code: "P063", name: "Lucas Oliveira", club: "TMU", bias: false },
{ code: "P064", name: "Priya Singh", club: "TMU", bias: false },
{ code: "P065", name: "Li Wei", club: "TMU", bias: false },
{ code: "P066", name: "Jamal Thompson", club: "TMU", bias: false },
{ code: "P067", name: "Sofia García", club: "TMU", bias: false },
{ code: "P068", name: "Viktor Johansson", club: "MAR", bias: false },
{ code: "P069", name: "Zuri Ndlovu", club: "MAR", bias: false },
{ code: "P070", name: "Amara Diop", club: "MAR", bias: false },
{ code: "P071", name: "Kenji Watanabe", club: "MAR", bias: false },
{ code: "P072", name: "María Estévez", club: "MAR", bias: true },
{ code: "P073", name: "Oskar Lindgren", club: "MAR", bias: false },
{ code: "P074", name: "Aisha El-Sayed", club: "MAR", bias: false },
{ code: "P075", name: "Linh Tran", club: "MAR", bias: false },
{ code: "P076", name: "Diego Castillo", club: "MAR", bias: false },
{ code: "P077", name: "Fatima Al-Hassan", club: "ARC", bias: false },
{ code: "P078", name: "Olivia Montgomery", club: "ARC", bias: false },
{ code: "P079", name: "Thiago Oliveira", club: "ARC", bias: false },
{ code: "P080", name: "Zara Novak", club: "ARC", bias: false },
{ code: "P081", name: "Amina Yusuf", club: "ARC", bias: false },
{ code: "P082", name: "Hiroki Tanaka", club: "ARC", bias: false },
{ code: "P083", name: "Lucas Oliveira", club: "ARC", bias: false },
{ code: "P084", name: "Priya Singh", club: "ARC", bias: false },
{ code: "P085", name: "Li Wei", club: "ARC", bias: false },
{ code: "P086", name: "Jamal Thompson", club: "BLU", bias: false },
{ code: "P087", name: "Sofia García", club: "BLU", bias: false },
{ code: "P088", name: "Viktor Johansson", club: "BLU", bias: false },
{ code: "P089", name: "Zuri Ndlovu", club: "BLU", bias: false },
{ code: "P090", name: "Amara Diop", club: "BLU", bias: false },
{ code: "P091", name: "Kenji Watanabe", club: "BLU", bias: false },
{ code: "P092", name: "María Estévez", club: "BLU", bias: false },
{ code: "P093", name: "Oskar Lindgren", club: "BLU", bias: false },
{ code: "P094", name: "Aisha El-Sayed", club: "BLU", bias: false },
{ code: "P095", name: "Linh Tran", club: "GRN", bias: false },
{ code: "P096", name: "Diego Castillo", club: "GRN", bias: false },
{ code: "P097", name: "Fatima Al-Hassan", club: "GRN", bias: false },
{ code: "P098", name: "Olivia Montgomery", club: "GRN", bias: false },
{ code: "P099", name: "Thiago Oliveira", club: "GRN", bias: false },
{ code: "P100", name: "Zara Novak", club: "GRN", bias: false },
{ code: "P101", name: "Amina Yusuf", club: "GRN", bias: false },
{ code: "P102", name: "Hiroki Tanaka", club: "GRN", bias: false },
{ code: "P103", name: "Lucas Oliveira", club: "GRN", bias: false },
];

// const brackets = assignBrackets(divisionAPlayers);
// console.log(JSON.stringify(brackets, null, 2));
