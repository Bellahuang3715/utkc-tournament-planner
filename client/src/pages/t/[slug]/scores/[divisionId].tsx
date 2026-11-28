import { Stack } from '@mantine/core';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useMemo } from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantLinkCard,
  ParticipantPageTitle,
} from '../../../../components/participant/ParticipantUi';
import {
  groupLabel,
  parseRouteId,
  type GroupOverview,
} from '../../../../components/participant/scores_shared';
import ScoreStatusBadge from '../../../../components/scores/ScoreStatusBadge';
import { responseIsValid } from '../../../../components/utils/util';
import {
  getPublicDivisionBracketCells,
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisionBracketsWithTeams,
  getPublicDivisionTeamBracketCells,
  getPublicDivisions,
} from '../../../../services/adapter';
import { isFinalsBracket } from '../../../../services/bracket';
import {
  SCORE_STATUS_ACCENT,
  aggregateScoreStatuses,
  computeBracketScoreStatus,
} from '../../../../utils/score_status';

export default function ParticipantScoresDivisionPage() {
  const router = useRouter();
  const { slug, preview, previewQs } = useParticipantTournamentSlug();
  const divisionId = parseRouteId(router.query.divisionId);

  const swrDivisions = getPublicDivisions(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];
  const selected = divisions.find((d: any) => d.id === divisionId) ?? null;
  const isTeams = selected?.division_type === 'TEAMS';

  const swrPlayers = getPublicDivisionBracketsWithPlayers(
    slug || null,
    preview,
    !isTeams && divisionId != null ? divisionId : null
  );
  const swrTeams = getPublicDivisionBracketsWithTeams(
    slug || null,
    preview,
    isTeams && divisionId != null ? divisionId : null
  );
  const swrPlayerCells = getPublicDivisionBracketCells(
    slug || null,
    preview,
    !isTeams && divisionId != null ? divisionId : null
  );
  const swrTeamCells = getPublicDivisionTeamBracketCells(
    slug || null,
    preview,
    isTeams && divisionId != null ? divisionId : null
  );

  const brackets = useMemo(() => {
    const raw = isTeams
      ? responseIsValid(swrTeams)
        ? swrTeams.data.data ?? []
        : []
      : responseIsValid(swrPlayers)
        ? swrPlayers.data.data ?? []
        : [];
    return [...raw]
      .filter((b: any) => !isFinalsBracket(b))
      .sort((a: any, b: any) => a.index - b.index);
  }, [isTeams, swrPlayers, swrTeams]);

  const cellsByBracket = useMemo(() => {
    const cells = isTeams
      ? responseIsValid(swrTeamCells)
        ? swrTeamCells.data.data ?? []
        : []
      : responseIsValid(swrPlayerCells)
        ? swrPlayerCells.data.data ?? []
        : [];
    const map = new Map<number, any[]>();
    for (const cell of cells) {
      const list = map.get(cell.bracket_id) ?? [];
      list.push(cell);
      map.set(cell.bracket_id, list);
    }
    return map;
  }, [isTeams, swrPlayerCells, swrTeamCells]);

  const groups: GroupOverview[] = useMemo(
    () =>
      brackets.map((b: any) => ({
        bracketId: b.id,
        index: b.index,
        title: b.title ?? null,
        numPlayers: b.num_players,
        status: computeBracketScoreStatus(b.num_players, cellsByBracket.get(b.id) ?? []),
      })),
    [brackets, cellsByBracket]
  );

  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;
  const loadingGroups =
    selected != null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));

  return (
    <ParticipantTournamentLayout>
      <Stack gap="md">
        {loadingDivisions && <ParticipantLoading />}

        {!loadingDivisions && divisionId == null && (
          <ParticipantEmpty>Invalid division.</ParticipantEmpty>
        )}

        {!loadingDivisions && divisionId != null && !selected && (
          <ParticipantEmpty>Division not found.</ParticipantEmpty>
        )}

        {selected && (
          <>
            <ParticipantPageTitle
              title={selected.name}
              subtitle="Select a group to see its scores."
              actions={
                <ScoreStatusBadge
                  size="xs"
                  status={aggregateScoreStatuses(groups.map((g) => g.status))}
                />
              }
            />

            {loadingGroups && <ParticipantLoading />}

            {!loadingGroups && groups.length === 0 && (
              <ParticipantEmpty>
                No brackets to score in this division yet.
              </ParticipantEmpty>
            )}

            <Stack gap="xs">
              {groups.map((g) => (
                <ParticipantLinkCard
                  key={g.bracketId}
                  href={`/t/${slug}/scores/${divisionId}/${g.bracketId}${previewQs}`}
                  title={groupLabel(g)}
                  description={`${selected.name} · ${g.numPlayers} ${isTeams ? 'teams' : 'players'}`}
                  accent={SCORE_STATUS_ACCENT[g.status]}
                  badge={<ScoreStatusBadge status={g.status} size="xs" />}
                />
              ))}
            </Stack>
          </>
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
