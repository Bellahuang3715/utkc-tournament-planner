import React, { useEffect, useMemo, useState } from "react";

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
  arrangePlayers,
  seedingNote,
  type DemoPlayer,
  type LookupPerson,
} from "./fixtures";

function scoreLabel(score: string) {
  const shown = circledScoreDisplay(score);
  return shown || "–";
}

function pointCount(score: string) {
  return Array.from(tournamentMkdtScoreInput(score)).filter((ch) => "MKDTI".includes(ch)).length;
}

function PlayerChip({ player }: { player: DemoPlayer }) {
  return (
    <div className={classes.chip}>
      <i className={classes.dotClub} style={{ background: player.color }} aria-hidden="true" />
      <b>{player.name}</b>
      {player.bias ? <span className={classes.seed}>Bias</span> : null}
      <em>{player.club}</em>
    </div>
  );
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
  const [separateClub, setSeparateClub] = useState(true);
  const [separateBias, setSeparateBias] = useState(true);
  const [left, right] = useMemo(
    () => arrangePlayers(separateClub, separateBias),
    [separateClub, separateBias],
  );

  return (
    <Stage title="Division A · 8 players">
      <div className={classes.toolbar}>
        <button
          type="button"
          className={`${classes.smallBtn} ${separateClub ? classes.smallBtnPrimary : ""}`}
          aria-pressed={separateClub}
          onClick={() => setSeparateClub((value) => !value)}
        >
          Keep same club apart
        </button>
        <button
          type="button"
          className={`${classes.smallBtn} ${separateBias ? classes.smallBtnPrimary : ""}`}
          aria-pressed={separateBias}
          onClick={() => setSeparateBias((value) => !value)}
        >
          Keep biased players apart
        </button>
      </div>
      <div className={classes.halves}>
        {[
          ["Group 1", left],
          ["Group 2", right],
        ].map(([label, group]) => (
          <div key={String(label)}>
            <p className={classes.halfLabel}>{label}</p>
            <div className={classes.halfMatches}>
              {(group as DemoPlayer[]).reduce<DemoPlayer[][]>((pairs, player, index) => {
                if (index % 2 === 0) pairs.push([player]);
                else pairs[pairs.length - 1].push(player);
                return pairs;
              }, []).map((pair) => (
                <div className={classes.pair} key={pair.map((player) => player.id).join("-")}>
                  <PlayerChip player={pair[0]} />
                  {pair[1] ? (
                    <>
                      <div className={classes.vs}>vs</div>
                      <PlayerChip player={pair[1]} />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className={classes.note} aria-live="polite">
        {seedingNote(separateClub, separateBias)}
      </p>
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
    body: "Drop players into a division. KenManage seeds groups so people from the same club, and players you mark as biased, land as far apart as the draw allows.",
    caps: ["Players and teams", "Club", "Bias"],
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
          A division of eight. Turn the rules off and clubmates open against each other. Turn them
          on and the groups redraw.
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
