import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  USAGE_GUIDE_TOC,
  UsageGuideContent,
} from "../components/marketing/usage_guide_content";
import { Reveal } from "../components/marketing/reveal";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

export default function UsageGuidePage() {
  const [activeId, setActiveId] = useState<string>(USAGE_GUIDE_TOC[0].id);

  useEffect(() => {
    const sections = USAGE_GUIDE_TOC.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <MarketingShell>
      <section className={`${classes.section} ${classes.guideDocs}`}>
        <div className={classes.wrap}>
          <Reveal>
            <p className={classes.kicker}>Usage guide</p>
            <h1 className={`${classes.display} ${classes.pageTitle}`}>Plan and run a tournament.</h1>
            <p className={classes.deck}>
              Detailed organizer instructions — from account creation through brackets, schedule,
              scores, exports, and the API. Not running a tournament yet?{" "}
              <Link href="/#start">Get started</Link> by role.
            </p>
          </Reveal>

          <div className={classes.guideLayout}>
            <aside className={classes.toc} aria-label="On this page">
              <p className={classes.tocLabel}>On this page</p>
              <nav>
                {USAGE_GUIDE_TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    data-active={activeId === item.id ? "true" : "false"}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </aside>
            <div className={classes.guideMain}>
              <UsageGuideContent />
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export const getServerSideProps = marketingServerProps;
