import {
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Expanded } from "tournament-brackets-ui";

import {
  circledScoreDisplay,
  tournamentMkdtScoreInput,
} from "../../utils/score_notation";
import classes from "../landing/landing.module.css";
import {
  COURTS,
  HERO_SLIDES,
  LOOKUP,
  PLAYERS,
  PROBLEM_TOPICS,
  arrangePlayers,
  seedingNote,
  type DayStepId,
  type DemoPlayer,
  type LookupPerson,
} from "./fixtures";

const DEMO_CLUB_ABBREV: Record<string, string> = {
  Toronto: "TOR",
  Montreal: "MTL",
  Vancouver: "VAN",
  Ottawa: "OTT",
};

function toBracketPlayers(group: DemoPlayer[]) {
  return group.map((player) => ({
    id: player.code,
    name: player.name,
    club: DEMO_CLUB_ABBREV[player.club] ?? player.club.slice(0, 3).toUpperCase(),
  }));
}

function scoreLabel(score: string) {
  const shown = circledScoreDisplay(score);
  return shown || "–";
}

function pointCount(score: string) {
  return Array.from(tournamentMkdtScoreInput(score)).filter((ch) => "MKDTI".includes(ch)).length;
}

function Stage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={classes.stage}>
      <div className={classes.stageBar} aria-hidden="true">
        <i />
        <i />
        <i />
        <span>{title}</span>
      </div>
      <div className={classes.stageBody}>{children}</div>
    </div>
  );
}

function ImportVisual() {
  return (
    <div className={classes.dayVisualInner} data-kind="import" aria-hidden="true">
      <div className={classes.daySheets}>
        <span>TOR.xlsx</span>
        <span>MTL.xlsx</span>
        <span>VAN.xlsx</span>
      </div>
      <div className={classes.dayArrow}>↓ one roster</div>
      <div className={classes.dayTable}>
        <div className={classes.dayTableHead}>
          <span>Name</span>
          <span>Club</span>
          <span>Rank</span>
          <span>Code</span>
        </div>
        <div className={classes.dayTableRow}>
          <span>Aiko Sato</span>
          <span>Toronto</span>
          <span>3 dan</span>
          <span>T-01</span>
        </div>
        <div className={classes.dayTableRow}>
          <span>Mei Chen</span>
          <span>Montreal</span>
          <span>2 dan</span>
          <span>M-04</span>
        </div>
        <div className={classes.dayTableRow}>
          <span>Hana Kim</span>
          <span>Vancouver</span>
          <span>1 kyu</span>
          <span>V-03</span>
        </div>
      </div>
      <div className={classes.dayFoot}>
        <span>48 players</span>
        <span>Filter · build divisions</span>
      </div>
      <span className={classes.dayChip}>Import once</span>
    </div>
  );
}

function BracketsVisual() {
  return (
    <div className={classes.dayVisualInner} data-kind="brackets" aria-hidden="true">
      <div className={classes.dayBracket}>
        <div className={classes.dayBracketRound}>
          <div className={classes.dayMatch}>
            <span>
              <i style={{ background: "#c41e3a" }} />
              Sato
              <em title="Strong player">★</em>
            </span>
            <span>
              <i style={{ background: "#1d4f91" }} />
              Chen
            </span>
          </div>
          <div className={classes.dayMatch}>
            <span>
              <i style={{ background: "#0b1f3a" }} />
              Kim
            </span>
            <span>
              <i style={{ background: "#4a6fa5" }} />
              Abe
            </span>
          </div>
        </div>
        <div className={classes.dayBracketLines} />
        <div className={classes.dayBracketRound}>
          <div className={`${classes.dayMatch} ${classes.dayMatchFinal}`}>
            <span>Winner SF1</span>
            <span>Winner SF2</span>
          </div>
        </div>
      </div>
      <div className={classes.dayRuleRow}>
        <span>Clubs apart</span>
        <span>Bias apart</span>
        <span data-tone="neutral">Export PDF</span>
      </div>
      <div className={classes.dayFoot}>
        <span>8 players · 2 groups</span>
        <span>Generate, then tweak</span>
      </div>
    </div>
  );
}

function CourtsVisual() {
  return (
    <div className={classes.dayVisualInner} data-kind="courts" aria-hidden="true">
      <div className={classes.dayCourtsWrap}>
        <div className={classes.dayTimeRail} aria-hidden="true">
          <span>9:00</span>
          <span>9:30</span>
          <span>10:00</span>
        </div>
        <div className={classes.dayCourts}>
          {["Court 1", "Court 2", "Court 3"].map((name, index) => (
            <div key={name} className={classes.dayCourtCol}>
              <p>{name}</p>
              <div
                className={classes.dayCourtBlock}
                data-kind={index === 0 ? "live" : index === 1 ? "wait" : "done"}
                style={{ marginTop: index === 1 ? 18 : index === 2 ? 8 : 0 }}
              >
                {index === 0 ? "Div A · G1" : index === 1 ? "Div B · G2" : "Team · Final"}
              </div>
              <div
                className={classes.dayCourtBlock}
                data-kind={index === 0 ? "wait" : "done"}
                style={{ height: index === 2 ? 28 : 36 }}
              >
                {index === 0 ? "Div A · G2" : index === 1 ? "Break" : "Done"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={classes.dayFoot}>
        <span>Same division staggered</span>
        <span>Drag blocks onto courts</span>
      </div>
      <span className={classes.dayChip}>No double-book</span>
    </div>
  );
}

function ScoreVisual() {
  return (
    <div className={classes.dayVisualInner} data-kind="score" aria-hidden="true">
      <div className={classes.dayScoreLayout}>
        <div className={classes.dayScoreCard}>
          <div className={classes.dayScoreMeta}>
            <span className={classes.live}>
              <i />
              Live
            </span>
            <span>Semi 1 · Court 2</span>
          </div>
          <div className={classes.dayScoreRow}>
            <span className={classes.dayScoreName}>Aiko Sato</span>
            <span className={classes.dayMarks}>
              <b>K</b>
              <b data-empty="true" />
            </span>
          </div>
          <div className={`${classes.dayScoreRow} ${classes.dayScoreWinner}`}>
            <span className={classes.dayScoreName}>
              Mei Chen <em>wins</em>
            </span>
            <span className={classes.dayMarks}>
              <b>M</b>
              <b>K</b>
            </span>
          </div>
        </div>
        <div className={classes.dayScoreSide}>
          <div className={classes.dayMarkPad}>
            <span>M</span>
            <span>K</span>
            <span>D</span>
            <span>T</span>
          </div>
          <div className={classes.dayFoot} style={{ paddingRight: 0 }}>
            <span>1 editor at a time</span>
            <span>Bracket updates live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishVisual() {
  return (
    <div className={classes.dayVisualInner} data-kind="publish" aria-hidden="true">
      <div className={classes.dayPublishRow}>
        <div className={classes.dayPhone}>
          <div className={classes.dayPhoneBar} />
          <p className={classes.dayPhoneCode}>UTKC26</p>
          <div className={classes.dayPhoneTabs}>
            <span data-active="true">Schedule</span>
            <span>Brackets</span>
            <span>Scores</span>
          </div>
          <div className={classes.dayPhoneRows}>
            <div>
              <strong>Court 1</strong>
              <span>Sato vs Chen · 10:20</span>
            </div>
            <div>
              <strong>Court 2</strong>
              <span>Kim vs Abe · 10:20</span>
            </div>
          </div>
        </div>
        <div className={classes.dayShareStack}>
          <div className={classes.dayShareCard}>
            <p>Participants</p>
            <strong>kenmanage.app/join</strong>
            <span>Code · UTKC26</span>
          </div>
          <div className={classes.dayShareCard}>
            <p>Scorekeepers</p>
            <strong>Access code</strong>
            <span data-tone="neutral">SK-4F91</span>
          </div>
          <p className={classes.dayShareNote}>No account needed</p>
        </div>
      </div>
    </div>
  );
}

const DAY_VISUALS: Record<DayStepId, () => React.ReactNode> = {
  import: ImportVisual,
  brackets: BracketsVisual,
  courts: CourtsVisual,
  score: ScoreVisual,
  publish: PublishVisual,
};

/** Compact product mock for each “A tournament day” step. */
export function DayStepVisual({ stepId }: { stepId: DayStepId }) {
  const Visual = DAY_VISUALS[stepId];
  return (
    <div className={classes.dayVisual} role="img" aria-label={`Illustration for ${stepId}`}>
      <Visual />
    </div>
  );
}

export function HeroBoard() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = HERO_SLIDES[index];

  useEffect(() => {
    if (paused) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [paused]);

  const show = (next: number) => {
    setPaused(true);
    setIndex(next);
  };

  return (
    <div className={classes.board} aria-label="Sample court board">
      <div className={classes.boardTop}>
        <span className={classes.live}>
          <i />
          Live courts
        </span>
        <button
          type="button"
          className={classes.textBtn}
          onClick={() => show((index + 1) % HERO_SLIDES.length)}
        >
          {slide.label}
        </button>
      </div>
      <div className={classes.boardList}>
        {slide.rows.map((row) => (
          <div className={classes.boardRow} key={`${slide.label}-${row.court}`}>
            <span className={classes.courtNo}>{row.court}</span>
            <span
              className={`${classes.name} ${
                row.winner === "left" ? classes.winner : row.winner === "right" ? classes.doneLoser : ""
              }`}
            >
              {row.left}
            </span>
            <span className={classes.score}>
              {scoreLabel(row.leftScore)} {scoreLabel(row.rightScore)}
            </span>
            <span
              className={`${classes.name} ${classes.nameRight} ${
                row.winner === "right" ? classes.winner : row.winner === "left" ? classes.doneLoser : ""
              }`}
            >
              {row.right}
            </span>
            <p className={classes.meta}>{row.meta}</p>
          </div>
        ))}
      </div>
      <div className={classes.dots}>
        {HERO_SLIDES.map((item, dotIndex) => (
          <button
            key={item.label}
            type="button"
            className={classes.dot}
            data-active={dotIndex === index ? "true" : "false"}
            aria-label={`Show ${item.label}`}
            aria-current={dotIndex === index ? "true" : undefined}
            onClick={() => show(dotIndex)}
          />
        ))}
      </div>
    </div>
  );
}

export function SeedingDemo() {
  const { colorScheme } = useMantineColorScheme();
  const bracketTheme = colorScheme === "dark" ? "dark" : "light";
  const [separateClub, setSeparateClub] = useState(true);
  const [separateBias, setSeparateBias] = useState(true);
  const [left, right] = useMemo(
    () => arrangePlayers(separateClub, separateBias),
    [separateClub, separateBias],
  );

  const groups = [
    { label: "Group 1", players: left },
    { label: "Group 2", players: right },
  ];

  return (
    <Stage title="Edit seeding · Division A">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Text size="sm" c="dimmed">
            8 players · 2 brackets
          </Text>
          <Group gap="lg" wrap="wrap">
            <Switch
              label="Keep same club apart"
              checked={separateClub}
              onChange={(event) => setSeparateClub(event.currentTarget.checked)}
            />
            <Switch
              label="Keep biased players apart"
              checked={separateBias}
              onChange={(event) => setSeparateBias(event.currentTarget.checked)}
            />
          </Group>
        </Group>

        <Suspense
          fallback={
            <Center mih={180}>
              <Loader size="sm" />
            </Center>
          }
        >
          <Group align="flex-start" gap="md" wrap="wrap" grow preventGrowOverflow={false}>
            {groups.map((group) => (
              <Paper
                key={group.label}
                withBorder
                radius="md"
                p="md"
                style={{ flex: "1 1 280px", minWidth: 0 }}
              >
                <Badge variant="light" mb="sm">
                  {group.label}
                </Badge>
                <Box style={{ maxWidth: "100%", overflowX: "auto" }}>
                  <Expanded.Individuals
                    key={`${group.label}-${separateClub}-${separateBias}-${group.players
                      .map((p) => p.id)
                      .join("-")}`}
                    size={4}
                    players={toBracketPlayers(group.players)}
                    theme={bracketTheme}
                  />
                </Box>
              </Paper>
            ))}
          </Group>
        </Suspense>

        <Text size="sm" c="dimmed" aria-live="polite">
          {seedingNote(separateClub, separateBias)} Sample data only — same bracket trees as in the
          organizer seeding editor.
        </Text>
      </Stack>
    </Stage>
  );
}

export function ScheduleDemo() {
  const [selectedId, setSelectedId] = useState("1a");
  const selected = COURTS.flatMap((court) =>
    court.blocks.map((block) => ({ ...block, court: court.name })),
  ).find((block) => block.id === selectedId);

  return (
    <Stage title="Saturday · three courts">
      <div className={classes.courts}>
        {COURTS.map((court) => (
          <div key={court.name}>
            <p className={classes.courtName}>{court.name}</p>
            {court.blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                className={classes.block}
                data-kind={block.kind}
                data-active={block.id === selectedId ? "true" : "false"}
                onClick={() => setSelectedId(block.id)}
              >
                <span className={classes.blockTime}>{block.time}</span>
                <span className={classes.blockTitle}>
                  {block.now ? <i className={classes.nowDot} /> : null}
                  {block.title}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {selected ? (
        <p className={classes.detail}>
          <strong>
            {selected.court} · {selected.title}
          </strong>
          {selected.time}. {selected.detail}
        </p>
      ) : null}
    </Stage>
  );
}

type MiniMatch = {
  id: string;
  label: string;
  aName: string;
  bName: string;
  aScore: string;
  bScore: string;
};

const OPENING_MATCHES: MiniMatch[] = [
  { id: "sf1", label: "Semi 1", aName: "Aiko Sato", bName: "Mei Chen", aScore: "", bScore: "" },
  { id: "sf2", label: "Semi 2", aName: "Hana Kim", bName: "Yuki Abe", aScore: "K", bScore: "" },
];

function winnerName(match: MiniMatch): string | null {
  const a = pointCount(match.aScore);
  const b = pointCount(match.bScore);
  if (a >= 2 && a > b) return match.aName;
  if (b >= 2 && b > a) return match.bName;
  return null;
}

export function ScoresDemo() {
  const [matches, setMatches] = useState<MiniMatch[]>(OPENING_MATCHES);
  const [selectedId, setSelectedId] = useState(OPENING_MATCHES[0].id);
  const [side, setSide] = useState<"a" | "b">("a");
  const [locked, setLocked] = useState(false);
  const selected = matches.find((match) => match.id === selectedId) ?? matches[0];

  const addMark = (mark: string) => {
    if (locked) return;
    setMatches((current) =>
      current.map((match) => {
        if (match.id !== selected.id) return match;
        const key = side === "a" ? "aScore" : "bScore";
        return { ...match, [key]: tournamentMkdtScoreInput(match[key] + mark) };
      }),
    );
  };

  const finalists = matches.map((match) => winnerName(match) ?? "Winner");
  const decided = finalists.filter((name) => name !== "Winner").length;
  const finalNote =
    decided === 2
      ? "Both semis are decided. The final cell is filled."
      : decided === 1
        ? "One semi is in the final. Two points decides the other."
        : "Two points wins the match. The final cell fills in when a semi is decided.";

  return (
    <Stage title="Mudansha · group 1">
      <div className={classes.halves}>
        {matches.map((match) => (
          <div key={match.id}>
            <p className={classes.halfLabel}>{match.label}</p>
            <button
              type="button"
              className={classes.result}
              data-active={match.id === selected.id ? "true" : "false"}
              onClick={() => setSelectedId(match.id)}
            >
              <span>
                {match.aName}
                <br />
                {match.bName}
              </span>
              <small>
                {scoreLabel(match.aScore)} {scoreLabel(match.bScore)}
              </small>
            </button>
          </div>
        ))}
      </div>
      <div className={classes.match}>
        <div>
          <button
            type="button"
            className={`${classes.side} ${classes.sideBtn}`}
            data-active={side === "a" ? "true" : "false"}
            onClick={() => setSide("a")}
          >
            <span className={winnerName(selected) === selected.aName ? classes.decided : undefined}>
              {selected.aName}
            </span>
            <span className={classes.points}>{scoreLabel(selected.aScore)}</span>
          </button>
          <button
            type="button"
            className={`${classes.side} ${classes.sideBtn}`}
            data-active={side === "b" ? "true" : "false"}
            onClick={() => setSide("b")}
          >
            <span className={winnerName(selected) === selected.bName ? classes.decided : undefined}>
              {selected.bName}
            </span>
            <span className={classes.points}>{scoreLabel(selected.bScore)}</span>
          </button>
        </div>
        <div className={classes.pointCol}>
          {["M", "K", "D", "H"].map((mark) => (
            <button
              key={mark}
              type="button"
              className={classes.pointBtn}
              disabled={locked}
              onClick={() => addMark(mark)}
              aria-label={`Add ${mark} for ${side === "a" ? selected.aName : selected.bName}`}
            >
              {mark}
            </button>
          ))}
        </div>
      </div>
      <p className={classes.pass}>
        Final · {finalists[0]} vs {finalists[1]}
        <span>{finalNote}</span>
      </p>
      <button
        type="button"
        className={classes.lockBtn}
        data-locked={locked ? "true" : "false"}
        onClick={() => setLocked((value) => !value)}
      >
        {locked ? "Another scorekeeper is editing" : "Sheet is open"}
      </button>
    </Stage>
  );
}

export function LookupDemo() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LookupPerson | null>(LOOKUP[0]);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? LOOKUP.filter(
        (person) =>
          person.name.toLowerCase().includes(needle) ||
          person.code.toLowerCase().includes(needle) ||
          person.club.toLowerCase().includes(needle),
      )
    : LOOKUP;

  return (
    <Stage title="Find my matches">
      <input
        className={classes.search}
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          const filtered = next.trim()
            ? LOOKUP.filter((person) => {
                const q = next.trim().toLowerCase();
                return (
                  person.name.toLowerCase().includes(q) ||
                  person.code.toLowerCase().includes(q) ||
                  person.club.toLowerCase().includes(q)
                );
              })
            : LOOKUP;
          setSelected(filtered[0] ?? null);
        }}
        placeholder="Name, club, or player code"
        aria-label="Search the sample roster"
      />
      <div className={classes.results}>
        {matches.map((person) => (
          <button
            key={person.code}
            type="button"
            className={classes.result}
            data-active={selected?.code === person.code ? "true" : "false"}
            onClick={() => setSelected(person)}
          >
            <span>
              {person.name}
              <br />
              <small>
                {person.code} · {person.club}
              </small>
            </span>
            <small>{person.when}</small>
          </button>
        ))}
      </div>
      {selected ? (
        <p className={classes.pass}>
          {selected.name}
          <span>
            {selected.when} · {selected.court} vs {selected.opponent}
          </span>
          <span>{selected.result}</span>
        </p>
      ) : (
        <p className={classes.note}>No one in this sample matches that. Try Sato, T-01, or Ottawa.</p>
      )}
    </Stage>
  );
}

const FEATURES = [
  {
    id: "seeding",
    label: "Seeding",
    title: "Keep clubs and rivals apart",
    body: "The same bracket trees as Edit seeding. Toggle club and bias rules and watch the groups redraw.",
    caps: ["Expanded brackets", "Club", "Bias"],
    demo: <SeedingDemo />,
  },
  {
    id: "schedule",
    label: "Courts",
    title: "See the day by court",
    body: "Each division block takes its match length plus the margin you set. Select a block to see what is on that court and when.",
    caps: ["Courts", "Match length", "Margins"],
    demo: <ScheduleDemo />,
  },
  {
    id: "scores",
    label: "Scores",
    title: "Record a match as it happens",
    body: "Scorekeepers enter men, kote, do, and hansoku. The bracket cell updates on the sheet. One person edits a group at a time.",
    caps: ["Live scores", "One editor"],
    demo: <ScoresDemo />,
  },
  {
    id: "lookup",
    label: "Participants",
    title: "Find yourself without an account",
    body: "Participants type a name or player code and see their matches, court, and result. This sample roster is not a live tournament.",
    caps: ["No account", "Schedule", "Results"],
    demo: <LookupDemo />,
  },
] as const;

export function FeatureStudio() {
  const [active, setActive] = useState<(typeof FEATURES)[number]["id"]>("seeding");
  const feature = FEATURES.find((item) => item.id === active) ?? FEATURES[0];

  return (
    <>
      <div className={classes.studioHead}>
        <div className={classes.tabs} role="tablist" aria-label="Features">
          {FEATURES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={classes.tab}
              role="tab"
              aria-selected={item.id === feature.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className={classes.studio}>
        <div className={classes.studioCopy}>
          <h3 className={classes.display}>{feature.title}</h3>
          <p>{feature.body}</p>
          <ul className={classes.caps}>
            {feature.caps.map((cap) => (
              <li key={cap}>{cap}</li>
            ))}
          </ul>
        </div>
        {feature.demo}
      </div>
    </>
  );
}

export function SeedingStudio() {
  return (
    <div className={classes.studio}>
      <div className={classes.studioCopy}>
        <h3 className={classes.display}>Keep clubs and rivals apart</h3>
        <p>
          The same expanded bracket trees you get in Edit seeding. Toggle the club and bias rules —
          groups redraw the way KenManage seeds a division.
        </p>
        <ul className={classes.caps}>
          {PLAYERS.reduce<string[]>((clubs, player) => {
            if (!clubs.includes(player.club)) clubs.push(player.club);
            return clubs;
          }, []).map((club) => (
            <li key={club}>{club}</li>
          ))}
        </ul>
      </div>
      <SeedingDemo />
    </div>
  );
}

/** Traditional-vs-KenManage comparison table for the landing page. */
export function ProblemStudio() {
  const [mode, setMode] = useState<"summary" | "full">("summary");
  const full = mode === "full";

  return (
    <div className={classes.compareBlock}>
      <div className={classes.compareToolbar}>
        <p className={classes.compareCaption}>Traditional tournament planning vs KenManage</p>
        <div className={classes.compareMode} role="group" aria-label="Table detail level">
          <button
            type="button"
            className={classes.compareModeBtn}
            data-active={mode === "summary" ? "true" : "false"}
            aria-pressed={mode === "summary"}
            onClick={() => setMode("summary")}
          >
            Summary
          </button>
          <button
            type="button"
            className={classes.compareModeBtn}
            data-active={mode === "full" ? "true" : "false"}
            aria-pressed={mode === "full"}
            onClick={() => setMode("full")}
          >
            Full
          </button>
        </div>
      </div>
      <div className={classes.compareTableWrap}>
        <table className={classes.compareTable} data-mode={mode}>
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Traditional</th>
              <th scope="col">KenManage</th>
            </tr>
          </thead>
          <tbody>
            {PROBLEM_TOPICS.map((item) => (
              <tr key={item.id}>
                <th scope="row">{item.label}</th>
                <td>
                  {full ? (
                    <ul className={classes.compareList}>
                      {item.before.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={classes.compareSummary}>{item.beforeSummary}</p>
                  )}
                </td>
                <td className={classes.compareAfter}>
                  {full ? (
                    <ul className={classes.compareList}>
                      {item.after.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={classes.compareSummary}>{item.afterSummary}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
