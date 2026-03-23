import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Stack,
  Title,
  Group,
  Center,
  Loader,
  Text,
  Select,
  SegmentedControl,
  Box,
  Grid,
  Paper,
  Badge,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { CollapsedLeft, CollapsedRight, Expanded } from "tournament-brackets-ui";

import TournamentLayout from "../../../pages/tournaments/_tournament_layout";
import { getTournamentIdFromRouter } from "../util";
import { toUITeams, toUITeamNames } from "../../../services/bracket";
import {
  fetchDivisionBracketsWithTeams,
  replaceDivisionBracketsTeams,
} from "../../../services/bracket";
import { getDivisionTeams } from "../../../services/adapter";
import { assignTeamBrackets } from "../seeding_teams";
import type { BracketWithTeams } from "../../../interfaces/bracket";
import { ViewMode } from "../../../interfaces/bracket";
import type { DivisionTeam } from "../../../interfaces/division";
import { BracketTitleEditor, StyleEditor } from "./shared";
import {
  defaultTitleStyle,
  FONT_CHOICES,
  DEFAULT_BOOKLET,
  DEFAULT_POSTER,
  type FormatStyles,
  type StyleTarget,
} from "./shared";

// ---- Helpers ----
function findTeamLoc(
  brackets: BracketWithTeams[],
  teamId: number
): { bracketId: number; slotIndex: number; bracketIdx: number } | null {
  for (const b of brackets) {
    const slots = b.teams ?? [];
    const i = slots.findIndex((s) => Number(s.team_id) === teamId);
    if (i >= 0) {
      return {
        bracketId: b.id,
        slotIndex: i,
        bracketIdx: slots[i].bracket_idx,
      };
    }
  }
  return null;
}

// Team ID style from format styles (use playerId as proxy for team ID styling)
function teamIDStyleFromFormat(formatStyles?: FormatStyles) {
  const s = formatStyles?.playerId ?? defaultTitleStyle;
  return {
    teamIDFontFamily: s.fontFamily,
    teamIDColor: s.color,
    teamIDFontSize: s.fontSize,
  };
}

// ---- Section components ----
function BracketPairCardTeams({
  left,
  right,
  onSetTitle,
  formatStyles,
}: {
  left: BracketWithTeams;
  right?: BracketWithTeams;
  onSetTitle?: (bracketId: number, title: string | null) => void;
  formatStyles?: FormatStyles;
}) {
  const leftTeamNames = toUITeamNames(left);
  const rightTeamNames = right ? toUITeamNames(right) : null;
  const groupChipText = `Groups ${left.index}${right ? ` & ${right.index}` : ""}`;
  const style = teamIDStyleFromFormat(formatStyles);

  return (
    <Paper withBorder radius="md" p="md" style={{ position: "relative" }}>
      <Badge variant="light">{groupChipText}</Badge>

      {onSetTitle && (
        <Grid gutter="sm" mb="sm">
          <Grid.Col span={{ base: 12, md: right ? 6 : 12 }}>
            <BracketTitleEditor
              value={left.title}
              onChange={(t) => onSetTitle(left.id, t)}
              placeholder={`Title for Group ${left.index} (optional)`}
              titleStyle={formatStyles?.bracketTitle ?? defaultTitleStyle}
            />
          </Grid.Col>
          {right && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <BracketTitleEditor
                value={right.title}
                onChange={(t) => onSetTitle(right.id, t)}
                placeholder={`Title for Group ${right.index} (optional)`}
                titleStyle={formatStyles?.bracketTitle ?? defaultTitleStyle}
              />
            </Grid.Col>
          )}
        </Grid>
      )}

      <Box style={{ overflowX: "auto" }}>
        <Group justify="flex-start" align="center" gap="sm" wrap="nowrap">
          <Box style={{ flexShrink: 0 }}>
            <CollapsedLeft.Teams
              size={left.num_players as 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16}
              teams={leftTeamNames}
              teamIDFontFamily={style.teamIDFontFamily}
              teamIDColor={style.teamIDColor}
              teamIDFontSize={style.teamIDFontSize}
            />
          </Box>
          {right && rightTeamNames && (
            <Box style={{ flexShrink: 0 }}>
              <CollapsedRight.Teams
                size={right.num_players as 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16}
                teams={rightTeamNames}
                teamIDFontFamily={style.teamIDFontFamily}
                teamIDColor={style.teamIDColor}
                teamIDFontSize={style.teamIDFontSize}
              />
            </Box>
          )}
        </Group>
      </Box>
    </Paper>
  );
}

export function BracketPairsSectionTeams({
  brackets,
  pairs,
  onSetTitle,
  formatStyles,
}: {
  brackets: BracketWithTeams[] | null;
  pairs: Array<{ left: BracketWithTeams; right?: BracketWithTeams }>;
  onSetTitle?: (bracketId: number, title: string | null) => void;
  formatStyles?: FormatStyles;
}) {
  return (
    <Stack gap="md">
      {brackets === null ? (
        <Center style={{ minHeight: 180 }}>
          <Stack align="center" gap="xs">
            <Loader />
            <Text size="sm" c="dimmed">
              Loading brackets…
            </Text>
          </Stack>
        </Center>
      ) : pairs.length === 0 ? (
        <Center style={{ minHeight: 120 }}>
          <Text c="dimmed">No brackets found for this division.</Text>
        </Center>
      ) : (
        <Stack gap="md">
          {pairs.map(({ left, right }) => (
            <BracketPairCardTeams
              key={left.id}
              left={left}
              right={right}
              onSetTitle={onSetTitle}
              formatStyles={formatStyles}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function PosterGroupsSectionTeams({
  brackets,
  onSetTitle,
  formatStyles,
}: {
  brackets: BracketWithTeams[] | null;
  onSetTitle?: (bracketId: number, title: string | null) => void;
  formatStyles?: FormatStyles;
}) {
  if (brackets === null) {
    return (
      <Center style={{ minHeight: 180 }}>
        <Stack align="center" gap="xs">
          <Loader />
          <Text size="sm" c="dimmed">
            Loading brackets…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (brackets.length === 0) {
    return (
      <Center style={{ minHeight: 120 }}>
        <Text c="dimmed">No brackets found for this division.</Text>
      </Center>
    );
  }

  const sorted = [...brackets].sort((a, b) => a.index - b.index);
  const style = teamIDStyleFromFormat(formatStyles);

  return (
    <Stack gap="md">
      {sorted.map((b) => (
        <Paper
          key={b.id}
          withBorder
          radius="md"
          p="md"
          style={{ position: "relative" }}
        >
          <Badge variant="light">{`Group ${b.index}`}</Badge>
          {onSetTitle && (
            <Box mb="sm">
              <BracketTitleEditor
                value={b.title}
                onChange={(t) => onSetTitle(b.id, t)}
                placeholder={`Title for Group ${b.index} (optional)`}
                titleStyle={formatStyles?.bracketTitle ?? defaultTitleStyle}
              />
            </Box>
          )}
          <Box style={{ maxWidth: "100%", overflowX: "auto" }}>
            <Expanded.Teams
              size={b.num_players as 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16}
              teams={toUITeamNames(b)}
              mode="view"
              fontFamily={style.teamIDFontFamily}
              teamIDColor={style.teamIDColor}
              teamIDFontSize={style.teamIDFontSize}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

// ---- Full editor ----
export default function BracketsEditorTeams() {
  const router = useRouter();
  const { id: tournamentId } = getTournamentIdFromRouter();
  const divisionId = router.query.division_id;

  const ready = router.isReady;
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>("booklet");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [bookletStyles, setBookletStyles] =
    useState<FormatStyles>(DEFAULT_BOOKLET);
  const [posterStyles, setPosterStyles] =
    useState<FormatStyles>(DEFAULT_POSTER);
  const [styleTarget, setStyleTarget] = useState<StyleTarget>("playerId");

  const [swapA, setSwapA] = useState<string | null>(null);
  const [swapB, setSwapB] = useState<string | null>(null);

  const [brackets, setBrackets] = useState<BracketWithTeams[] | null>(null);

  const divisionTeamsQuery = getDivisionTeams(
    divisionId ? Number(divisionId) : 0
  );
  const divisionTeams: DivisionTeam[] =
    divisionTeamsQuery.data?.teams ?? [];

  useEffect(() => {
    if (!divisionId) return;
    fetchDivisionBracketsWithTeams(Number(divisionId)).then((res) => {
      setBrackets(res.data.data);
    });
  }, [divisionId]);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onRouteStart = (url: string) => {
      if (!dirty || url === router.asPath) return;
      const ok = confirm(
        t("unsaved_prompt", "You have unsaved changes. Save before leaving?")
      );
      if (!ok) {
        router.events.emit("routeChangeError");
        throw "Route change aborted.";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    router.events.on("routeChangeStart", onRouteStart);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      router.events.off("routeChangeStart", onRouteStart);
    };
  }, [dirty, router, t]);

  const teamOptions = useMemo(
    () =>
      divisionTeams.map((team) => ({
        value: String(team.id),
        label: team.code,
      })),
    [divisionTeams]
  );

  const sorted = useMemo(
    () => (brackets ?? []).slice().sort((a, b) => a.index - b.index),
    [brackets]
  );

  const pairs = useMemo(() => {
    const out: Array<{ left: BracketWithTeams; right?: BracketWithTeams }> = [];
    for (let i = 0; i < sorted.length; i += 2) {
      out.push({ left: sorted[i], right: sorted[i + 1] });
    }
    return out;
  }, [sorted]);

  const setBracketTitle = (bracketId: number, title: string | null) => {
    setBrackets((prev) => {
      if (!prev) return prev;
      return prev.map((b) => (b.id === bracketId ? { ...b, title } : b));
    });
    setDirty(true);
  };

  const doSwap = () => {
    if (!brackets || !swapA || !swapB || swapA === swapB) return;
    const aId = Number(swapA);
    const bId = Number(swapB);
    if (!Number.isFinite(aId) || !Number.isFinite(bId)) return;

    const nameById = new Map(divisionTeams.map((t) => [t.id, t.code]));

    setBrackets((prev) => {
      if (!prev) return prev;
      const aLoc = findTeamLoc(prev, aId);
      const bLoc = findTeamLoc(prev, bId);
      if (!aLoc || !bLoc) return prev;

      const next = prev.map((br) => ({
        ...br,
        teams: (br.teams ?? []).map((s) => ({ ...s })),
      }));

      const aBracket = next.find((b) => b.id === aLoc.bracketId);
      const bBracket = next.find((b) => b.id === bLoc.bracketId);
      if (!aBracket || !bBracket) return prev;

      const aSlots = aBracket.teams ?? [];
      const bSlots = bBracket.teams ?? [];
      const aSlot = aSlots[aLoc.slotIndex];
      const bSlot = bSlots[bLoc.slotIndex];
      if (!aSlot || !bSlot) return prev;

      const tmpTeamId = aSlot.team_id;
      aSlot.team_id = bSlot.team_id;
      bSlot.team_id = tmpTeamId;
      aSlot.name = nameById.get(aSlot.team_id) ?? aSlot.name ?? null;
      bSlot.name = nameById.get(bSlot.team_id) ?? bSlot.name ?? null;

      return next;
    });

    setDirty(true);
    setSwapA(null);
    setSwapB(null);
  };

  const save = async () => {
    if (!divisionId || !brackets) return;
    setSaving(true);
    try {
      await replaceDivisionBracketsTeams(Number(divisionId), brackets);
      setDirty(false);
      alert(t("saved", "Saved!"));
      router.push(`/tournaments/${tournamentId}/divisions`);
    } finally {
      setSaving(false);
    }
  };

  const regenerateAll = () => {
    const ok = confirm(
      t(
        "regenerate_confirm",
        "Regenerate all seeding? All current seeding will be lost and replaced."
      )
    );
    if (!ok) return;
    if (!divisionTeams.length) {
      alert(t("no_teams", "No teams in this division. Add teams first."));
      return;
    }
    const teamCodes = divisionTeams.map((t) => t.code);
    const teamIds = divisionTeams.map((t) => t.id);
    const biasTeamIds = divisionTeams.filter((t) => t.bias).map((t) => t.id);
    const seeded = assignTeamBrackets(teamCodes, {
      teamIds,
      biasTeamIds: biasTeamIds.length ? biasTeamIds : undefined,
    });
    const divId = Number(divisionId);
    const newBrackets: BracketWithTeams[] = seeded.map((g) => ({
      id: -g.group,
      index: g.group,
      division_id: divId,
      num_players: g.size,
      title: null,
      teams: g.teams.map((t, idx) => ({
        team_id: t.id ?? 0,
        bracket_idx: idx,
        name: t.code ?? null,
      })),
    }));
    setBrackets(newBrackets);
    setSwapA(null);
    setSwapB(null);
    setDirty(true);
  };

  const cancel = () => {
    if (!dirty || confirm(t("discard_changes", "Discard your changes?"))) {
      router.back();
    }
  };

  if (!ready) {
    return (
      <TournamentLayout tournament_id={tournamentId}>
        <Center style={{ minHeight: 300 }}>
          <Loader />
        </Center>
      </TournamentLayout>
    );
  }

  const styles = viewMode === "booklet" ? bookletStyles : posterStyles;
  const setStyles =
    viewMode === "booklet" ? setBookletStyles : setPosterStyles;

  const totalTeams = (brackets ?? []).reduce(
    (sum, b) => sum + (b.teams?.length ?? 0),
    0
  );

  return (
    <TournamentLayout tournament_id={tournamentId}>
      <Stack p="md" gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={3}>
            {t("edit_seeding", "Edit Seeding / Positions")} —{" "}
            {t("teams_title", "Teams")}
          </Title>
          <Text c="dimmed" size="sm">
            {totalTeams} {t("teams_title", "teams")} • {sorted.length}{" "}
            {t("brackets", "brackets")}
          </Text>
        </Group>

        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StyleEditor
              styles={styles}
              onChange={(next) => setStyles(next)}
              target={styleTarget}
              setTarget={setStyleTarget}
              fontChoices={FONT_CHOICES}
            />
          </Grid.Col>
        </Grid>
        <Text size="xs" c="dimmed">
          {viewMode === "booklet"
            ? t("settings_apply_booklet", "These settings apply to Booklet only.")
            : t("settings_apply_poster", "These settings apply to Poster only.")}
        </Text>

        <Box
          style={{
            position: "sticky",
            top: 60,
            zIndex: 10,
            background: "var(--mantine-color-body)",
            borderBottom: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <Stack gap="xs" p="sm">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Group wrap="wrap" gap="sm" align="flex-end">
                <Select
                  label={t("swap_team_a", "Swap: Team A")}
                  searchable
                  placeholder={t("select_team", "Select team")}
                  data={teamOptions}
                  value={swapA}
                  onChange={setSwapA}
                  w={280}
                />
                <Select
                  label={t("swap_team_b", "with Team B")}
                  searchable
                  placeholder={t("select_team", "Select team")}
                  data={teamOptions}
                  value={swapB}
                  onChange={setSwapB}
                  w={280}
                />
                <Button
                  onClick={doSwap}
                  disabled={!swapA || !swapB || swapA === swapB}
                >
                  {t("swap", "Swap")}
                </Button>
              </Group>
              <Group gap="xs">
                <Button color="red" variant="outline" onClick={regenerateAll}>
                  {t("regenerate_all", "Regenerate All")}
                </Button>
                <Button variant="default" onClick={cancel}>
                  {t("cancel")}
                </Button>
                <Button loading={saving} onClick={save}>
                  {t("save")}
                </Button>
              </Group>
            </Group>
            <Text c="dimmed" size="sm">
              {t(
                "seeding_hint",
                "Swaps update seeding and apply to both Booklet & Poster."
              )}
            </Text>
          </Stack>
        </Box>

        <Box
          style={{
            position: "sticky",
            top: 170,
            zIndex: 15,
            background: "var(--mantine-color-body)",
            borderBottom: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <Box p="sm">
            <SegmentedControl
              fullWidth
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              data={[
                { label: t("booklet", "Booklet"), value: "booklet" },
                { label: t("poster", "Poster"), value: "poster" },
              ]}
            />
          </Box>
        </Box>

        <Stack gap="sm">
          {viewMode === "booklet" ? (
            <BracketPairsSectionTeams
              brackets={brackets}
              pairs={pairs}
              onSetTitle={setBracketTitle}
              formatStyles={styles}
            />
          ) : (
            <PosterGroupsSectionTeams
              brackets={brackets}
              onSetTitle={setBracketTitle}
              formatStyles={styles}
            />
          )}
        </Stack>
      </Stack>
    </TournamentLayout>
  );
}
