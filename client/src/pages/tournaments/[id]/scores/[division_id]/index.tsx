import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Divider,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Title,
  Text,
  Badge,
  Tabs,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Expanded, EXPANDED_SIZES_INDIVIDUALS, EXPANDED_SIZES_TEAMS } from "tournament-brackets-ui";

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

type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

type PlayoffStage = {
  /** Tab value, e.g. `playoff-4`. */
  key: string;
  size: ExpandedSize;
  labelKey: string;
  labelDefault: string;
};

const PLAYOFF_STAGE_LABELS: Record<number, { key: string; default: string }> = {
  2: { key: "finals", default: "Finals" },
  4: { key: "semifinals", default: "Semifinals" },
  8: { key: "quarterfinals", default: "Quarterfinals" },
  16: { key: "round_of_16", default: "Round of 16" },
};

const EXPANDED_SIZE_SET = new Set<number>([
  ...EXPANDED_SIZES_TEAMS,
  ...EXPANDED_SIZES_INDIVIDUALS,
]);

/** Knockout tabs from group count: e.g. 8 → QF (8) + SF (4) + F (2). */
function getPlayoffStages(numGroups: number): PlayoffStage[] {
  if (numGroups < 2) return [];

  const stages: PlayoffStage[] = [];
  let size = numGroups;

  while (size >= 2) {
    if (EXPANDED_SIZE_SET.has(size)) {
      const named = PLAYOFF_STAGE_LABELS[size];
      stages.push({
        key: `playoff-${size}`,
        size: size as ExpandedSize,
        labelKey: named?.key ?? "round_of_n",
        labelDefault: named?.default ?? "Round of {{n}}",
      });
    }
    if (size === 2) break;
    size = Math.ceil(size / 2);
  }

  return stages;
}

function emptyPlayoffPlayers(size: number) {
  return Array.from({ length: size }, () => ({
    id: "",
    name: "",
    club: null as string | null,
    score: "",
  }));
}

function emptyPlayoffTeams(size: number) {
  return Array.from({ length: size }, () => "");
}

function groupTabValue(bracketId: number) {
  return `group-${bracketId}`;
}

function isPlayoffTab(tab: string) {
  return tab.startsWith("playoff-");
}

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

  /** `group-{id}` for a pool bracket, or `playoff-{size}` for knockout stages. */
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!divisionId || !selectedDivision) return;
    setLoadingBrackets(true);
    setBracketsLoaded(false);
    setActiveTab(null);

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

  const groupsForCards = useMemo(() => {
    if (!selectedDivision) return [] as Array<BracketWithPlayers | BracketWithTeams>;
    return selectedDivision.division_type === "TEAMS"
      ? (sortedTeams as Array<BracketWithPlayers | BracketWithTeams>)
      : (sortedPlayers as Array<BracketWithPlayers | BracketWithTeams>);
  }, [selectedDivision, sortedTeams, sortedPlayers]);

  const playoffStages = useMemo(
    () => getPlayoffStages(groupsForCards.length),
    [groupsForCards.length],
  );
  const playoffKeys = useMemo(
    () => new Set(playoffStages.map((s) => s.key)),
    [playoffStages],
  );

  // Keep active selection stable when data changes.
  useEffect(() => {
    if (activeTab != null) return;
    if (selectedDivision?.division_type === "TEAMS") {
      if (sortedTeams.length > 0) setActiveTab(groupTabValue(sortedTeams[0].id));
    } else {
      if (sortedPlayers.length > 0) setActiveTab(groupTabValue(sortedPlayers[0].id));
    }
  }, [activeTab, selectedDivision, sortedPlayers, sortedTeams]);

  useEffect(() => {
    if (activeTab == null) return;
    if (isPlayoffTab(activeTab)) {
      if (!playoffKeys.has(activeTab)) {
        const first =
          selectedDivision?.division_type === "TEAMS" ? sortedTeams[0] : sortedPlayers[0];
        if (first) setActiveTab(groupTabValue(first.id));
      }
      return;
    }
    if (!activeTab.startsWith("group-")) return;
    const id = Number(activeTab.slice("group-".length));
    if (!Number.isFinite(id)) return;
    if (selectedDivision?.division_type === "TEAMS") {
      const stillExists = sortedTeams.some((b) => b.id === id);
      if (!stillExists) setActiveTab(sortedTeams[0] ? groupTabValue(sortedTeams[0].id) : null);
    } else {
      const stillExists = sortedPlayers.some((b) => b.id === id);
      if (!stillExists) setActiveTab(sortedPlayers[0] ? groupTabValue(sortedPlayers[0].id) : null);
    }
  }, [activeTab, playoffKeys, selectedDivision, sortedPlayers, sortedTeams]);

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

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="md" p="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Title order={2}>{t("scores_editor_title", "Score Editor")}</Title>
            <Text c="dimmed">
              {selectedDivision.name}
              {selectedDivision.prefix ? ` (${selectedDivision.prefix})` : ""}
            </Text>
            <Text size="sm" c="dimmed">
              {t(
                "scores_editor_tabs_hint",
                "Use the tabs above to switch groups and edit fillable scores.",
              )}
            </Text>
          </Stack>
          <Badge variant="light" color="blue" size="lg">
            {selectedDivision.division_type === "TEAMS"
              ? t("teams", "Teams")
              : t("individuals", "Individuals")}
          </Badge>
        </Group>

        {loadingBrackets && !bracketsLoaded ? (
          <Center style={{ minHeight: 260 }}>
            <Loader />
          </Center>
        ) : groupsForCards.length === 0 && bracketsLoaded ? (
          <Text c="dimmed">{t("no_groups", "No groups found.")}</Text>
        ) : (
          <Tabs
            value={activeTab ?? undefined}
            onChange={(v) => v && setActiveTab(v)}
            variant="outline"
            radius="md"
          >
            <Tabs.List style={{ flexWrap: "nowrap", overflowX: "auto" }}>
              {groupsForCards.map((b) => (
                <Tabs.Tab key={b.id} value={groupTabValue(b.id)}>
                  {t("bracket_group_label", "Group {{n}}", { n: b.index })}
                </Tabs.Tab>
              ))}
              {playoffStages.map((stage) => (
                <Tabs.Tab key={stage.key} value={stage.key}>
                  {t(stage.labelKey, stage.labelDefault, { n: stage.size })}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {groupsForCards.map((b) => (
              <Tabs.Panel key={b.id} value={groupTabValue(b.id)} pt="md">
                {selectedDivision.division_type === "TEAMS" ? (
                  <Paper withBorder radius="md" p="md">
                    <Group justify="space-between" mb="sm">
                      <Badge variant="light">{`Editing: Group ${b.index}`}</Badge>
                      <Text size="sm" c="dimmed">
                        Local editing (saving UI coming soon)
                      </Text>
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      <Expanded.Teams
                        key={`teams-${b.id}`}
                        size={b.num_players as ExpandedSize}
                        teams={toUITeamNames(b as BracketWithTeams)}
                        mode="fillable"
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDColor={DEFAULT_BOOKLET.playerId.color}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                      />
                    </Box>
                  </Paper>
                ) : (
                  <Paper withBorder radius="md" p="md">
                    <Group justify="space-between" mb="sm">
                      <Badge variant="light">{`Editing: Group ${b.index}`}</Badge>
                      <Text size="sm" c="dimmed">
                        Local editing (saving UI coming soon)
                      </Text>
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      {(() => {
                        const players = toUIPlayersWithClubAbbrev(
                          b as BracketWithPlayers,
                          clubAbbrevByName,
                        );
                        const playersFillable = players.map((p) => ({
                          ...p,
                          score: (p as any).score ?? "",
                        }));
                        return (
                          <Expanded.Individuals
                            key={`individuals-${b.id}`}
                            size={b.num_players}
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
              </Tabs.Panel>
            ))}

            {playoffStages.map((stage) => (
              <Tabs.Panel key={stage.key} value={stage.key} pt="md">
                <Paper withBorder radius="md" p="md">
                  <Group justify="space-between" mb="sm">
                    <Badge variant="light" color="grape">
                      {t(stage.labelKey, stage.labelDefault, { n: stage.size })}
                    </Badge>
                    <Text size="sm" c="dimmed">
                      Local editing (saving UI coming soon)
                    </Text>
                  </Group>
                  <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                    {selectedDivision.division_type === "TEAMS" ? (
                      <Expanded.Teams
                        key={`playoff-teams-${stage.size}`}
                        size={stage.size}
                        teams={emptyPlayoffTeams(stage.size)}
                        mode="fillable"
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDColor={DEFAULT_BOOKLET.playerId.color}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                      />
                    ) : (
                      <Expanded.Individuals
                        key={`playoff-individuals-${stage.size}`}
                        size={stage.size}
                        players={emptyPlayoffPlayers(stage.size) as any}
                        mode="fillable"
                        textStyles={{
                          playerId: DEFAULT_BOOKLET.playerId,
                          playerText: DEFAULT_BOOKLET.playerText,
                        }}
                      />
                    )}
                  </Box>
                </Paper>
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
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
