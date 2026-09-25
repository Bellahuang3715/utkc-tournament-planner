import {
  Alert,
  Anchor,
  AppShell,
  Burger,
  Center,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  Icon,
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

import { PageHeader } from '../layout/page_header';
import { TournamentPublic } from '../../interfaces/tournament';
import { getPublicTournamentByEndpoint } from '../../services/adapter';
import linkClasses from '../navbar/_main_links.module.css';
import headerClasses from '../../pages/_layout.module.css';
import { responseIsValid } from '../utils/util';

/**
 * Participant shell — same AppShell chrome as the organizer layout
 * (header + left icon rail / mobile burger nav).
 */
const NAV: { href: string; label: string; icon: Icon }[] = [
  { href: '', label: 'Home', icon: IconHome },
  { href: '/matches', label: 'Find matches', icon: IconSearch },
  { href: '/participants', label: 'Players', icon: IconUsers },
  { href: '/schedule', label: 'Schedule', icon: IconCalendar },
  { href: '/courts', label: 'Courts', icon: IconMapPin },
  { href: '/brackets', label: 'Brackets', icon: IconList },
  { href: '/scores', label: 'Scores', icon: IconScoreboard },
  { href: '/results', label: 'Results', icon: IconTrophy },
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

function ParticipantNavLink({
  href,
  label,
  icon: NavIcon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Tooltip position="right" label={label} transitionProps={{ duration: 0 }}>
        <UnstyledButton
          visibleFrom="sm"
          component={Link}
          href={href}
          className={linkClasses.link}
          data-active={active || undefined}
          onClick={onNavigate}
        >
          <NavIcon stroke={1.5} />
        </UnstyledButton>
      </Tooltip>
      <UnstyledButton
        hiddenFrom="sm"
        component={Link}
        href={href}
        className={linkClasses.mobileLink}
        style={{ width: '100%' }}
        data-active={active || undefined}
        onClick={onNavigate}
      >
        <Group className={linkClasses.mobileLinkGroup}>
          <NavIcon stroke={1.5} />
          <p style={{ marginLeft: '0.5rem' }}>{label}</p>
        </Group>
        <Divider />
      </UnstyledButton>
    </>
  );
}

export default function ParticipantTournamentLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure();
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
        return { ...item, href, active };
      }),
    [base, path, previewQs]
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 80,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Container className={headerClasses.inner} fluid>
          <Center>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              mr="xs"
              aria-label="Open navigation"
            />
            <Center mr="1rem">
              <UnstyledButton component={Link} href={`${base}${previewQs}`}>
                <Group>
                  <Title style={{ height: '38px', marginBottom: '0.4rem' }}>
                    Bracket
                  </Title>
                </Group>
              </UnstyledButton>
            </Center>
            <Stack visibleFrom="md" gap={0} mt="0.1rem" justify="center">
              <Text size="xs" c="dimmed" lh={1.1}>
                Participant View
              </Text>
              <h2 style={{ margin: 0, lineHeight: 1.2 }}>
                / {tournament?.name ?? title ?? 'Tournament'}
              </h2>
            </Stack>
          </Center>
          <Stack hiddenFrom="md" gap={0} align="flex-end" style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" lh={1.1}>
              Participant View
            </Text>
            <Text size="sm" fw={600} lineClamp={1} maw={160}>
              {tournament?.name ?? title ?? 'Tournament'}
            </Text>
          </Stack>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <Center hiddenFrom="sm">
            <h2>Participant</h2>
          </Center>
          <Divider hiddenFrom="sm" />
          {links.map((item) => (
            <ParticipantNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.active}
              onNavigate={close}
            />
          ))}
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
