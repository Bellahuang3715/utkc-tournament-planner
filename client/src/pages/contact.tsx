import React from "react";

import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  GITHUB_ISSUES_URL,
  GITHUB_URL,
} from "../components/marketing/fixtures";
import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

const SUPPORT_WAYS = [
  {
    title: "Sponsor",
    body: (
      <>
        Individual donation, or a club / group sponsor. Email{" "}
        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a> and we can sort out what works for you.
      </>
    ),
    href: CONTACT_MAILTO,
    cta: "Email about sponsoring",
  },
  {
    title: "Contribute code",
    body: (
      <>
        Browse <a href={GITHUB_URL}>the repo</a>, peek at open issues, and email me if you want to
        jump in. First contributions are welcome.
      </>
    ),
    href: GITHUB_URL,
    cta: "View the repository",
  },
  {
    title: "Try to break it",
    body: (
      <>
        Yes, really. One person built this, so bugs are almost certainly hiding under the happy
        path. Weird brackets, messy imports, two scorekeepers at once… go wild, then tell me what
        exploded.
      </>
    ),
    href: GITHUB_ISSUES_URL,
    cta: "Report what broke",
  },
  {
    title: "Star the repo",
    body: (
      <>
        A quick <a href={GITHUB_URL}>GitHub star</a> helps other organizers find the project.
      </>
    ),
    href: GITHUB_URL,
    cta: "Star on GitHub",
  },
  {
    title: "Spread the word",
    body: (
      <>
        Mention it to another club, dojo, or tournament organizer. That kind of share goes a long
        way.
      </>
    ),
    href: CONTACT_MAILTO,
    cta: "Say you shared it",
  },
  {
    title: "Add a translation",
    body: (
      <>
        If your language is missing, I would love help translating the UI. Email me and I will point
        you at the locale files.
      </>
    ),
    href: CONTACT_MAILTO,
    cta: "Offer a translation",
  },
];

const BELLA_FACTS = [
  "Member @ Kensyukai Markham Kendo Club (prev. University of Toronto Kendo Club)",
  "Software Engineer @ Qualcomm",
  "Master of Engineering candidate @ University of Toronto",
  "BASc. Computer Engineering @ University of Toronto ('25)",
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className={`${classes.section} ${classes.contactPage}`}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Contact</p>
            <h1 className={`${classes.display} ${classes.pageTitle}`}>
              Say hi. I actually read these.
            </h1>
            <p className={classes.deck}>
              Whether you want to run a tournament, request a feature, sponsor the project, or just
              poke holes in the software — email{" "}
              <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. Every kind of support helps more than you
              think.
            </p>

            <div className={classes.contactGrid}>
              <article className={classes.contactCard}>
                <h2 className={classes.display}>Almost the right fit?</h2>
                <p>
                  Club rep or organizer who likes KenManage but needs something it does not do yet?
                  Email me. I am happy to talk through your event and figure out what would make this
                  work for you — even if that means building toward it together.
                </p>
                <a className={`${classes.btn} ${classes.primary}`} href={CONTACT_MAILTO}>
                  Email {CONTACT_EMAIL}
                </a>
              </article>

              <article className={classes.contactCard}>
                <h2 className={classes.display}>Found a bug?</h2>
                <p>
                  Please tell me. Open a GitHub issue with what you tried, what you expected, and
                  what happened (and which role you were in — organizer, scorekeeper, or
                  participant). Tournament-day surprises are the ones I want to catch most.
                </p>
                <a className={`${classes.btn} ${classes.primary}`} href={GITHUB_ISSUES_URL}>
                  Open a GitHub issue
                </a>
              </article>
            </div>

            <div className={`${classes.developer} ${classes.aboutAnchor}`} style={{ marginTop: 36 }}>
              <p className={classes.kicker}>Ideas</p>
              <h2 className={classes.display}>Feature requests? Bring them on.</h2>
              <p>
                Big or tiny — both count. Want round robin instead of only single elimination? Want
                to tweak the font on an exported bracket? If it would make your tournament day nicer,
                I want to hear it. Rough notes are totally fine; no formal write-up required.
              </p>
              <div className={classes.heroActions} style={{ marginTop: 20 }}>
                <a className={`${classes.btn} ${classes.primary}`} href={CONTACT_MAILTO}>
                  Email an idea
                </a>
                <a className={`${classes.btn} ${classes.ghost}`} href={GITHUB_ISSUES_URL}>
                  File it on GitHub
                </a>
              </div>
            </div>

            <div id="support" className={`${classes.supportSection} ${classes.aboutAnchor}`}>
              <div className={classes.supportIntro}>
                <p className={classes.kicker}>Support</p>
                <h2 className={classes.display}>Help however you like.</h2>
                <p className={classes.deck}>
                  Seriously — any support is greatly appreciated. Pick a lane, or invent your own.
                </p>
              </div>
              <div className={classes.supportGrid}>
                {SUPPORT_WAYS.map((item, index) => (
                  <article key={item.title} className={classes.supportCard}>
                    <span className={classes.supportIndex} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className={classes.display}>{item.title}</h3>
                    <p>{item.body}</p>
                    <a className={classes.textLink} href={item.href}>
                      {item.cta}
                    </a>
                  </article>
                ))}
              </div>
            </div>

            <div className={classes.developerNote}>
              <div className={classes.developerNoteCopy}>
                <p className={classes.kicker}>A note from the developer</p>
                <h2 className={classes.display}>Hi — I&apos;m Bella.</h2>
                <p>
                  I built KenManage for tournament days like the ones I help run: lots of players,
                  lots of courts, and zero appetite for spreadsheet chaos. I also practice kendo, so
                  the goal is software that feels useful on the day — not a polished demo that falls
                  apart when the first match starts late.
                </p>
                <p>
                  If KenManage is almost right for your club, if something is confusing, or if you
                  just want to say thanks / yell about a bug / offer to help — please email{" "}
                  <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>. I read it, and I am genuinely glad
                  you are here.
                </p>
              </div>
              <aside className={classes.developerFacts} aria-label="About Bella">
                <p className={classes.developerFactsLabel}>A bit about me</p>
                <ul>
                  {BELLA_FACTS.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </aside>
            </div>

            <div className={classes.prose} style={{ marginTop: 40 }}>
              <p>
                Code lives at{" "}
                <a href={GITHUB_URL}>github.com/Bellahuang3715/utkc-tournament-planner</a>. License
                notes are on the <a href="/license">license</a> page.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}

export const getServerSideProps = marketingServerProps;
