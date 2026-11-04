import {
  IconBrackets,
  IconCalendarEvent,
  IconClipboardList,
  IconFileSpreadsheet,
  IconShare2,
  IconUsers,
} from "@tabler/icons-react";
import React, { useEffect, useState } from "react";

import classes from "../landing/landing.module.css";
import {
  FEATURES,
  ORGANIZER_STEPS,
  type FeatureIcon,
  type OrganizerStepRole,
} from "./fixtures";

const FEATURE_ICONS: Record<FeatureIcon, React.ReactNode> = {
  import: <IconFileSpreadsheet size={22} stroke={1.75} />,
  seeding: <IconBrackets size={22} stroke={1.75} />,
  courts: <IconCalendarEvent size={22} stroke={1.75} />,
  scores: <IconClipboardList size={22} stroke={1.75} />,
  participants: <IconUsers size={22} stroke={1.75} />,
  share: <IconShare2 size={22} stroke={1.75} />,
};

const ROLE_TONE: Record<OrganizerStepRole, string> = {
  Organizer: "organizer",
  Scorekeeper: "scorekeeper",
  Participant: "participant",
};

const STEP_MS = 4800;

/** Scannable capability grid for the landing Features section. */
export function FeaturesGrid() {
  return (
    <div className={classes.featureGrid}>
      {FEATURES.map((feature) => (
        <article key={feature.id} className={classes.featureCard}>
          <div className={classes.featureIcon} aria-hidden="true">
            {FEATURE_ICONS[feature.icon]}
          </div>
          <h3 className={classes.featureTitle}>{feature.title}</h3>
          <p className={classes.featureBody}>{feature.body}</p>
        </article>
      ))}
    </div>
  );
}

function JourneyShot({
  label,
  imageSrc,
}: {
  label: string;
  imageSrc: string | null;
}) {
  if (imageSrc) {
    return (
      <figure className={classes.journeyShot}>
        <img className={classes.journeyShotImg} src={imageSrc} alt={label} />
        <figcaption className={classes.journeyShotCaption}>{label}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={classes.journeyShot}>
      <div className={classes.journeyShotFrame} role="img" aria-label={label}>
        Screenshot placeholder
      </div>
      <figcaption className={classes.journeyShotCaption}>{label}</figcaption>
    </figure>
  );
}

/** Interactive Usage-Guide-aligned organizer walkthrough with screenshot placeholders. */
export function OrganizerJourney() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % ORGANIZER_STEPS.length);
      setTick((value) => value + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const selectStep = (index: number) => {
    setPaused(true);
    setStep(index);
    setTick((value) => value + 1);
  };

  const current = ORGANIZER_STEPS[step];

  return (
    <div
      className={classes.flow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={classes.stepList} role="tablist" aria-label="Organizer journey">
        {ORGANIZER_STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={classes.step}
            role="tab"
            data-active={index === step ? "true" : "false"}
            aria-selected={index === step}
            onClick={() => selectStep(index)}
          >
            <span className={classes.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={classes.stepLabel}>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={classes.journeyPanel}>
        <div key={`${step}-${tick}`} className={classes.journeyCopy}>
          <span
            className={classes.journeyRole}
            data-tone={ROLE_TONE[current.role]}
          >
            {current.role}
          </span>
          <p className={classes.journeyDetail}>{current.detail}</p>
        </div>
        <JourneyShot
          key={`shot-${step}-${tick}`}
          label={current.shotLabel}
          imageSrc={current.imageSrc}
        />
        <div
          key={`progress-${tick}`}
          className={classes.stepProgress}
          data-running={paused ? "false" : "true"}
          style={{ ["--step-ms" as string]: `${STEP_MS}ms` }}
        />
      </div>
    </div>
  );
}
