import { Stack } from '@mantine/core';
import { IconClipboardList, IconScoreboard, IconUser } from '@tabler/icons-react';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { GuestChoiceCard, GuestEntryShell } from '../components/layout/guest_entry';
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
    <GuestEntryShell
      title="How are you joining?"
      description="Organizers manage tournaments. Participants look up matches, schedules, and scores. Scorekeepers enter results with an access code."
    >
      <Stack gap="md">
        <GuestChoiceCard
          icon={<IconUser size={22} stroke={1.5} />}
          title="I'm a participant"
          description="Enter the tournament code from your organizer — no account needed."
          onClick={() => router.push('/join')}
        />
        <GuestChoiceCard
          icon={<IconScoreboard size={22} stroke={1.5} />}
          title="I'm a scorekeeper"
          description="Enter the access code from your organizer — no account needed."
          onClick={() => router.push('/scorekeeping')}
        />
        <GuestChoiceCard
          icon={<IconClipboardList size={22} stroke={1.5} />}
          title="I'm an organizer"
          description="Log in to create and manage tournaments."
          onClick={() => router.push('/login')}
        />
      </Stack>
    </GuestEntryShell>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
