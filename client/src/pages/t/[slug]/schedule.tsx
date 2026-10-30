import { Stack } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useMemo } from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';
import CourtTimetable from '../../../components/schedule/CourtTimetable';
import { responseIsValid } from '../../../components/utils/util';
import { Court } from '../../../interfaces/court';
import type { SchedulePlacement, TimetableConfig } from '../../../interfaces/schedule_timetable';
import {
  getPublicCourts,
  getPublicScheduleTimetable,
  getPublicTournamentByEndpoint,
} from '../../../services/adapter';

const DEFAULT_START_MINS = 9 * 60;
const DEFAULT_END_MINS = 17 * 60;

function toPlacements(raw: any[]): SchedulePlacement[] {
  return raw
    .filter((p) => p?.court_id != null || p?.courtId != null)
    .map((p) => ({
      id: String(p.id),
      courtId: Number(p.court_id ?? p.courtId),
      startTime: String(p.start_time ?? p.startTime),
      kind: p.kind === 'custom' ? 'custom' : 'division',
      divisionId: p.division_id ?? p.divisionId ?? undefined,
      bracketId: p.bracket_id ?? p.bracketId ?? undefined,
      label: String(p.label ?? 'Block'),
      durationMins: Number(p.duration_mins ?? p.durationMins ?? 0),
      color: p.color ?? null,
    }));
}

function minsToHhMm(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Same default day window as the organizer timetable, expanded to fit every block. */
function configForPlacements(placements: SchedulePlacement[]): TimetableConfig {
  let startMin = DEFAULT_START_MINS;
  let endMin = DEFAULT_END_MINS;
  for (const p of placements) {
    const start = new Date(p.startTime);
    if (Number.isNaN(start.getTime())) continue;
    const startMins = start.getHours() * 60 + start.getMinutes();
    startMin = Math.min(startMin, Math.floor(startMins / 60) * 60);
    const endMins = startMins + Math.max(0, p.durationMins);
    endMin = Math.max(endMin, Math.ceil(endMins / 60) * 60);
  }
  if (endMin <= startMin) endMin = startMin + 60;
  return {
    startTime: minsToHhMm(Math.max(0, startMin)),
    endTime: minsToHhMm(endMin),
    intervalMins: 30,
  };
}

export default function ParticipantSchedulePage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const swrTournament = getPublicTournamentByEndpoint(slug || null, preview);
  const swrSchedule = getPublicScheduleTimetable(slug || null, preview);
  const swrCourts = getPublicCourts(slug || null, preview);

  const placements = useMemo(
    () => (responseIsValid(swrSchedule) ? toPlacements(swrSchedule.data.data.placements ?? []) : []),
    [swrSchedule]
  );
  const courts: Court[] = responseIsValid(swrCourts) ? swrCourts.data.data ?? [] : [];
  const tournamentStart = responseIsValid(swrTournament)
    ? swrTournament.data?.data?.start_time
    : null;

  const scheduleDate = useMemo(() => {
    const iso = tournamentStart ?? placements[0]?.startTime;
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [tournamentStart, placements]);

  const config = useMemo(() => configForPlacements(placements), [placements]);

  const loading =
    (!swrSchedule.data && !swrSchedule.error) ||
    (!swrCourts.data && !swrCourts.error) ||
    (!swrTournament.data && !swrTournament.error);

  const hasSchedule = courts.length > 0 && placements.length > 0;

  return (
    <ParticipantTournamentLayout>
      <Stack gap="lg">
        <ParticipantPageTitle
          title="Schedule"
          subtitle="Court timetable for the day."
        />

        {loading && <ParticipantLoading />}

        {!loading && !hasSchedule && (
          <ParticipantEmpty>No schedule has been published yet.</ParticipantEmpty>
        )}

        {!loading && hasSchedule && (
          <CourtTimetable
            readOnly
            courts={courts}
            placements={placements}
            config={config}
            scheduleDate={scheduleDate}
          />
        )}
      </Stack>
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
