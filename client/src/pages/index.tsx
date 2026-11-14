import Link from "next/link";
import React from "react";

import { ProblemStudio } from "../components/marketing/demos";
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
        <div className={`${classes.wrapMid} ${classes.heroGrid}`}>
          <div className={classes.heroCopy}>
            <p className={classes.eyebrow}>Less organizing. More kendo</p>
            <h1 className={`${classes.display} ${classes.brandHero}`}>KenManage</h1>
            <p className={classes.lede}>
              A software for planning, organizing, and running kendo tournaments. One
              place for organizers, scorekeepers, and participants. From registration to final match. All in one place.
            </p>
            <div className={classes.heroActions}>
              <a className={`${classes.btn} ${classes.primary}`} href="#start">
                Get started
              </a>
              <Link className={`${classes.btn} ${classes.ghost}`} href="/usage-guide">
                Usage guide
              </Link>
            </div>
          </div>
          <div className={classes.heroBoardWrap}>
            <img
              className={classes.heroShot}
              src="/4-player.png"
              alt="Four-player KenManage bracket with live scores"
            />
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
              Running a tournament shouldn't mean wrestling with spreadsheets, manually building brackets, figuring out seeding,and chasing down scores. 
              KenManage brings your entire tournament workflow together — from player registration and bracket generation to court assignments, live scorekeeping, and public results. 
            </p>
            <p className={classes.deck}>
              Spend less time managing logistics and more time making the tournament happen!
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
            <h2 className={classes.display}>One tournament. One platform.</h2>
            <p className={classes.deck}>
              From player registration to final standings, manage every stage of your tournament in one place.
            </p>
            <FeaturesGrid />
          </Reveal>
        </div>
      </section>

      <section className={`${classes.section} ${classes.sectionWash}`} id="how-it-works">
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>How it works</p>
            <h2 className={classes.display}>From registration to tournament day.</h2>
            <p className={classes.deck}>
              Set up your tournament in a few simple steps. Import your players, generate brackets, assign courts, and get your scorekeepers ready. 
              KenManage keeps everything connected so you can focus on running the event.
              For detailed instructions, check out the{" "}
              <Link href="/usage-guide">Usage Guide</Link>
            </p>
            <OrganizerJourney />
          </Reveal>
        </div>
      </section>

      <section className={`${classes.section} ${classes.start}`} id="start">
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Get started</p>
            <h2 className={classes.display}>Ready for tournament day?</h2>
            <p className={classes.deck}>
              Whether you're competing, keeping score, or running the event, KenManage has a place for
              you. Choose your role to get started. Organizers planning a full event can use the{" "}
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
