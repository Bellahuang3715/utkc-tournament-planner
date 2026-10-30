import React from "react";

import {
  DISCORD_URL,
  GITHUB_ISSUES_URL,
  GITHUB_URL,
} from "../components/marketing/fixtures";
import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className={classes.section}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Contact</p>
            <h1 className={`${classes.display} ${classes.pageTitle}`}>
              Bugs, ideas, and collaboration.
            </h1>
            <p className={classes.deck}>
              KenManage is built in the open. Pick the channel that matches what you need.
            </p>

            <div className={classes.contactGrid}>
              <article className={classes.contactCard}>
                <h2 className={classes.display}>Report a bug</h2>
                <p>
                  Something broken, unclear, or missing on tournament day? Open a GitHub issue with
                  what you expected, what happened, and which role you were in.
                </p>
                <a className={`${classes.btn} ${classes.primary}`} href={GITHUB_ISSUES_URL}>
                  Open a GitHub issue
                </a>
              </article>

              <article className={classes.contactCard}>
                <h2 className={classes.display}>Collaborate</h2>
                <p>
                  Want to contribute code, design, or tournament-ops feedback? Join the project
                  Discord and say hello.
                </p>
                <a className={`${classes.btn} ${classes.primary}`} href={DISCORD_URL}>
                  Join the Discord
                </a>
              </article>
            </div>

            <div className={classes.developer}>
              <p className={classes.kicker}>The developer</p>
              <h2 className={classes.display}>Bella Huang</h2>
              <p>
                Software engineer, project lead, and a kendo practitioner who built KenManage for
                real tournament days — not a demo. Reach out on Discord if you want to collab, or
                open an issue if something is wrong.
              </p>
            </div>

            <div className={classes.prose} style={{ marginTop: 40 }}>
              <p>
                Prefer browsing first? The repository is at{" "}
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
