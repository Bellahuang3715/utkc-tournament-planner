import { Stack, Text } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useMemo } from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
  formatParticipantClock,
  formatParticipantTime,
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import {
  getPublicCourts,
  getPublicScheduleTimetable,
} from '../../../services/adapter';

export default function ParticipantSchedulePage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const swrSchedule = getPublicScheduleTimetable(slug || null, preview);
  const swrCourts = getPublicCourts(slug || null, preview);

  const placements = responseIsValid(swrSchedule)
    ? swrSchedule.data.data.placements ?? []
    : [];
  const courts = responseIsValid(swrCourts) ? swrCourts.data.data ?? [] : [];
  const courtName = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of courts) map.set(c.id, c.name);
    return map;
  }, [courts]);

  const sorted = useMemo(
    () =>
      [...placements].sort(
        (a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
    [placements]
  );

  const loading =
    (!swrSchedule.data && !swrSchedule.error) ||
    (!swrCourts.data && !swrCourts.error);

  return (
    <ParticipantTournamentLayout>
      <Stack gap="lg">
      <ParticipantPageTitle
        title="Schedule"
        subtitle="Blocks in time order. Court names match the Courts page."
      />

      {loading && <ParticipantLoading />}

      {!loading && sorted.length === 0 && (
        <ParticipantEmpty>No schedule has been published yet.</ParticipantEmpty>
      )}

      <Stack gap="sm">
        {sorted.map((b: any) => (
          <div
            key={b.id}
            style={{
              borderRadius: 12,
              padding: '14px 16px',
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Text fw={700}>{b.label || 'Scheduled block'}</Text>
            <Text size="sm" mt={4}>
              {formatParticipantTime(b.start_time)}
            </Text>
            <Text size="sm" c="dimmed">
              {formatParticipantClock(b.start_time)} · {b.duration_mins} min ·{' '}
              {b.court_id != null
                ? courtName.get(b.court_id) ?? `Court ${b.court_id}`
                : 'Court TBA'}
            </Text>
          </div>
        ))}
      </Stack>
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
