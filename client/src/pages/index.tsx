import Link from "next/link";
import React from "react";

import { HeroBoard, ProblemStudio } from "../components/marketing/demos";
import { BRACKET_URL, GITHUB_URL } from "../components/marketing/fixtures";
import { FeaturesGrid, OrganizerJourney } from "../components/marketing/journey";
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

/** Public KenManage home. */
export default function HomePage() {
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
            <p className={classes.whyLine}>
              Built for real tournament days (including UTKC-scale events) — free under AGPL-3.0,
              grew out of <a href={BRACKET_URL}>Bracket</a>, source on{" "}
              <a href={GITHUB_URL}>GitHub</a>.
            </p>
          </Reveal>
        </div>
      </section>

      <section className={classes.section} id="features">
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Features</p>
            <h2 className={classes.display}>What KenManage does.</h2>
            <p className={classes.deck}>
              The core pieces of a tournament day — from roster to public board — in one place.
            </p>
            <FeaturesGrid />
          </Reveal>
        </div>
      </section>

      <section className={`${classes.section} ${classes.sectionWash}`} id="how-it-works">
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>How it works</p>
            <h2 className={classes.display}>Organizer path, end to end.</h2>
            <p className={classes.deck}>
              Follow the same order as the{" "}
              <Link href="/usage-guide">Usage Guide</Link>. Click a step anytime — screenshots come
              later; placeholders mark each screen for now.
            </p>
            <OrganizerJourney />
          </Reveal>
        </div>
      </section>

      <section className={`${classes.section} ${classes.start}`} id="start">
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
