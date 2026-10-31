import {
  Alert,
  Anchor,
  AppShell,
  Container,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { Icon, IconCalendar, IconHome, IconList } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { ReactNode, useMemo } from 'react';

import { PageHeader } from '../layout/page_header';
import { TournamentPublic } from '../../interfaces/tournament';
import { getPublicTournamentByEndpoint } from '../../services/adapter';
import { responseIsValid } from '../utils/util';
import classes from './participant_layout.module.css';

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: Icon;
};

/**
 * Participant shell — bottom tabs for Home / Schedule / Brackets.
 * Other sections are reached from Home.
 */
const NAV: NavItem[] = [
  { href: '', label: 'Home', shortLabel: 'Home', icon: IconHome },
  { href: '/schedule', label: 'Schedule', shortLabel: 'Schedule', icon: IconCalendar },
  { href: '/brackets', label: 'Brackets', shortLabel: 'Brackets', icon: IconList },
];

function previewQuery(preview: string | string[] | undefined): string {
  if (typeof preview === 'string' && preview.length > 0) {
    return `?preview=${encodeURIComponent(preview)}`;
  }
  return '';
}

export function useParticipantTournamentSlug() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const preview =
    typeof router.query.preview === 'string' ? router.query.preview : null;
  return { slug, preview, previewQs: previewQuery(router.query.preview) };
}

/** @deprecated use useParticipantTournamentSlug */
export const usePublicTournamentSlug = useParticipantTournamentSlug;

export default function ParticipantTournamentLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const { slug, preview, previewQs } = useParticipantTournamentSlug();
  const swr = getPublicTournamentByEndpoint(slug || null, preview);
  const tournament: TournamentPublic | null = responseIsValid(swr)
    ? swr.data.data
    : null;

  const base = `/t/${slug}`;
  const path = router.asPath.split('?')[0].replace(/\/+$/, '') || base;
  const tournamentName = tournament?.name ?? title ?? 'Tournament';

  const errorStatus = (swr.error as any)?.response?.status;
  const isForbidden = errorStatus === 403;
  const isMissing = errorStatus === 404;

  const links = useMemo(
    () =>
      NAV.map((item) => {
        const href = `${base}${item.href}${previewQs}`;
        const activePath = `${base}${item.href}`.replace(/\/+$/, '') || base;
        const active =
          path === activePath ||
          (item.href !== '' && path.startsWith(`${activePath}/`)) ||
          (item.href === '' && path === base);
        return { ...item, href, active };
      }),
    [base, path, previewQs]
  );

  return (
    <AppShell
      className={classes.shell}
      header={{ height: 56 }}
      navbar={{
        width: 80,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      padding={{ base: 'sm', sm: 'md' }}
      classNames={{ main: classes.main }}
    >
      <AppShell.Header>
        <Container className={classes.headerInner} fluid px="md">
          <UnstyledButton
            component={Link}
            href={`${base}${previewQs}`}
            className={classes.brand}
            aria-label="Tournament home"
          >
            <Text className={classes.brandTitle}>Bracket</Text>
          </UnstyledButton>
          <div className={classes.tournamentMeta}>
            <Text className={classes.viewLabel}>Participant</Text>
            <Text className={classes.tournamentName} title={tournamentName}>
              {tournamentName}
            </Text>
          </div>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md" className={classes.sideNav} visibleFrom="sm">
        <AppShell.Section grow>
          <Stack gap={4} align="center">
            {links.map((item) => {
              const NavIcon = item.icon;
              return (
                <Tooltip
                  key={item.href}
                  position="right"
                  label={item.label}
                  transitionProps={{ duration: 0 }}
                >
                  <UnstyledButton
                    component={Link}
                    href={item.href}
                    className={classes.railLink}
                    data-active={item.active || undefined}
                    aria-label={item.label}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    <NavIcon stroke={1.5} />
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {preview && (
          <Alert color="yellow" mb="md" py={6} px="sm">
            Preview — not published yet
          </Alert>
        )}
        {isMissing && (
          <Alert color="red" title="Not found">
            This tournament code is invalid.{' '}
            <Anchor component={Link} href="/join">
              Try another code
            </Anchor>
            .
          </Alert>
        )}
        {isForbidden && (
          <Alert color="orange" title="Not published">
            This tournament isn&apos;t public yet. Ask your organizer for a preview link, or wait
            until they publish.
          </Alert>
        )}
        {!isMissing && !isForbidden && children}
      </AppShell.Main>

      <nav className={classes.bottomNav} aria-label="Tournament sections">
        {links.map((item) => {
          const NavIcon = item.icon;
          return (
            <UnstyledButton
              key={item.href}
              component={Link}
              href={item.href}
              className={classes.tab}
              data-active={item.active || undefined}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <NavIcon className={classes.tabIcon} stroke={item.active ? 2 : 1.6} />
              <span className={classes.tabLabel}>{item.shortLabel}</span>
            </UnstyledButton>
          );
        })}
      </nav>
    </AppShell>
  );
}

export function ParticipantComingSoon({ section }: { section: string }) {
  return (
    <PageHeader
      title={section}
      description={`Live ${section.toLowerCase()} will show here during the tournament.`}
    />
  );
}

/** @deprecated */
export const ComingSoon = ParticipantComingSoon;
