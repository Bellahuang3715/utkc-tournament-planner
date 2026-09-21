import { Accordion, Stack, Text } from '@mantine/core';
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
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import {
  getPublicCourts,
  getPublicScheduleTimetable,
} from '../../../services/adapter';

export default function ParticipantCourtsPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const swrCourts = getPublicCourts(slug || null, preview);
  const swrSchedule = getPublicScheduleTimetable(slug || null, preview);

  const courts = responseIsValid(swrCourts) ? swrCourts.data.data ?? [] : [];
  const placements = responseIsValid(swrSchedule)
    ? swrSchedule.data.data.placements ?? []
    : [];

  const byCourt = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const p of placements) {
      if (p.court_id == null) continue;
      const list = map.get(p.court_id) ?? [];
      list.push(p);
      map.set(p.court_id, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    }
    return map;
  }, [placements]);

  const loading =
    (!swrCourts.data && !swrCourts.error) ||
    (!swrSchedule.data && !swrSchedule.error);

  const sortedCourts = useMemo(
    () => [...courts].sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [courts]
  );

  return (
    <ParticipantTournamentLayout>
      <ParticipantPageTitle
        title="Courts"
        subtitle="What’s assigned to each court today."
      />

      {loading && <ParticipantLoading />}

      {!loading && sortedCourts.length === 0 && (
        <ParticipantEmpty>No courts have been set up yet.</ParticipantEmpty>
      )}

      {!loading && sortedCourts.length > 0 && (
        <Accordion variant="separated" radius="md" multiple>
          {sortedCourts.map((court: any) => {
            const blocks = byCourt.get(court.id) ?? [];
            return (
              <Accordion.Item key={court.id} value={String(court.id)}>
                <Accordion.Control>
                  <Text fw={700}>{court.name}</Text>
                  <Text size="xs" c="dimmed">
                    {blocks.length === 0
                      ? 'Nothing scheduled'
                      : `${blocks.length} block${blocks.length === 1 ? '' : 's'}`}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  {blocks.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      No blocks on this court yet.
                    </Text>
                  ) : (
                    <Stack gap="sm">
                      {blocks.map((b: any) => (
                        <div key={b.id}>
                          <Text fw={600} size="sm">
                            {b.label || 'Block'}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {formatParticipantClock(b.start_time)} · {b.duration_mins}{' '}
                            min
                          </Text>
                        </div>
                      ))}
                    </Stack>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
