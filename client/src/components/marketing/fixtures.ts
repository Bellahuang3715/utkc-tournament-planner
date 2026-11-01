export const GITHUB_URL = "https://github.com/Bellahuang3715/utkc-tournament-planner";
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;
export const BRACKET_URL = "https://github.com/evroon/bracket";
export const LICENSE_FILE_URL = `${GITHUB_URL}/blob/main/LICENSE`;
export const CONTACT_EMAIL = "kenmanage@gmail.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
/** Site logo in `client/public/KenManage.png` → `/KenManage.png` */
export const LOGO_SRC = "/KenManage.png";

export type DemoPlayer = {
  id: string;
  name: string;
  club: string;
  color: string;
  bias: boolean;
  code: string;
};

/** Adjacent clubmates so the unsorted draw looks clustered. */
export const PLAYERS: DemoPlayer[] = [
  { id: "sato", name: "Aiko Sato", club: "Toronto", color: "#c41e3a", bias: true, code: "T-01" },
  { id: "mori", name: "Kenji Mori", club: "Toronto", color: "#c41e3a", bias: false, code: "T-02" },
  { id: "chen", name: "Mei Chen", club: "Montreal", color: "#1d4f91", bias: true, code: "M-04" },
  { id: "tanaka", name: "Ryu Tanaka", club: "Montreal", color: "#1d4f91", bias: false, code: "M-05" },
  { id: "kim", name: "Hana Kim", club: "Vancouver", color: "#0b1f3a", bias: false, code: "V-03" },
  { id: "park", name: "Leo Park", club: "Vancouver", color: "#0b1f3a", bias: true, code: "V-08" },
  { id: "nguyen", name: "Sora Nguyen", club: "Ottawa", color: "#4a6fa5", bias: false, code: "O-02" },
  { id: "abe", name: "Yuki Abe", club: "Ottawa", color: "#4a6fa5", bias: false, code: "O-06" },
];

export function arrangePlayers(
  separateClub: boolean,
  separateBias: boolean,
): [DemoPlayer[], DemoPlayer[]] {
  if (!separateClub && !separateBias) {
    return [PLAYERS.slice(0, 4), PLAYERS.slice(4)];
  }

  const ordered = separateBias
    ? [...PLAYERS.filter((p) => p.bias), ...PLAYERS.filter((p) => !p.bias)]
    : [...PLAYERS];

  const groups: DemoPlayer[][] = [[], []];
  const clubCount = (group: DemoPlayer[], club: string) =>
    group.filter((p) => p.club === club).length;
  const biasCount = (group: DemoPlayer[]) => group.filter((p) => p.bias).length;

  for (const player of ordered) {
    const scores = [0, 1].map((index) => {
      const group = groups[index];
      if (group.length >= 4) return Number.POSITIVE_INFINITY;
      let score = group.length;
      if (separateClub) score += clubCount(group, player.club) * 10;
      if (separateBias && player.bias) score += biasCount(group) * 20;
      return score;
    });
    groups[scores[0] <= scores[1] ? 0 : 1].push(player);
  }

  return [groups[0], groups[1]];
}

export function seedingNote(separateClub: boolean, separateBias: boolean): string {
  if (separateClub && separateBias) {
    return "Biased players are spread across the groups, and clubmates are split when the draw allows.";
  }
  if (separateBias) {
    return "Players marked bias are placed in opposite groups. Clubs can still meet.";
  }
  if (separateClub) {
    return "Clubmates are spread across the two groups. Bias is ignored.";
  }
  return "Players stay in list order, so clubmates open against each other. Turn a rule on to redraw.";
}

export type ScheduleBlock = {
  id: string;
  time: string;
  title: string;
  kind: "division" | "gap";
  now?: boolean;
  detail: string;
};

export const COURTS: { name: string; blocks: ScheduleBlock[] }[] = [
  {
    name: "Court 1",
    blocks: [
      {
        id: "1a",
        time: "9:00–10:20",
        title: "Mudansha",
        kind: "division",
        now: true,
        detail: "Individuals · 8 players · about 20 minutes a match, plus the margin you set.",
      },
      {
        id: "1g",
        time: "10:20–10:40",
        title: "Changeover",
        kind: "gap",
        detail: "Margin between divisions so the court can reset before the next block.",
      },
      {
        id: "1b",
        time: "10:40–12:20",
        title: "Yudansha",
        kind: "division",
        detail: "Individuals · follows Mudansha on this court once that block ends.",
      },
    ],
  },
  {
    name: "Court 2",
    blocks: [
      {
        id: "2a",
        time: "9:00–10:40",
        title: "Women's",
        kind: "division",
        detail: "Individuals · runs beside Mudansha so both courts stay busy.",
      },
      {
        id: "2g",
        time: "10:40–11:00",
        title: "Changeover",
        kind: "gap",
        detail: "Short margin before the team division.",
      },
      {
        id: "2b",
        time: "11:00–12:40",
        title: "Teams",
        kind: "division",
        detail: "Team division · a longer block than the individual pools.",
      },
    ],
  },
  {
    name: "Court 3",
    blocks: [
      {
        id: "3a",
        time: "9:30–11:00",
        title: "Junior",
        kind: "division",
        detail: "Individuals · starts after the senior courts are already underway.",
      },
      {
        id: "3b",
        time: "11:20–12:40",
        title: "Finals",
        kind: "division",
        detail: "Finals once the morning pools are finished.",
      },
    ],
  },
];

export type LookupPerson = {
  name: string;
  code: string;
  club: string;
  court: string;
  when: string;
  opponent: string;
  result: string;
};

export const LOOKUP: LookupPerson[] = [
  {
    name: "Aiko Sato",
    code: "T-01",
    club: "Toronto",
    court: "Court 2",
    when: "11:20",
    opponent: "Hana Kim",
    result: "Won the first match · men",
  },
  {
    name: "Mei Chen",
    code: "M-04",
    club: "Montreal",
    court: "Court 1",
    when: "Finished",
    opponent: "Aiko Sato",
    result: "Lost the first match · kote",
  },
  {
    name: "Hana Kim",
    code: "V-03",
    club: "Vancouver",
    court: "Court 2",
    when: "11:20",
    opponent: "Aiko Sato",
    result: "Semi-final is next",
  },
  {
    name: "Yuki Abe",
    code: "O-06",
    club: "Ottawa",
    court: "Court 3",
    when: "9:30",
    opponent: "Sora Nguyen",
    result: "On court now",
  },
  {
    name: "Kenji Mori",
    code: "T-02",
    club: "Toronto",
    court: "Court 1",
    when: "10:40",
    opponent: "Ryu Tanaka",
    result: "Waiting for Yudansha",
  },
];

export const HERO_SLIDES = [
  {
    label: "Morning pools",
    rows: [
      {
        court: "01",
        left: "Sato",
        right: "Chen",
        leftScore: "M",
        rightScore: "K",
        winner: "left" as const,
        meta: "Mudansha · Court 1 · in progress",
      },
      {
        court: "02",
        left: "Kim",
        right: "Abe",
        leftScore: "D",
        rightScore: "",
        winner: null,
        meta: "Women's · Court 2 · just started",
      },
    ],
  },
  {
    label: "Late morning",
    rows: [
      {
        court: "01",
        left: "Mori",
        right: "Tanaka",
        leftScore: "",
        rightScore: "",
        winner: null,
        meta: "Yudansha · Court 1 · up next",
      },
      {
        court: "03",
        left: "Nguyen",
        right: "Park",
        leftScore: "K",
        rightScore: "M",
        winner: "right" as const,
        meta: "Junior · Court 3 · in progress",
      },
    ],
  },
  {
    label: "Finals",
    rows: [
      {
        court: "03",
        left: "Sato",
        right: "Kim",
        leftScore: "M",
        rightScore: "D",
        winner: "left" as const,
        meta: "Final · Court 3 · decided",
      },
      {
        court: "02",
        left: "Chen",
        right: "Abe",
        leftScore: "K",
        rightScore: "K",
        winner: null,
        meta: "Third place · Court 2 · tied",
      },
    ],
  },
];

export const DAY_STEPS = [
  {
    label: "Import the roster",
    detail: "Skip the multi-club Excel merge — import once, then filter and build divisions.",
  },
  {
    label: "Draw the brackets",
    detail: "Skip hand-drawn trees — generate with club and bias rules, then tweak and export.",
  },
  {
    label: "Lay out the courts",
    detail: "Skip paper court grids — place blocks so the same division is not double-booked.",
  },
  {
    label: "Keep score",
    detail: "Skip poster, binder, and retyping — scorekeepers enter marks; the bracket updates live.",
  },
  {
    label: "Publish the day",
    detail: "Skip “where do I play?” chaos — share a code for schedule, brackets, and scores.",
  },
];

export type ProblemTopic = {
  id: string;
  label: string;
  /** One-line summary for the compact table view */
  beforeSummary: string;
  afterSummary: string;
  /** Full bullet list for the detailed table view */
  before: string[];
  after: string[];
};

/** Traditional tournament planning pain vs what KenManage ships today. */
export const PROBLEM_TOPICS: ProblemTopic[] = [
  {
    id: "roster",
    label: "Roster",
    beforeSummary: "Per-club Excels merged by hand over days",
    afterSummary: "Import once into a filterable player table",
    before: [
      "Each club fills its own Excel template",
      "Someone manually merges every sheet into one master table",
      "Counts, lunches, cost, and payment tracked in yet more spreadsheets",
    ],
    after: [
      "Import Excel into one tournament roster",
      "Filterable player table with club and custom fields",
      "No hand-stitched master sheet",
    ],
  },
  {
    id: "divisions",
    label: "Divisions & IDs",
    beforeSummary: "Manual grouping and invented participant codes",
    afterSummary: "Select players, generate division and codes",
    before: [
      "Manually assign players to divisions and invent participant IDs",
      "Split each division into groups by hand",
      "Easy to duplicate a player or mis-tag a club",
    ],
    after: [
      "Select players from the table and generate a division",
      "Optional code prefix assigns player codes automatically",
      "One roster feeds brackets — no copy-paste ID lists",
    ],
  },
  {
    id: "seeding",
    label: "Seeding",
    beforeSummary: "Hand-drawn Excel trees — hours of careful work",
    afterSummary: "Generate with club + bias rules in minutes",
    before: [
      "Trees drawn by hand in Excel — slow and error-prone",
      "Hard to keep same-club and strong players far apart",
      "Risk of bias (especially in your own division) or the same person twice",
    ],
    after: [
      "Generate brackets with club separation and strong-player bias rules",
      "Swap slots or regenerate when needed",
      "Export to Excel for print when the draw is final",
    ],
  },
  {
    id: "schedule",
    label: "Courts",
    beforeSummary: "Paper grids and same-division collisions",
    afterSummary: "Drag blocks onto a court timetable",
    before: [
      "Courts planned on paper or another spreadsheet",
      "Same-division groups often collide — bad for shinpan",
      "Hard for anyone to see the full day clearly",
    ],
    after: [
      "Drag division blocks onto a court timetable",
      "Block length from match duration + margin",
      "Avoid stacking the same division on top of itself",
    ],
  },
  {
    id: "scores",
    label: "Scorekeeping",
    beforeSummary: "Poster + binder + retype into a computer later",
    afterSummary: "Access code → live scores on the bracket",
    before: [
      "Poster for judges + binder copy + later computer entry",
      "Inconsistent marks and lost paper are common",
      "History is retyped after the fact",
    ],
    after: [
      "Scorekeepers enter results with an access code",
      "Bracket updates as matches finish",
      "One editor per sheet so two people do not overwrite each other",
    ],
  },
  {
    id: "participants",
    label: "Participant lookup",
    beforeSummary: "Booklets and word of mouth for “when / where”",
    afterSummary: "Public site from a short tournament code",
    before: [
      "Match info stuck in booklets, boards, or word of mouth",
      "Hard to know court, time, and opponent",
      "Updates do not reach everyone",
    ],
    after: [
      "Share a participant code — no account needed",
      "Look up by name or player code",
      "See schedule, brackets, and live scores on the public site",
      "Works best on a phone",
    ],
  },
  {
    id: "booklets",
    label: "Print & publish",
    beforeSummary: "Design and reprint paper booklets",
    afterSummary: "Excel export + live published board",
    before: [
      "Design, print, and assemble tournament booklets",
      "Any change means reprints or chaotic announcements",
    ],
    after: [
      "Export brackets to Excel when you still want paper",
      "Publish the live site so the day stays current",
    ],
  },
];
