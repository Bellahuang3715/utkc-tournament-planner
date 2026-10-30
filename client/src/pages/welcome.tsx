import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import { FeatureStudio, HeroBoard, SeedingStudio } from "../components/marketing/demos";
import { BRACKET_URL, DAY_STEPS, GITHUB_URL } from "../components/marketing/fixtures";
import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import { useAuth } from "../context/AuthContext";
import classes from "../components/landing/landing.module.css";

const ROLES = [
  {
    title: "Participant",
    body: "Look up your day. No account.",
    points: ["Matches by name or code", "Full day schedule", "Brackets, scores, and results"],
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
    body: "Plan the tournament and share it.",
    points: ["Players, teams, and clubs", "Divisions, brackets, and courts", "Codes for everyone else"],
    href: "/login",
    cta: "Log in",
  },
];

const STEP_MS = 4200;

/**
 * Public home. Logged-in organizers go to the tournament list.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      void router.replace("/");
    }
  }, [loading, user, router]);

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

  if (loading || user) {
    return null;
  }

  return (
    <MarketingShell>
      <section className={classes.hero}>
        <div className={`${classes.wrap} ${classes.heroGrid}`}>
          <div className={classes.heroCopy}>
            <p className={classes.eyebrow}>Kendo tournament software</p>
            <h1 className={`${classes.display} ${classes.brandHero}`}>KenManage</h1>
            <p className={classes.lede}>
              Plan the day, run the courts, and follow every match — for organizers, scorekeepers,
              and participants.
            </p>
            <div className={classes.heroActions}>
              <a className={`${classes.btn} ${classes.primary}`} href="#start">
                Get started
              </a>
              <Link className={`${classes.btn} ${classes.ghost}`} href="/guide">
                Read the guide
              </Link>
            </div>
            <p className={classes.fine}>Participants and scorekeepers do not need an account.</p>
          </div>
          <div className={classes.heroBoardWrap}>
            <HeroBoard />
          </div>
        </div>
      </section>

      <section className={`${classes.section} ${classes.sectionWash}`}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>The product</p>
            <h2 className={classes.display}>Built for kendo tournament days.</h2>
            <p className={classes.deck}>
              KenManage runs a tournament end to end — roster, brackets, courts, scores, and the
              public board participants actually look at.
            </p>
            <div className={classes.split}>
              <div className={classes.splitBlock}>
                <h3 className={classes.display}>Why it exists</h3>
                <p>
                  It started with the University of Toronto Kendo Club&apos;s annual tournament — a
                  day with hundreds of participants, many courts, and little room for spreadsheet
                  mistakes.
                </p>
              </div>
              <div className={classes.splitBlock}>
                <h3 className={classes.display}>How it works</h3>
                <p>
                  Automates brackets with club and bias rules, keeps one scorekeeper on a sheet at a
                  time, and publishes a participant site from a short code. Free under AGPL-3.0 —
                  grew out of <a href={BRACKET_URL}>Bracket</a>, source on{" "}
                  <a href={GITHUB_URL}>GitHub</a>.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>A tournament day</p>
            <h2 className={classes.display}>From a roster to a public result.</h2>
            <p className={classes.deck}>
              Five jobs in order. The board advances on its own — click a step anytime to take over.
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
              Sample players only. Nothing here is saved, and it is not connected to a tournament.
            </p>
            <SeedingStudio />
          </Reveal>
        </div>
      </section>

      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>In the product</p>
            <h2 className={classes.display}>Pieces of a tournament day.</h2>
            <p className={classes.deck}>
              Working samples with made-up players. Switch tabs to try schedule, scoring, and
              lookup.
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
