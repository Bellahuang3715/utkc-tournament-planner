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

/** Icon keys mapped in the Features grid UI. */
export type FeatureIcon =
  | "import"
  | "seeding"
  | "courts"
  | "scores"
  | "participants"
  | "share";

export const FEATURES = [
  {
    id: "import",
    icon: "import" as FeatureIcon,
    title: "Roster import",
    body: "Drop club Excels into one filterable table — skip the multi-sheet merge that eats a weekend.",
  },
  {
    id: "seeding",
    icon: "seeding" as FeatureIcon,
    title: "Smart seeding",
    body: "A custom algorithm builds draws with club and strong-player rules — zero room for human error or bias. Tweak anything, then export.",
  },
  {
    id: "courts",
    icon: "courts" as FeatureIcon,
    title: "Court timetable",
    body: "Schedules auto-generate from match timing and placement rules, then you fine-tune blocks so divisions are not double-booked.",
  },
  {
    id: "scores",
    icon: "scores" as FeatureIcon,
    title: "Live scorekeeping",
    body: "Scorekeepers collaborate with an access code — real-time sync to the bracket, one editor per sheet so nothing gets overwritten.",
  },
  {
    id: "participants",
    icon: "participants" as FeatureIcon,
    title: "Participant site",
    body: "One short code. Athletes see schedule, brackets, and live scores on their phone — no account, no guessing where to play.",
  },
  {
    id: "share",
    icon: "share" as FeatureIcon,
    title: "One living record",
    body: "Participant and scorekeeper codes, Excel export when you want paper, and a centralized history of the day — not a binder that disappears after the awards.",
  },
] as const;

export type OrganizerStepRole = "Organizer" | "Scorekeeper" | "Participant";

export const ORGANIZER_STEPS = [
  {
    id: "account",
    label: "Create an account",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Register or log in. Organizers own tournament data; participants and scorekeepers never need an account.",
    shotLabel: "Screenshot: registration or login screen",
    imageSrc: null as string | null,
  },
  {
    id: "clubs",
    label: "Add clubs",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Create clubs once and reuse them across tournaments. Every imported player belongs to a club you pick in the wizard.",
    shotLabel: "Screenshot: clubs list and add-club form",
    imageSrc: null as string | null,
  },
  {
    id: "tournament",
    label: "Create a tournament",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Open a new event from the tournament list. This is the shell for roster, brackets, courts, and sharing codes.",
    shotLabel: "Screenshot: create tournament modal and tournament home",
    imageSrc: null as string | null,
  },
  {
    id: "settings",
    label: "Settings & codes",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Generate a participant code for the public site and a separate scorekeeper code. Publish or preview when ready.",
    shotLabel: "Screenshot: Settings with participant link, publish toggle, and scorekeeper code",
    imageSrc: null as string | null,
  },
  {
    id: "import",
    label: "Import the roster",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Import Excel into the players table — map headers once, filter, and build divisions from the same roster.",
    shotLabel: "Screenshot: Excel import mapping step",
    imageSrc: null as string | null,
  },
  {
    id: "brackets",
    label: "Divisions & brackets",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Create divisions, generate brackets with club and bias rules (teams optional), then tweak seeding before the day.",
    shotLabel: "Screenshot: generate-brackets wizard and seeding editor",
    imageSrc: null as string | null,
  },
  {
    id: "schedule",
    label: "Schedule courts",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Drag division blocks onto the court timetable. Block length comes from match duration plus margin.",
    shotLabel: "Screenshot: court timetable with dragged blocks",
    imageSrc: null as string | null,
  },
  {
    id: "score",
    label: "Run the day",
    role: "Scorekeeper" as OrganizerStepRole,
    detail:
      "Scorekeepers redeem the access code at /scorekeeping and enter marks. One editor per sheet; brackets update live for everyone.",
    shotLabel: "Screenshot: scores page with group edit lock",
    imageSrc: null as string | null,
  },
  {
    id: "participants",
    label: "Participants follow",
    role: "Participant" as OrganizerStepRole,
    detail:
      "Athletes open /t/{code} for schedule, brackets, and scores — look up by name or player code on a phone.",
    shotLabel: "Screenshot: participant public site on mobile",
    imageSrc: null as string | null,
  },
  {
    id: "export",
    label: "Export / wrap up",
    role: "Organizer" as OrganizerStepRole,
    detail:
      "Export brackets to Excel when you still want paper. End the tournament when the day is done.",
    shotLabel: "Screenshot: division export to Excel",
    imageSrc: null as string | null,
  },
] as const;

export type OrganizerStepId = (typeof ORGANIZER_STEPS)[number]["id"];

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

/** Traditional tournament planning vs. the KenManage workflow. */
export const PROBLEM_TOPICS: ProblemTopic[] = [
  {
    id: "roster",
    label: "Player Registration",
    beforeSummary: "Scattered Excel sheets. Hours of manual merging.",
    afterSummary: "One import. One organized tournament roster.",
    before: [
      "Every club submits its own Excel spreadsheet",
      "Organizers manually merge everything into a master roster",
      "Player counts, lunches, fees, and payments tracked separately",
    ],
    after: [
      "Import club spreadsheets into one tournament roster",
      "Browse and filter players by club and custom fields",
      "Keep registration details together — no more stitching sheets by hand",
    ],
  },
  {
    id: "divisions",
    label: "Divisions & Player IDs",
    beforeSummary: "Manual grouping. Endless ID management.",
    afterSummary: "Build divisions and assign player codes in a few clicks.",
    before: [
      "Manually sort players into divisions and assign IDs",
      "Split divisions into groups one player at a time",
      "Risk duplicate IDs, misplaced players, and incorrect club assignments",
    ],
    after: [
      "Select players directly from your tournament roster",
      "Generate divisions and groups without starting from scratch",
      "Automatically assign player codes with customizable prefixes",
    ],
  },
  {
    id: "seeding",
    label: "Bracket Generation",
    beforeSummary: "Hours drawing brackets and checking every placement.",
    afterSummary: "Generate balanced brackets with customizable seeding rules.",
    before: [
      "Draw bracket trees by hand in Excel",
      "Manually separate same-club competitors and account for strong players",
      "Double-check every placement to catch duplicates and potential bias",
    ],
    after: [
      "Generate brackets with club separation and strong-player bias rules",
      "Swap player positions or regenerate until the draw is right",
      "Export finalized brackets to Excel for printing",
    ],
  },
  {
    id: "schedule",
    label: "Court Scheduling",
    beforeSummary: "Paper schedules. Overlapping matches. Confusion.",
    afterSummary: "Build a clear court schedule with drag-and-drop.",
    before: [
      "Plan court assignments on paper or in separate spreadsheets",
      "Risk overlapping groups from the same division",
      "Struggle to see how the entire tournament day fits together",
    ],
    after: [
      "Drag division blocks onto a visual court timetable",
      "Set match durations and buffer times to plan court usage",
      "Keep groups from the same division from overlapping",
    ],
  },
  {
    id: "scores",
    label: "Live Scorekeeping",
    beforeSummary: "Paper score sheets. Manual updates. Retyping results.",
    afterSummary: "Enter scores once. See brackets update as matches finish.",
    before: [
      "Maintain separate posters, judge copies, and result binders",
      "Deal with inconsistent markings, misplaced sheets, and missing results",
      "Manually transfer match results into the computer afterward",
    ],
    after: [
      "Give scorekeepers access with a simple tournament code",
      "Update match results directly on the bracket",
      "Keep score entry organized with one editor per sheet",
    ],
  },
  {
    id: "participants",
    label: "Participant Experience",
    beforeSummary: "Hunting for match times, court assignments, and opponents.",
    afterSummary: "One code. The entire tournament at their fingertips.",
    before: [
      "Rely on printed booklets, announcement boards, and word of mouth",
      "Leave participants guessing about their next match and court",
      "Struggle to communicate schedule and result changes",
    ],
    after: [
      "Share a tournament code — no account required",
      "Let participants find themselves by name or player code",
      "Give everyone access to schedules, brackets, and live scores",
      "Make tournament information easy to check on a phone",
    ],
  },
  {
    id: "booklets",
    label: "Print & Publish",
    beforeSummary: "Design, print, assemble, and reprint every change.",
    afterSummary: "Keep digital results live. Export paper when you need it.",
    before: [
      "Spend time designing and assembling tournament booklets",
      "Reprint materials whenever brackets or schedules change",
      "Rely on announcements to communicate last-minute updates",
    ],
    after: [
      "Export finalized brackets to Excel for printing",
      "Publish a live tournament site for participants and spectators",
      "Keep everyone looking at the latest tournament information",
    ],
  },
];
