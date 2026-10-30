import Link from "next/link";
import React, { useState } from "react";

import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

const GUIDES = [
  {
    id: "organizer",
    label: "Organizer",
    href: "/login",
    cta: "Log in as an organizer",
    steps: [
      "Create an account and start a tournament.",
      "Import players from Excel, or add them by hand. Teams are built from those players.",
      "Create a division: a name, how long a match runs, and the margin between blocks.",
      "Generate brackets. KenManage separates players who share a club, and keeps players you mark as biased apart.",
      "Assign division blocks to courts. Each block’s length comes from the match time and the margin.",
      "Share the participant code for the public site, and the scorekeeper code for people entering results.",
    ],
  },
  {
    id: "participant",
    label: "Participant",
    href: "/join",
    cta: "Enter a tournament code",
    steps: [
      "Choose participant on the Get started page. You do not create an account.",
      "Enter the tournament code from your organizer. A pasted link works too.",
      "Find your matches by name or player code.",
      "Read the schedule, which court you are on, the brackets, live scores, and final results.",
    ],
  },
  {
    id: "scorekeeper",
    label: "Scorekeeper",
    href: "/scorekeeping",
    cta: "Use an access code",
    steps: [
      "Choose scorekeeper on the Get started page. You do not create an account.",
      "Enter the access code from your organizer, plus your name.",
      "You land on scores for that tournament. The rest of the organizer tools stay closed.",
      "One person edits a group at a time, so two scorekeepers do not overwrite the same sheet.",
    ],
  },
];

export default function GuidePage() {
  const [active, setActive] = useState(GUIDES[0].id);
  const guide = GUIDES.find((item) => item.id === active) ?? GUIDES[0];

  return (
    <MarketingShell>
      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Guide</p>
            <h1 className={`${classes.display} ${classes.pageTitle}`}>What to do first.</h1>
            <p className={classes.deck}>
              A short path for each role. When you are ready, use{" "}
              <Link href="/welcome#start">Get started</Link> to open the matching entry screen.
            </p>
            <div className={classes.tabs} role="tablist" aria-label="Roles" style={{ marginTop: 28 }}>
              {GUIDES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={classes.tab}
                  role="tab"
                  aria-selected={item.id === guide.id}
                  onClick={() => setActive(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <ol className={classes.guideList}>
              {guide.steps.map((step, index) => (
                <li key={step}>
                  <span className={classes.guideIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className={classes.guideCta}>
              <Link className={`${classes.btn} ${classes.primary}`} href={guide.href}>
                {guide.cta}
              </Link>
            </p>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}

export const getServerSideProps = marketingServerProps;
