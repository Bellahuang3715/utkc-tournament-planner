import { Center, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconInfoCircle, IconSearch } from '@tabler/icons-react';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { DEFAULT_BOOKLET } from '../utils/brackets_editor/shared';
import classes from './participant_ui.module.css';

/**
 * Same type as organizer booklet — overall size comes only from
 * ParticipantBracketFrame scale, so IDs/names stay proportional to the lines.
 */
export const PARTICIPANT_BRACKET_TEXT_STYLES = {
  playerId: {
    fontFamily: DEFAULT_BOOKLET.playerId.fontFamily,
    fontSize: DEFAULT_BOOKLET.playerId.fontSize,
  },
  playerText: {
    fontFamily: DEFAULT_BOOKLET.playerText.fontFamily,
    fontSize: DEFAULT_BOOKLET.playerText.fontSize,
  },
} as const;

export const PARTICIPANT_BRACKET_TEAM_ID_FONT_SIZE = DEFAULT_BOOKLET.playerId.fontSize;

/** Shared mobile-first primitives for the participant site only. */

export function ParticipantPageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <Group
      className={classes.pageHeader}
      justify="space-between"
      align="flex-end"
      wrap="wrap"
    >
      <Stack gap={2} style={{ flex: '1 1 14rem', minWidth: 0 }}>
        <Title order={2} className={classes.pageTitle}>
          {title}
        </Title>
        <Text className={classes.pageSubtitle} c="dimmed">
          {subtitle}
        </Text>
      </Stack>
      {actions}
    </Group>
  );
}

export function ParticipantSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      size="xs"
      radius="md"
      placeholder={placeholder}
      leftSection={<IconSearch size={13} />}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      classNames={{ input: classes.searchInput }}
    />
  );
}

export function ParticipantLoading() {
  return (
    <Center py="md">
      <Loader size="xs" />
    </Center>
  );
}

export function ParticipantEmpty({ children }: { children: ReactNode }) {
  return (
    <Text c="dimmed" size="xs" py={4}>
      {children}
    </Text>
  );
}

/** Compact info notice for placeholders / soft status messages. */
export function ParticipantNotice({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={classes.notice} role="status">
      <IconInfoCircle className={classes.noticeIcon} stroke={1.75} aria-hidden />
      <div className={classes.noticeBody}>
        {title ? <p className={classes.noticeTitle}>{title}</p> : null}
        <p className={classes.noticeText}>{children}</p>
      </div>
    </div>
  );
}

export { classes as participantUiClasses };

/**
 * Scales the fixed-size tournament-brackets-ui table so it fits mobile better.
 * Keeps horizontal scroll when the bracket is still wider than the viewport.
 */
export function ParticipantBracketFrame({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const isDesktop = useMediaQuery('(min-width: 48em)');
  const scale = isDesktop ? 0.82 : 0.65;

  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const measure = () => {
      setNatural({ w: el.scrollWidth, h: el.scrollHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div className={classes.bracketViewport}>
      <div
        className={classes.bracketSized}
        style={{
          width: natural.w ? natural.w * scale : undefined,
          height: natural.h ? natural.h * scale : undefined,
        }}
      >
        <div
          ref={innerRef}
          className={classes.bracketInner}
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function formatParticipantTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatParticipantClock(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
