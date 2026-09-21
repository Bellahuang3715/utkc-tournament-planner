import {
  Button,
  Container,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconClipboardList, IconUser } from '@tabler/icons-react';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { useAuth } from '../context/AuthContext';

/**
 * Public entry gate — completely separate from the organizer app shell.
 * Logged-in organizers are sent to the tournament list.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      void router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return null;
  }

  return (
    <Container
      size="xs"
      px="md"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingTop: 24,
        paddingBottom: 40,
      }}
    >
      <Stack gap="xl">
        <div>
          <Text size="sm" c="dimmed" tt="uppercase" fw={600} mb={6}>
            Kendo tournaments
          </Text>
          <Title order={1} style={{ fontSize: 'clamp(1.75rem, 6vw, 2.25rem)' }}>
            How are you joining?
          </Title>
          <Text c="dimmed" mt="sm" size="md">
            Organizers manage tournaments. Participants look up matches, schedules, and
            scores.
          </Text>
        </div>

        <Stack gap="md">
          <UnstyledButton
            onClick={() => router.push('/join')}
            style={{
              display: 'block',
              width: '100%',
              borderRadius: 16,
              padding: '20px 18px',
              border: '1px solid var(--mantine-color-default-border)',
              background: 'var(--mantine-color-body)',
              textAlign: 'left',
            }}
          >
            <Stack gap={6}>
              <IconUser size={28} stroke={1.5} />
              <Text fw={700} size="lg">
                I&apos;m a participant
              </Text>
              <Text size="sm" c="dimmed">
                Enter the tournament code from your organizer — no account needed.
              </Text>
            </Stack>
          </UnstyledButton>

          <UnstyledButton
            onClick={() => router.push('/login')}
            style={{
              display: 'block',
              width: '100%',
              borderRadius: 16,
              padding: '20px 18px',
              border: '1px solid var(--mantine-color-default-border)',
              background: 'var(--mantine-color-body)',
              textAlign: 'left',
            }}
          >
            <Stack gap={6}>
              <IconClipboardList size={28} stroke={1.5} />
              <Text fw={700} size="lg">
                I&apos;m an organizer
              </Text>
              <Text size="sm" c="dimmed">
                Sign in to create and manage tournaments.
              </Text>
            </Stack>
          </UnstyledButton>
        </Stack>

        <Button variant="subtle" color="gray" onClick={() => router.push('/join')}>
          Have a tournament code? Join as participant
        </Button>
      </Stack>
    </Container>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
