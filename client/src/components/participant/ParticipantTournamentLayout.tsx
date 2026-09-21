import { Alert, Anchor, Box, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconCalendar,
  IconHome,
  IconList,
  IconMapPin,
  IconScoreboard,
  IconSearch,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { ReactNode, useMemo } from 'react';

import { TournamentPublic } from '../../interfaces/tournament';
import { getPublicTournamentByEndpoint } from '../../services/adapter';
import { responseIsValid } from '../utils/util';

/**
 * Participant-only shell. Intentionally separate from organizer Layout / TournamentLayout.
 * Mobile-first: bottom tab bar; desktop gets a simple top strip of the same links.
 */
const NAV = [
  { href: '', label: 'Home', short: 'Home', icon: IconHome },
  { href: '/matches', label: 'Find matches', short: 'Find', icon: IconSearch },
  { href: '/participants', label: 'Players', short: 'Players', icon: IconUsers },
  { href: '/schedule', label: 'Schedule', short: 'Sched', icon: IconCalendar },
  { href: '/courts', label: 'Courts', short: 'Courts', icon: IconMapPin },
  { href: '/brackets', label: 'Brackets', short: 'Brackets', icon: IconList },
  { href: '/scores', label: 'Scores', short: 'Scores', icon: IconScoreboard },
  { href: '/results', label: 'Results', short: 'Results', icon: IconTrophy },
] as const;

const BOTTOM_PAD = 72;

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

  const errorStatus = (swr.error as any)?.response?.status;
  const isForbidden = errorStatus === 403;
  const isMissing = errorStatus === 404;

  const links = useMemo(
    () =>
      NAV.map((item) => {
        const href = `${base}${item.href}${previewQs}`;
        const activePath = `${base}${item.href}`.replace(/\/+$/, '') || base;
        const active =
          path === activePath || (item.href === '' && path === base);
        const Icon = item.icon;
        return { ...item, href, active, Icon };
      }),
    [base, path, previewQs]
  );

  return (
    <Box
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mantine-color-body)',
      }}
    >
      <Box
        component="header"
        px="md"
        py="sm"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <div style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" lh={1.2}>
              Participant
            </Text>
            <Title order={3} lh={1.25} lineClamp={2} style={{ fontSize: '1.15rem' }}>
              {tournament?.name ?? title ?? 'Tournament'}
            </Title>
          </div>
          <Anchor
            component={Link}
            href="/join"
            size="sm"
            style={{ flexShrink: 0 }}
          >
            Change
          </Anchor>
        </Group>
        {preview && (
          <Alert color="yellow" mt="sm" py={6} px="sm">
            Preview — not published yet
          </Alert>
        )}

        {/* Desktop-only horizontal nav (organizer can ignore; participants mostly mobile) */}
        <Group gap="md" mt="sm" visibleFrom="sm" wrap="wrap">
          {links.map((item) => (
            <Anchor
              key={item.href}
              component={Link}
              href={item.href}
              underline="never"
              c={item.active ? 'blue' : 'dimmed'}
              fw={item.active ? 700 : 500}
              size="sm"
            >
              {item.label}
            </Anchor>
          ))}
        </Group>
      </Box>

      <Box
        component="main"
        px="md"
        pt="md"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          paddingBottom: `calc(${BOTTOM_PAD}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
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
      </Box>

      {/* Mobile bottom nav */}
      <Box
        component="nav"
        hiddenFrom="sm"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          borderTop: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Group gap={0} wrap="nowrap" px={4} justify="flex-start">
          {links.map((item) => {
            const Icon = item.Icon;
            return (
              <Anchor
                key={item.href}
                component={Link}
                href={item.href}
                underline="never"
                c={item.active ? 'blue' : 'dimmed'}
                style={{
                  flex: '0 0 auto',
                  minWidth: 64,
                  padding: '8px 6px',
                  textAlign: 'center',
                }}
              >
                <Stack gap={2} align="center">
                  <Icon size={20} stroke={item.active ? 2 : 1.5} />
                  <Text size="10px" fw={item.active ? 700 : 500} lh={1.1}>
                    {item.short}
                  </Text>
                </Stack>
              </Anchor>
            );
          })}
        </Group>
      </Box>
    </Box>
  );
}

export function ParticipantComingSoon({ section }: { section: string }) {
  return (
    <Stack gap="xs">
      <Title order={2} style={{ fontSize: '1.35rem' }}>
        {section}
      </Title>
      <Text c="dimmed" size="sm">
        This participant view is ready. Live {section.toLowerCase()} will show here during the
        tournament.
      </Text>
    </Stack>
  );
}

/** @deprecated */
export const ComingSoon = ParticipantComingSoon;
