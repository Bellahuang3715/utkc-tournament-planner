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
import { getClubs } from "../../../services/adapter";
import {
  toUIPlayersWithClubAbbrev,
  fetchDivisionBracketsWithPlayers,
  replaceDivisionBrackets,
} from "../../../services/bracket";
import { fetchDivisionPlayers } from "../../../services/division";
import { assignBrackets, pickClosestSizes } from "../seeding";
import { BracketWithPlayers } from "../../../interfaces/bracket";
import { DivisionPlayer } from "../../../interfaces/division";
import { ViewMode } from "../../../interfaces/bracket";
import {
  BracketTitleEditor,
  StyleEditor,
} from "./shared";
import {
  defaultTitleStyle,
  FONT_CHOICES,
  DEFAULT_BOOKLET,
  DEFAULT_POSTER,
  type FormatStyles,
  type StyleTarget,
} from "./shared";

// ---- Helpers ----
function findPlayerLoc(
  brackets: BracketWithPlayers[],
  playerId: number
): { bracketId: number; slotIndex: number; bracketIdx: number } | null {
  for (const b of brackets) {
    const i = b.players.findIndex((s) => Number(s.player_id) === playerId);
    if (i >= 0) {
      return {
        bracketId: b.id,
        slotIndex: i,
        bracketIdx: b.players[i].bracket_idx,
      };
    }
  }
  return null;
}

// (No division-specific hardcoding; all player data comes from the API.)

// ---- Section components ----
function BracketPairCard({
  left,
  right,
  onSetTitle,
  formatStyles,
  useCodeOnly,
  playerIdToDisplayCode,
}: {
  left: BracketWithPlayers;
  right?: BracketWithPlayers;
  onSetTitle?: (bracketId: number, title: string | null) => void;
  formatStyles?: FormatStyles;
  useCodeOnly?: boolean;
  playerIdToDisplayCode?: Record<number, string>;
}) {
  const clubsQuery = getClubs();
  const clubs = clubsQuery.data?.data ?? [];

  const clubAbbrevByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubs) m.set(c.name, c.abbreviation);
    return m;
  }, [clubs]);

  const leftPlayers = useMemo(
    () => toUIPlayersWithClubAbbrev(left, clubAbbrevByName, useCodeOnly, playerIdToDisplayCode),
    [left, clubAbbrevByName, useCodeOnly, playerIdToDisplayCode]
  );

  const rightPlayers = useMemo(
    () => (right ? toUIPlayersWithClubAbbrev(right, clubAbbrevByName, useCodeOnly, playerIdToDisplayCode) : null),
    [right, clubAbbrevByName, useCodeOnly, playerIdToDisplayCode]
  );

  const groupChipText = `Groups ${left.index}${right ? ` & ${right.index}` : ""}`;

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
            <CollapsedLeft.Individuals
              size={left.num_players}
              players={leftPlayers}
              textStyles={{
                playerId: formatStyles ?? defaultTitleStyle,
                playerText: formatStyles ?? defaultTitleStyle,
              }}
            />
          </Box>
          {right && rightPlayers && (
            <Box style={{ flexShrink: 0 }}>
              <CollapsedRight.Individuals
                size={right.num_players}
                players={rightPlayers}
                textStyles={{
                  playerId: formatStyles ?? defaultTitleStyle,
                  playerText: formatStyles ?? defaultTitleStyle,
                }}
              />
            </Box>
          )}
        </Group>
      </Box>
    </Paper>
  );
}

export function BracketPairsSection({
  brackets,
  pairs,
  onSetTitle,
  formatStyles,
  useCodeOnly,
  playerIdToDisplayCode,
}: {
  brackets: BracketWithPlayers[] | null;
  pairs: Array<{ left: BracketWithPlayers; right?: BracketWithPlayers }>;
  onSetTitle?: (bracketId: number, title: string | null) => void;
  formatStyles?: FormatStyles;
  useCodeOnly?: boolean;
  playerIdToDisplayCode?: Record<number, string>;
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
            <BracketPairCard
              key={left.id}
              left={left}
              right={right}
              onSetTitle={onSetTitle}
              formatStyles={formatStyles}
              useCodeOnly={useCodeOnly}
              playerIdToDisplayCode={playerIdToDisplayCode}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function PosterGroupsSection({
  brackets,
  onSetTitle,
  formatStyles,
  useCodeOnly,
  playerIdToDisplayCode,
}: {
  brackets: BracketWithPlayers[] | null;
  onSetTitle?: (bracketId: number, title: string | null) => void;
  formatStyles?: FormatStyles;
  useCodeOnly?: boolean;
  playerIdToDisplayCode?: Record<number, string>;
}) {
  const clubsQuery = getClubs();
  const clubs = clubsQuery.data?.data ?? [];

  const clubAbbrevByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubs) m.set(c.name, c.abbreviation);
    return m;
  }, [clubs]);

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
            <Expanded.Individuals
              size={b.num_players}
              players={toUIPlayersWithClubAbbrev(b, clubAbbrevByName, useCodeOnly, playerIdToDisplayCode)}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

// ---- Full editor ----
export default function BracketsEditorIndividuals({
  division,
}: {
  division?: { name?: string; prefix?: string } | null;
}) {
  const router = useRouter();
  const { id: tournamentId } = getTournamentIdFromRouter();
  const divisionId = router.query.division_id;

  const ready = router.isReady;
  const { t } = useTranslation();

  const [players, setPlayers] = useState<DivisionPlayer[]>([]);
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

  const [brackets, setBrackets] = useState<BracketWithPlayers[] | null>(null);

  useEffect(() => {
    if (!divisionId) return;
    const divId = Number(divisionId);
    fetchDivisionBracketsWithPlayers(divId).then((res) => {
      setBrackets(res.data.data);
    });
    fetchDivisionPlayers(divId)
      .then((res) => {
        setPlayers(res.data.players ?? []);
      })
      .catch(console.error);
  }, [divisionId, division]);

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

  const playerOptions = useMemo(
    () =>
      players.map((p) => ({
        value: String(p.id),
        label: `${p.code ?? p.participant_number ?? p.id} — ${p.name ?? ""}`.trim(),
      })),
    [players]
  );

  const sorted = useMemo(
    () => (brackets ?? []).slice().sort((a, b) => a.index - b.index),
    [brackets]
  );

  const pairs = useMemo(() => {
    const out: Array<{ left: BracketWithPlayers; right?: BracketWithPlayers }> =
      [];
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

    const metaById = new Map<
      number,
      { name?: string | null; club?: string | null; code?: string | null; participant_number?: string | null }
    >();
    for (const p of players) {
      metaById.set(Number(p.id), {
        name: p.name ?? null,
        club: p.club ?? null,
        code: p.code ?? null,
        participant_number: p.participant_number ?? null,
      });
    }

    setBrackets((prev) => {
      if (!prev) return prev;
      const aLoc = findPlayerLoc(prev, aId);
      const bLoc = findPlayerLoc(prev, bId);
      if (!aLoc || !bLoc) return prev;

      const next = prev.map((br) => ({
        ...br,
        players: br.players.map((s) => ({ ...s })),
      }));

      const aBracket = next.find((b) => b.id === aLoc.bracketId);
      const bBracket = next.find((b) => b.id === bLoc.bracketId);
      if (!aBracket || !bBracket) return prev;

      const aSlot = aBracket.players[aLoc.slotIndex];
      const bSlot = bBracket.players[bLoc.slotIndex];

      const tmpPlayerId = aSlot.player_id;
      aSlot.player_id = bSlot.player_id;
      bSlot.player_id = tmpPlayerId;

      const aMeta = metaById.get(aSlot.player_id);
      aSlot.name = aMeta?.name ?? null;
      aSlot.club = aMeta?.club ?? null;
      aSlot.code = aMeta?.code ?? null;
      aSlot.participant_number = aMeta?.participant_number ?? null;

      const bMeta = metaById.get(bSlot.player_id);
      bSlot.name = bMeta?.name ?? null;
      bSlot.club = bMeta?.club ?? null;
      bSlot.code = bMeta?.code ?? null;
      bSlot.participant_number = bMeta?.participant_number ?? null;

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
      await replaceDivisionBrackets(Number(divisionId), brackets);
      setDirty(false);
      alert(t("saved", "Saved!"));
      router.push(`/tournaments/${tournamentId}/divisions`);
    } finally {
      setSaving(false);
    }
  };

  const regenerateAll = () => {
    if (!players.length) {
      alert(t("no_players", "No players in this division. Add players first."));
      return;
    }

    const currentSizes =
      (brackets ?? []).map((b) => Number(b.num_players ?? b.players?.length ?? 0));

    const totalNew = players.length;
    const proposedSizes = pickClosestSizes(currentSizes, totalNew);

    const currentSummary = currentSizes.length
      ? `${currentSizes.length} ${t("brackets", "brackets")}: [${currentSizes.join(", ")}]`
      : t("no_existing_brackets", "No existing brackets (fresh seeding).");

    const proposedSummary = `${proposedSizes.length} ${t("brackets", "brackets")}: [${proposedSizes.join(", ")}]`;

    const ok = confirm(
      t(
        "regenerate_with_sizes_confirm",
        "You currently have {{current}}.\nWith {{count}} players, the new layout will be {{proposed}}.\n\nDo you want to apply this new layout and regenerate all seeding? This will overwrite the current groups.",
        {
          current: currentSummary,
          proposed: proposedSummary,
          count: totalNew,
        },
      ),
    );
    if (!ok) return;

    const divId = Number(divisionId);
    const seeded = assignBrackets(players, proposedSizes);

    const newBrackets = seeded.map((g) => ({
      id: -g.group,
      index: g.group,
      division_id: divId,
      num_players: g.size,
      title: null,
      players: g.players.map((p, idx) => ({
        player_id: Number(p.id),
        bracket_idx: idx,
        name: p.name ?? null,
        club: p.club ?? null,
        code: p.code ?? null,
        participant_number: p.participant_number ?? null,
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

  const totalPlayers = (brackets ?? []).reduce(
    (sum, b) => sum + (b.players?.length ?? 0),
    0
  );

  return (
    <TournamentLayout tournament_id={tournamentId}>
      <Stack p="md" gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={3}>
            {t("edit_seeding", "Edit Seeding / Positions")} —{" "}
            {t("individuals", "Individuals")}
          </Title>
          <Text c="dimmed" size="sm">
            {totalPlayers} {t("players", "players")} • {sorted.length}{" "}
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
                  label={t("swap_player_a", "Swap: Player A")}
                  searchable
                  placeholder={t("select_player", "Select player")}
                  data={playerOptions}
                  value={swapA}
                  onChange={setSwapA}
                  w={280}
                />
                <Select
                  label={t("swap_player_b", "with Player B")}
                  searchable
                  placeholder={t("select_player", "Select player")}
                  data={playerOptions}
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
            <BracketPairsSection
              brackets={brackets}
              pairs={pairs}
              onSetTitle={setBracketTitle}
              formatStyles={styles}
            />
          ) : (
            <PosterGroupsSection
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
