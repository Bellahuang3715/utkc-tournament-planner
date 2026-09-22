import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Title,
  Text,
} from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { useRouter } from "next/router";

import TournamentLayout from "../../_tournament_layout";
import ScoreStatusBadge from "../../../../components/scores/ScoreStatusBadge";
import { getTournamentIdFromRouter } from "../../../../components/utils/util";
import RequestErrorAlert from "../../../../components/utils/error_alert";
import { getDivisions } from "../../../../services/adapter";
import {
  fetchDivisionBracketCells,
  fetchDivisionBrackets,
  fetchDivisionTeamBracketCells,
  isFinalsBracket,
  type BracketCell,
  type TeamBracketCell,
} from "../../../../services/bracket";
import {
  aggregateScoreStatuses,
  computeBracketScoreStatus,
  type ScoreStatus,
} from "../../../../utils/score_status";

type GroupStatus = {
  bracketId: number;
  index: number;
  title: string | null;
  isFinals: boolean;
  status: ScoreStatus;
};

type DivisionScoreOverview = {
  status: ScoreStatus;
  groups: GroupStatus[];
};

export default function ScoresPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: tournamentId, tournamentData } = getTournamentIdFromRouter();
  const tournamentIdValid = Number.isFinite(tournamentId);

  const swrDivisions = getDivisions(tournamentIdValid ? tournamentData.id : null);
  const divisions = swrDivisions.data?.data ?? [];

  const divisionOptions = useMemo(
    () =>
      divisions
        .map((d: any) => ({
          id: d.id as number,
          name: d.name as string,
          prefix: (d as any).prefix as string | null | undefined,
          division_type: d.division_type as string,
          totalPlayers: (d as any).totalPlayers as number | undefined,
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        ),
    [divisions],
  );

  const divisionIdsKey = useMemo(
    () => divisionOptions.map((d) => d.id).join(","),
    [divisionOptions],
  );

  const [overviewByDivision, setOverviewByDivision] = useState<
    Record<number, DivisionScoreOverview>
  >({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  useEffect(() => {
    if (!tournamentIdValid || !divisionIdsKey) {
      setOverviewByDivision({});
      setLoadingStatuses(false);
      return;
    }

    const divisionIds = divisionIdsKey.split(",").map(Number);
    let cancelled = false;
    setLoadingStatuses(true);

    const run = async () => {
      const entries = await Promise.all(
        divisionIds.map(async (divisionId) => {
          try {
            const division = divisionOptions.find((d) => d.id === divisionId);
            const isTeams = division?.division_type === "TEAMS";
            const [bracketsRes, cellsRes] = await Promise.all([
              fetchDivisionBrackets(divisionId),
              isTeams
                ? fetchDivisionTeamBracketCells(divisionId)
                : fetchDivisionBracketCells(divisionId),
            ]);
            const brackets = (bracketsRes.data?.data ?? []) as Array<{
              id: number;
              index: number;
              num_players: number;
              title?: string | null;
            }>;
            const cells = (cellsRes.data?.data ?? []) as Array<
              BracketCell | TeamBracketCell
            >;
            const cellsByBracket = new Map<number, Array<BracketCell | TeamBracketCell>>();
            for (const cell of cells) {
              const list = cellsByBracket.get(cell.bracket_id) ?? [];
              list.push(cell);
              cellsByBracket.set(cell.bracket_id, list);
            }

            const groups: GroupStatus[] = brackets
              .slice()
              .sort((a, b) => a.index - b.index)
              .map((b) => ({
                bracketId: b.id,
                index: b.index,
                title: b.title ?? null,
                isFinals: isFinalsBracket(b),
                status: computeBracketScoreStatus(
                  b.num_players,
                  cellsByBracket.get(b.id) ?? [],
                ),
              }));

            const overview: DivisionScoreOverview = {
              status: aggregateScoreStatuses(groups.map((g) => g.status)),
              groups,
            };
            return [divisionId, overview] as const;
          } catch {
            return [
              divisionId,
              { status: "not_started" as ScoreStatus, groups: [] },
            ] as const;
          }
        }),
      );

      if (cancelled) return;
      const next: Record<number, DivisionScoreOverview> = {};
      for (const [id, overview] of entries) next[id] = overview;
      setOverviewByDivision(next);
      setLoadingStatuses(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [tournamentIdValid, divisionIdsKey, divisionOptions]);

  if (swrDivisions.error) return <RequestErrorAlert error={swrDivisions.error} />;

  if (!tournamentIdValid || !swrDivisions.data) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 400 }}>
          <Loader />
        </Center>
      </TournamentLayout>
    );
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="md" p="md">
        <Title order={2}>{t("scores_title", "Scores")}</Title>

        {!swrDivisions.data || swrDivisions.isLoading ? (
          <Center style={{ minHeight: 220 }}>
            <Loader />
          </Center>
        ) : divisionOptions.length === 0 ? (
          <Text c="dimmed">{t("no_divisions", "No divisions found.")}</Text>
        ) : (
          <>
            <Text c="dimmed">
              {t(
                "scores_note_blocks",
                "Pick a division to open the fillable scoring editor.",
              )}
            </Text>
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing="md"
              breakpoints={[
                { maxWidth: 36, cols: 1, spacing: "sm" },
              ]}
            >
              {divisionOptions.map((d) => {
                const subtitle =
                  typeof d.totalPlayers === "number"
                    ? `${d.totalPlayers} ${t("players", "players")}`
                    : d.prefix
                      ? `Prefix: ${d.prefix}`
                      : undefined;
                const overview = overviewByDivision[d.id];
                const poolGroups =
                  overview?.groups.filter((g) => !g.isFinals) ?? [];
                const finalsGroup = overview?.groups.find((g) => g.isFinals);

                return (
                  <Card
                    key={d.id}
                    withBorder
                    radius="md"
                    p="md"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      router.push(`/tournaments/${tournamentData.id}/scores/${d.id}`)
                    }
                  >
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={600}>{d.name}</Text>
                          {subtitle && (
                            <Text size="sm" c="dimmed">
                              {subtitle}
                            </Text>
                          )}
                        </Stack>
                        <Stack gap={6} align="flex-end">
                          <Badge
                            color={d.division_type === "TEAMS" ? "blue" : "violet"}
                            variant="light"
                          >
                            {d.division_type === "TEAMS"
                              ? t("teams", "Teams")
                              : t("individuals", "Individuals")}
                          </Badge>
                          {loadingStatuses && !overview ? (
                            <Loader size="xs" />
                          ) : overview ? (
                            <ScoreStatusBadge status={overview.status} />
                          ) : null}
                        </Stack>
                      </Group>

                      {overview && (poolGroups.length > 0 || finalsGroup) && (
                        <Stack gap={4}>
                          {poolGroups.map((g) => (
                            <Group key={g.bracketId} justify="space-between" gap="xs">
                              <Text size="xs" c="dimmed">
                                {g.title?.trim()
                                  ? g.title
                                  : t("bracket_group_label", "Group {{n}}", {
                                      n: g.index,
                                    })}
                              </Text>
                              <ScoreStatusBadge status={g.status} size="xs" />
                            </Group>
                          ))}
                          {finalsGroup && (
                            <Group justify="space-between" gap="xs">
                              <Text size="xs" c="dimmed">
                                {t("finals", "Finals")}
                              </Text>
                              <ScoreStatusBadge status={finalsGroup.status} size="xs" />
                            </Group>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          </>
        )}
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
