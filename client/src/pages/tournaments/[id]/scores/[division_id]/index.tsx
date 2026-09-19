import React, { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Code,
  Divider,
  Center,
  Group,
  Loader,
  Paper,
  Popover,
  SegmentedControl,
  Stack,
  Title,
  Text,
  Badge,
  Tabs,
  useComputedColorScheme,
} from "@mantine/core";
import { IconQuestionMark } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
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

type PageMode = "view" | "edit";
type BracketUiMode = "view" | "fillable";
type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

const SCORE_LEGEND: Array<{ code: string; labelKey: string; labelDefault: string }> = [
  { code: "M", labelKey: "score_legend_men", labelDefault: "Men" },
  { code: "K", labelKey: "score_legend_kote", labelDefault: "Kote" },
  { code: "D", labelKey: "score_legend_do", labelDefault: "Do" },
  { code: "T", labelKey: "score_legend_tsuki", labelDefault: "Tsuki" },
  { code: "H", labelKey: "score_legend_hansoku", labelDefault: "Hansoku" },
];

type PlayoffStage = {
  /** Tab value, e.g. `playoff-finals`. */
  key: string;
  size: ExpandedSize;
  labelKey: string;
  labelDefault: string;
};

const EXPANDED_SIZE_SET = new Set<number>([
  ...EXPANDED_SIZES_TEAMS,
  ...EXPANDED_SIZES_INDIVIDUALS,
]);

/** Single Finals tab; slot count = number of groups (when that size is supported). */
function getFinalsStage(numGroups: number): PlayoffStage | null {
  if (numGroups < 2 || !EXPANDED_SIZE_SET.has(numGroups)) return null;
  return {
    key: "playoff-finals",
    size: numGroups as ExpandedSize,
    labelKey: "finals",
    labelDefault: "Finals",
  };
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
  const colorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const bracketTheme = colorScheme === "dark" ? "dark" : "light";
  /** Fonts only — omit color so dark/light ink comes from the library theme. */
  const bracketTextStyles = useMemo(
    () => ({
      playerId: {
        fontFamily: DEFAULT_BOOKLET.playerId.fontFamily,
        fontSize: DEFAULT_BOOKLET.playerId.fontSize,
      },
      playerText: {
        fontFamily: DEFAULT_BOOKLET.playerText.fontFamily,
        fontSize: DEFAULT_BOOKLET.playerText.fontSize,
      },
    }),
    [],
  );

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
  const [pageMode, setPageMode] = useState<PageMode>("view");
  /** Bumped on Cancel so fillable brackets remount from saved props. */
  const [bracketRevision, setBracketRevision] = useState(0);

  const bracketUiMode: BracketUiMode = pageMode === "edit" ? "fillable" : "view";

  const enterEdit = () => setPageMode("edit");
  const cancelEdit = () => {
    setBracketRevision((n) => n + 1);
    setPageMode("view");
  };
  const saveEdit = () => {
    // Local commit for now — bracket components keep in-memory edits when
    // switching fillable → view without remounting. Persist API TBD.
    setPageMode("view");
  };

  useEffect(() => {
    if (!divisionId || !selectedDivision) return;
    setLoadingBrackets(true);
    setBracketsLoaded(false);
    setActiveTab(null);
    setPageMode("view");
    setBracketRevision(0);

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

  const playoffStages = useMemo(() => {
    const finals = getFinalsStage(groupsForCards.length);
    return finals ? [finals] : [];
  }, [groupsForCards.length]);
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
              {pageMode === "edit"
                ? t(
                    "scores_editor_edit_hint",
                    "Edit scores below, then Save or Cancel.",
                  )
                : t(
                    "scores_editor_view_hint",
                    "Viewing scores. Switch to Edit to make changes.",
                  )}
            </Text>
          </Stack>
          <Group gap="sm" align="center" wrap="wrap">
            <Popover width={220} position="bottom-end" withArrow shadow="md">
              <Popover.Target>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size="md"
                  aria-label={t("score_legend_aria", "Score legend")}
                >
                  <IconQuestionMark size={16} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    {t("score_legend_title", "Score legend")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t(
                      "score_legend_hint",
                      "Enter these letters in the score box:",
                    )}
                  </Text>
                  <Stack gap={6}>
                    {SCORE_LEGEND.map((item) => (
                      <Group key={item.code} gap="sm" wrap="nowrap">
                        <Code w={28} ta="center" fw={700}>
                          {item.code}
                        </Code>
                        <Text size="sm">{t(item.labelKey, item.labelDefault)}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Badge variant="light" color="blue" size="lg">
              {selectedDivision.division_type === "TEAMS"
                ? t("teams", "Teams")
                : t("individuals", "Individuals")}
            </Badge>
            <SegmentedControl
              value={pageMode}
              onChange={(v) => {
                if (v === "edit") enterEdit();
                else if (pageMode === "edit") cancelEdit();
                else setPageMode("view");
              }}
              data={[
                { label: t("view", "View"), value: "view" },
                { label: t("edit", "Edit"), value: "edit" },
              ]}
            />
          </Group>
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
                      <Badge variant="light">
                        {pageMode === "edit"
                          ? t("editing_group", "Editing: Group {{n}}", { n: b.index })
                          : t("viewing_group", "Viewing: Group {{n}}", { n: b.index })}
                      </Badge>
                      {pageMode === "edit" && (
                        <Text size="sm" c="dimmed">
                          {t("scores_local_edit_hint", "Local editing (saving to server coming soon)")}
                        </Text>
                      )}
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      <Expanded.Teams
                        key={`teams-${b.id}-${bracketRevision}-${bracketTheme}`}
                        size={b.num_players as ExpandedSize}
                        teams={toUITeamNames(b as BracketWithTeams)}
                        mode={bracketUiMode}
                        theme={bracketTheme}
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                      />
                    </Box>
                  </Paper>
                ) : (
                  <Paper withBorder radius="md" p="md">
                    <Group justify="space-between" mb="sm">
                      <Badge variant="light">
                        {pageMode === "edit"
                          ? t("editing_group", "Editing: Group {{n}}", { n: b.index })
                          : t("viewing_group", "Viewing: Group {{n}}", { n: b.index })}
                      </Badge>
                      {pageMode === "edit" && (
                        <Text size="sm" c="dimmed">
                          {t("scores_local_edit_hint", "Local editing (saving to server coming soon)")}
                        </Text>
                      )}
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
                            key={`individuals-${b.id}-${bracketRevision}-${bracketTheme}`}
                            size={b.num_players}
                            players={playersFillable as any}
                            mode={bracketUiMode}
                            theme={bracketTheme}
                            textStyles={bracketTextStyles}
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
                      {pageMode === "edit"
                        ? `${t("edit", "Edit")}: ${t(stage.labelKey, stage.labelDefault, { n: stage.size })}`
                        : `${t("view", "View")}: ${t(stage.labelKey, stage.labelDefault, { n: stage.size })}`}
                    </Badge>
                    {pageMode === "edit" && (
                      <Text size="sm" c="dimmed">
                        {t("scores_local_edit_hint", "Local editing (saving to server coming soon)")}
                      </Text>
                    )}
                  </Group>
                  <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                    {selectedDivision.division_type === "TEAMS" ? (
                      <Expanded.Teams
                        key={`playoff-teams-${stage.size}-${bracketRevision}-${bracketTheme}`}
                        size={stage.size}
                        teams={emptyPlayoffTeams(stage.size)}
                        mode={bracketUiMode}
                        theme={bracketTheme}
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                      />
                    ) : (
                      <Expanded.Individuals
                        key={`playoff-individuals-${stage.size}-${bracketRevision}-${bracketTheme}`}
                        size={stage.size}
                        players={emptyPlayoffPlayers(stage.size) as any}
                        mode={bracketUiMode}
                        theme={bracketTheme}
                        textStyles={bracketTextStyles}
                      />
                    )}
                  </Box>
                </Paper>
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
        {pageMode === "edit" && (
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={cancelEdit}>
              {t("cancel", "Cancel")}
            </Button>
            <Button onClick={saveEdit}>{t("save", "Save")}</Button>
          </Group>
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
