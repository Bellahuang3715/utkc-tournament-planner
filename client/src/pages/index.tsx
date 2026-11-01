import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  FeatureStudio,
  HeroBoard,
  ProblemStudio,
  SeedingStudio,
} from "../components/marketing/demos";
import { BRACKET_URL, DAY_STEPS, GITHUB_URL } from "../components/marketing/fixtures";
import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

const ROLES = [
  {
    title: "Participant",
    body: "Look up your day. No account.",
    points: [
      "Matches by name or code",
      "Full day schedule",
      "Brackets, scores, and results",
      "Works best on a phone",
    ],
    href: "/join",
    cta: "Enter a tournament code",
  },
  {
    title: "Scorekeeper",
    body: "Enter results with an access code.",
    points: ["Code from the organizer", "Scores for that tournament only", "One editor on a sheet at a time"],
    href: "/scorekeeping",
    cta: "Use an access code",
  },
  {
    title: "Organizer",
    body: "Weeks of prep → minutes in the app.",
    points: ["Import, brackets, and courts", "Codes for scorekeepers and participants", "Export when you still want paper"],
    href: "/login",
    cta: "Log in",
  },
];

const STEP_MS = 4200;

/** Public KenManage home. */
export default function HomePage() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % DAY_STEPS.length);
      setTick((value) => value + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const selectStep = (index: number) => {
    setPaused(true);
    setStep(index);
    setTick((value) => value + 1);
  };

  return (
    <MarketingShell>
      <section className={classes.hero}>
        <div className={`${classes.wrap} ${classes.heroGrid}`}>
          <div className={classes.heroCopy}>
            <p className={classes.eyebrow}>Kendo tournament software</p>
            <h1 className={`${classes.display} ${classes.brandHero}`}>KenManage</h1>
            <p className={classes.lede}>
              Cut tournament planning from weeks or months of spreadsheets down to minutes — one
              place for organizers, scorekeepers, and participants.
            </p>
            <div className={classes.heroActions}>
              <a className={`${classes.btn} ${classes.primary}`} href="#start">
                Get started
              </a>
              <Link className={`${classes.btn} ${classes.ghost}`} href="/guide">
                Read the guide
              </Link>
            </div>
            <p className={classes.fine}>
              Leave Excel merges, hand-drawn trees, and poster boards behind. Participants and
              scorekeepers do not need an account.
            </p>
          </div>
          <div className={classes.heroBoardWrap}>
            <HeroBoard />
          </div>
        </div>
      </section>

      <section
        id="about"
        className={`${classes.section} ${classes.sectionWash} ${classes.aboutAnchor}`}
      >
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Why KenManage</p>
            <h2 className={classes.display}>Weeks of planning. Minutes in KenManage.</h2>
            <p className={classes.deck}>
              Traditional kendo tournament prep can take weeks or months. KenManage collapses the
              same work — roster, brackets, courts, scores, and the public board — into minutes.
              Start with the Summary table; switch to Full when you want every bullet.
            </p>
            <ProblemStudio />
            <p className={classes.problemBridge}>
              Want to feel the seeding rules? Try the interactive draw below. Schedule, scoring, and
              participant lookup are further down.
            </p>
            <p className={classes.whyLine}>
              Built for real tournament days (including UTKC-scale events) — free under AGPL-3.0,
              grew out of <a href={BRACKET_URL}>Bracket</a>, source on{" "}
              <a href={GITHUB_URL}>GitHub</a>.
            </p>
          </Reveal>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>A tournament day</p>
            <h2 className={classes.display}>From a messy merge to a public board.</h2>
            <p className={classes.deck}>
              Five jobs in order. Each step replaces a manual bottleneck. Click anytime to take
              over.
            </p>
            <div
              className={classes.flow}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className={classes.stepList} role="tablist" aria-label="Tournament day">
                {DAY_STEPS.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    className={classes.step}
                    role="tab"
                    data-active={index === step ? "true" : "false"}
                    aria-selected={index === step}
                    onClick={() => selectStep(index)}
                  >
                    <span className={classes.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={classes.stepPanel}>
                <p key={`${step}-${tick}`} className={classes.stepDetail}>
                  {DAY_STEPS[step].detail}
                </p>
                <div
                  key={`progress-${tick}`}
                  className={classes.stepProgress}
                  data-running={paused ? "false" : "true"}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={`${classes.section} ${classes.sectionWash}`} style={{ paddingTop: 64 }}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Try a draw</p>
            <h2 className={classes.display}>Seeding you can see.</h2>
            <p className={classes.deck}>
              Real KenManage bracket trees (same component as Edit seeding). Toggle club and
              strong-player rules — sample players only; nothing is saved.
            </p>
            <SeedingStudio />
          </Reveal>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>In the product</p>
            <h2 className={classes.display}>Courts, scores, and lookup.</h2>
            <p className={classes.deck}>
              Working samples with made-up players. Switch tabs to try the pieces participants and
              scorekeepers actually use.
            </p>
            <FeatureStudio />
          </Reveal>
        </div>
      </section>

      <section className={`${classes.section} ${classes.sectionWash} ${classes.start}`} id="start">
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Get started</p>
            <h2 className={classes.display}>How are you joining?</h2>
            <p className={classes.deck}>
              Pick a role. New here? The <Link href="/guide">guide</Link> walks through each path.
              Organizers planning a full event can use the{" "}
              <Link href="/usage-guide">Usage Guide</Link>.
            </p>
            <div className={classes.roles}>
              {ROLES.map((role, index) => (
                <Reveal key={role.title} delay={index * 80}>
                  <article className={classes.role}>
                    <div>
                      <h3 className={classes.display}>{role.title}</h3>
                      <p>{role.body}</p>
                    </div>
                    <ul className={classes.roleList}>
                      {role.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <Link className={`${classes.btn} ${classes.primary}`} href={role.href}>
                      {role.cta}
                    </Link>
                    {role.title === "Organizer" ? (
                      <p className={classes.fine} style={{ marginTop: 12 }}>
                        <Link href="/usage-guide">Full usage guide for organizers</Link>
                      </p>
                    ) : null}
                  </article>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}

export const getServerSideProps = marketingServerProps;
