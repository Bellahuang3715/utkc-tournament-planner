import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Divider,
  Center,
  Grid,
  Group,
  Loader,
  Card,
  Paper,
  SimpleGrid,
  Stack,
  Title,
  Text,
  Badge,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Expanded } from "tournament-brackets-ui";

import TournamentLayout from "../../../_tournament_layout";
import RequestErrorAlert from "../../../../../components/utils/error_alert";
import { getTournamentIdFromRouter } from "../../../../../components/utils/util";
import { getClubs, getDivisions } from "../../../../../services/adapter";
import {
  fetchDivisionBracketsWithPlayers,
  fetchDivisionBracketsWithTeams,
  toUIPlayersWithClubAbbrev,
  toUITeamNames,
} from "../../../../../services/bracket";
import { DEFAULT_BOOKLET } from "../../../../../components/utils/brackets_editor/shared";
import type { BracketWithPlayers, BracketWithTeams } from "../../../../../interfaces/bracket";

export default function DivisionScoresEditorPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const { id: tournamentId, tournamentData } = getTournamentIdFromRouter();
  const tournamentIdValid = Number.isFinite(tournamentId);

  const divisionIdParam = router.query.division_id;
  const divisionId = useMemo(() => {
    const raw = Array.isArray(divisionIdParam)
      ? divisionIdParam[0]
      : divisionIdParam;
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [divisionIdParam]);

  // The divisions list gives us the division title + type (teams vs individuals).
  const swrDivisions = getDivisions(tournamentIdValid ? tournamentData.id : null);
  const divisions = swrDivisions.data?.data ?? [];

  const selectedDivision = useMemo(
    () => (divisionId == null ? null : divisions.find((d: any) => d.id === divisionId) ?? null),
    [divisions, divisionId],
  );

  const swrClubs = getClubs();
  const clubs = swrClubs.data?.data ?? [];

  const clubAbbrevByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubs) m.set(c.name, c.abbreviation);
    return m;
  }, [clubs]);

  const [bracketsPlayers, setBracketsPlayers] = useState<BracketWithPlayers[] | null>(null);
  const [bracketsTeams, setBracketsTeams] = useState<BracketWithTeams[] | null>(null);
  const [loadingBrackets, setLoadingBrackets] = useState(false);
  const [bracketsLoaded, setBracketsLoaded] = useState(false);

  // Future multi-user support: when we add persistence + conflict handling,
  // we should persist changes per `bracket.id` (group) so concurrent editors
  // touching different groups don't block each other.
  const [activeBracketId, setActiveBracketId] = useState<number | null>(null);

  useEffect(() => {
    if (!divisionId || !selectedDivision) return;
    setLoadingBrackets(true);
    setBracketsLoaded(false);
    setActiveBracketId(null);

    const run = async () => {
      try {
        if (selectedDivision.division_type === "TEAMS") {
          setBracketsPlayers(null);
          const res = await fetchDivisionBracketsWithTeams(divisionId);
          setBracketsTeams(res.data.data as BracketWithTeams[]);
        } else {
          setBracketsTeams(null);
          const res = await fetchDivisionBracketsWithPlayers(divisionId);
          setBracketsPlayers(res.data.data as BracketWithPlayers[]);
        }
      } finally {
        setLoadingBrackets(false);
        setBracketsLoaded(true);
      }
    };

    run();
  }, [divisionId, selectedDivision]);

  const sortedPlayers = useMemo(
    () => (bracketsPlayers ?? []).slice().sort((a, b) => a.index - b.index),
    [bracketsPlayers],
  );
  const sortedTeams = useMemo(
    () => (bracketsTeams ?? []).slice().sort((a, b) => a.index - b.index),
    [bracketsTeams],
  );

  // Keep active selection stable when data changes.
  useEffect(() => {
    if (activeBracketId != null) return;
    if (selectedDivision?.division_type === "TEAMS") {
      if (sortedTeams.length > 0) setActiveBracketId(sortedTeams[0].id);
    } else {
      if (sortedPlayers.length > 0) setActiveBracketId(sortedPlayers[0].id);
    }
  }, [activeBracketId, selectedDivision, sortedPlayers, sortedTeams]);

  useEffect(() => {
    if (activeBracketId == null) return;
    if (selectedDivision?.division_type === "TEAMS") {
      const stillExists = sortedTeams.some((b) => b.id === activeBracketId);
      if (!stillExists) setActiveBracketId(sortedTeams[0]?.id ?? null);
    } else {
      const stillExists = sortedPlayers.some((b) => b.id === activeBracketId);
      if (!stillExists) setActiveBracketId(sortedPlayers[0]?.id ?? null);
    }
  }, [activeBracketId, selectedDivision, sortedPlayers, sortedTeams]);

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

  if (divisionId == null) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 300 }}>
          <Text c="dimmed">Invalid division.</Text>
        </Center>
      </TournamentLayout>
    );
  }

  if (!selectedDivision) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 300 }}>
          <Text c="dimmed">Division not found.</Text>
        </Center>
      </TournamentLayout>
    );
  }

  const groupsForCards = useMemo(() => {
    return selectedDivision.division_type === "TEAMS"
      ? (sortedTeams as Array<BracketWithPlayers | BracketWithTeams>)
      : (sortedPlayers as Array<BracketWithPlayers | BracketWithTeams>);
  }, [selectedDivision.division_type, sortedTeams, sortedPlayers]);

  const activeTeams = useMemo(() => {
    if (activeBracketId == null) return null;
    return sortedTeams.find((b) => b.id === activeBracketId) ?? null;
  }, [activeBracketId, sortedTeams]);

  const activePlayers = useMemo(() => {
    if (activeBracketId == null) return null;
    return sortedPlayers.find((b) => b.id === activeBracketId) ?? null;
  }, [activeBracketId, sortedPlayers]);

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="md" p="md">
        <Stack gap={2}>
          <Title order={2}>{t("scores_editor_title", "Score Editor")}</Title>
          <Text c="dimmed">
            {selectedDivision.name}
            {selectedDivision.prefix ? ` (${selectedDivision.prefix})` : ""}
          </Text>
          <Text size="sm" c="dimmed">
            Click a group card to edit its fillable scores.
          </Text>
        </Stack>

        <Grid gutter="md" align="start">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper withBorder radius="md" p="md">
              <Group position="apart" mb="sm">
                <Text weight={600}>{t("groups", "Groups")}</Text>
                <Badge variant="light" color="blue">
                  {selectedDivision.division_type === "TEAMS"
                    ? t("teams", "Teams")
                    : t("individuals", "Individuals")}
                </Badge>
              </Group>

              {loadingBrackets && !bracketsLoaded ? (
                <Center style={{ minHeight: 120 }}>
                  <Loader />
                </Center>
              ) : groupsForCards.length === 0 && bracketsLoaded ? (
                <Text c="dimmed">{t("no_groups", "No groups found.")}</Text>
              ) : (
                <SimpleGrid cols={1} spacing="sm">
                  {groupsForCards.map((b) => {
                    const isActive = activeBracketId === b.id;
                    return (
                      <Card
                        key={b.id}
                        withBorder
                        radius="md"
                        p="sm"
                        onClick={() => setActiveBracketId(b.id)}
                        style={{
                          cursor: "pointer",
                          background: isActive ? "var(--mantine-color-blue-0)" : undefined,
                          borderColor: isActive ? "var(--mantine-color-blue-5)" : undefined,
                        }}
                      >
                        <Group position="apart">
                          <Text weight={600}>{`Group ${b.index}`}</Text>
                          <Badge variant="light">{b.num_players}x</Badge>
                        </Group>
                        {b.title ? (
                          <Text size="xs" c="dimmed" mt={2}>
                            {b.title}
                          </Text>
                        ) : null}
                      </Card>
                    );
                  })}
                </SimpleGrid>
              )}
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            {loadingBrackets && !bracketsLoaded ? (
              <Center style={{ minHeight: 260 }}>
                <Loader />
              </Center>
            ) : (
              <>
                {selectedDivision.division_type === "TEAMS" && activeTeams && (
                  <Paper withBorder radius="md" p="md">
                    <Group position="apart" mb="sm">
                      <Badge variant="light">{`Editing: Group ${activeTeams.index}`}</Badge>
                      {/* Placeholder for future persistence */}
                      <Text size="sm" c="dimmed">
                        Local editing (saving UI coming soon)
                      </Text>
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      <Expanded.Teams
                        key={`teams-${activeTeams.id}`}
                        size={activeTeams.num_players as 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16}
                        teams={toUITeamNames(activeTeams)}
                        mode="fillable"
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDColor={DEFAULT_BOOKLET.playerId.color}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                      />
                    </Box>
                  </Paper>
                )}

                {selectedDivision.division_type !== "TEAMS" && activePlayers && (
                  <Paper withBorder radius="md" p="md">
                    <Group position="apart" mb="sm">
                      <Badge variant="light">{`Editing: Group ${activePlayers.index}`}</Badge>
                      {/* Placeholder for future persistence */}
                      <Text size="sm" c="dimmed">
                        Local editing (saving UI coming soon)
                      </Text>
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      {(() => {
                        const players = toUIPlayersWithClubAbbrev(activePlayers, clubAbbrevByName);
                        // tournament-brackets-ui fillable mode expects `player.score` to exist.
                        const playersFillable = players.map((p) => ({
                          ...p,
                          score: (p as any).score ?? "",
                        }));
                        return (
                          <Expanded.Individuals
                            key={`individuals-${activePlayers.id}`}
                            size={activePlayers.num_players}
                            players={playersFillable as any}
                            mode="fillable"
                            textStyles={{
                              playerId: DEFAULT_BOOKLET.playerId,
                              playerText: DEFAULT_BOOKLET.playerText,
                            }}
                          />
                        );
                      })()}
                    </Box>
                  </Paper>
                )}
              </>
            )}
          </Grid.Col>
        </Grid>
        <Divider />
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});

