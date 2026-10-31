import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useMemo, useState } from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';
import uiClasses from '../../../components/participant/participant_ui.module.css';
import {
  fetchDivisionOverview,
  type DivisionOverview,
} from '../../../components/participant/scores_shared';
import ScoreStatusBadge from '../../../components/scores/ScoreStatusBadge';
import { responseIsValid } from '../../../components/utils/util';
import { getPublicDivisions } from '../../../services/adapter';
import { SCORE_STATUS_ACCENT, type ScoreStatus } from '../../../utils/score_status';

export default function ParticipantScoresPage() {
  const { slug, preview, previewQs } = useParticipantTournamentSlug();
  const [overviewByDivision, setOverviewByDivision] = useState<
    Record<number, DivisionOverview>
  >({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const swrDivisions = getPublicDivisions(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];

  const divisionIdsKey = useMemo(
    () =>
      divisions
        .map((d: any) => `${d.id}:${d.division_type}`)
        .sort()
        .join(','),
    [divisions]
  );

  useEffect(() => {
    if (!slug || !divisionIdsKey) {
      setOverviewByDivision({});
      setLoadingStatuses(false);
      return;
    }

    const parts = divisionIdsKey.split(',').map((part) => {
      const [id, type] = part.split(':');
      return { id: Number(id), isTeams: type === 'TEAMS' };
    });

    let cancelled = false;
    setLoadingStatuses(true);

    const run = async () => {
      const entries = await Promise.all(
        parts.map(async ({ id, isTeams: teams }) => {
          try {
            const overview = await fetchDivisionOverview(slug, preview, id, teams);
            return [id, overview] as const;
          } catch {
            return [id, { status: 'not_started' as ScoreStatus, groups: [] }] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<number, DivisionOverview> = {};
      for (const [id, overview] of entries) next[id] = overview;
      setOverviewByDivision(next);
      setLoadingStatuses(false);
    };

    void run();
    const interval = window.setInterval(() => {
      void run();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [slug, preview, divisionIdsKey]);

  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        <ParticipantPageTitle
          title="Scores"
          subtitle="Live match results. This page refreshes automatically."
        />

        {loadingDivisions && <ParticipantLoading />}

        {!loadingDivisions && divisions.length === 0 && (
          <ParticipantEmpty>No divisions published yet.</ParticipantEmpty>
        )}

        {divisions.length > 0 && (
          <Stack gap="md">
            {loadingStatuses && Object.keys(overviewByDivision).length === 0 && (
              <ParticipantLoading />
            )}

            <Stack gap="xs">
              {divisions.map((d: any) => {
                const overview = overviewByDivision[d.id];
                const status = overview?.status ?? 'not_started';
                return (
                  <UnstyledButton
                    key={d.id}
                    component={Link}
                    href={`/t/${slug}/scores/${d.id}${previewQs}`}
                    className={`${uiClasses.sectionCard} ${uiClasses.sectionCardAccent}`}
                    style={{ borderLeftColor: SCORE_STATUS_ACCENT[status] }}
                  >
                    <Group justify="space-between" wrap="nowrap" align="center" gap="sm">
                      <div style={{ minWidth: 0 }}>
                        <Text className={uiClasses.sectionCardLabel}>{d.name}</Text>
                        <Text className={uiClasses.sectionCardDesc}>
                          {overview
                            ? `${overview.groups.length} group${
                                overview.groups.length === 1 ? '' : 's'
                              }`
                            : 'View live scores'}
                        </Text>
                      </div>
                      <ScoreStatusBadge status={status} size="xs" />
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </Stack>
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
