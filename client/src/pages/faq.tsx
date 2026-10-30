import Link from "next/link";
import React from "react";

import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

const QUESTIONS = [
  {
    q: "Do participants need an account?",
    a: "No. Participants enter the tournament code from the organizer and open the public site. Scorekeepers use a separate access code. Only organizers sign in.",
  },
  {
    q: "What are the two codes?",
    a: "The participant code opens the public site: matches, schedule, brackets, scores, and results. The scorekeeper code lets someone enter results for that tournament. The organizer creates both and shares them.",
  },
  {
    q: "Can I import players from Excel?",
    a: "Yes. Organizers can import a player roster from a spreadsheet, or add players one at a time. Teams are built from players already in the tournament.",
  },
  {
    q: "Can a tournament have individuals and teams?",
    a: "Yes. A tournament holds players and teams. Each division is one or the other, with its own brackets, match length, and court blocks.",
  },
  {
    q: "What can a scorekeeper change?",
    a: "Scorekeepers stay on the scores for the tournament their code opens. They record match results. One person edits a group at a time, so a second scorekeeper cannot overwrite that sheet until it is free.",
  },
  {
    q: "Can I run KenManage myself?",
    a: "Yes. KenManage is free software under the GNU AGPL-3.0. You can run it and change it. If you offer your changes as a network service, you share the source of those changes. See the license page for the short version.",
  },
];

export default function FaqPage() {
  return (
    <MarketingShell>
      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>FAQ</p>
            <h1 className={`${classes.display} ${classes.pageTitle}`}>Before you join.</h1>
            <p className={classes.deck}>
              Practical answers. The <Link href="/guide">guide</Link> is the step-by-step version.
              Still stuck? <Link href="/contact">Contact</Link> for bugs and collaboration.
            </p>
            <div className={classes.faq}>
              {QUESTIONS.map((item, index) => (
                <details key={item.q} className={classes.faqItem} open={index === 0}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}

export const getServerSideProps = marketingServerProps;
