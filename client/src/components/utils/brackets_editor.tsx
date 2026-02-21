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
  NumberInput,
  ColorInput,
  SegmentedControl,
  Box,
  Paper,
  Grid,
  Badge,
  TextInput,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import {
  CollapsedLeft,
  CollapsedRight,
  Expanded,
} from "tournament-brackets-ui";

import TournamentLayout from "../../pages/tournaments/_tournament_layout";
import { getTournamentIdFromRouter } from "../utils/util";
import { BracketWithPlayers } from "../../interfaces/bracket";
import {
  toUIPlayers,
  fetchDivisionBracketsWithPlayers,
} from "../../services/bracket";
import { fetchDivisionPlayers } from "../../services/division";
import { DivisionPlayer } from "../../interfaces/division";
import { replaceDivisionBrackets } from "../../services/bracket";

type ViewMode = "booklet" | "poster";

// ---------------------------------------------

type StyleTarget = "playerId" | "playerText" | "bracketTitle";

type TextStyle = {
  fontFamily: string;
  fontSize: number; // pt
  color: string;
  bold?: boolean;
};

type FormatStyles = Record<StyleTarget, TextStyle>;

type PlayerLoc = {
  bracketId: number;
  slotIndex: number; // index into b.players[]
  bracketIdx: number; // b.players[slotIndex].bracket_idx
};

function findPlayerLoc(
  brackets: BracketWithPlayers[],
  playerId: number,
): PlayerLoc | null {
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

const FONT_CHOICES = [
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  "Roboto, Helvetica, Arial, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
];

const DEFAULT_BOOKLET: FormatStyles = {
  playerId: { fontFamily: FONT_CHOICES[0], fontSize: 11, color: "#000000" },
  playerText: { fontFamily: FONT_CHOICES[0], fontSize: 11, color: "#333333" },
  bracketTitle: { fontFamily: FONT_CHOICES[0], fontSize: 12, color: "#111111" },
};

const DEFAULT_POSTER: FormatStyles = {
  playerId: { fontFamily: FONT_CHOICES[1], fontSize: 16, color: "#111111" },
  playerText: { fontFamily: FONT_CHOICES[1], fontSize: 14, color: "#222222" },
  bracketTitle: { fontFamily: FONT_CHOICES[1], fontSize: 18, color: "#111111" },
};

function BracketTitleEditor({
  value,
  onChange,
  placeholder,
  titleStyle,
}: {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  placeholder?: string;
  titleStyle: TextStyle;
}) {
  return (
    <TextInput
      label="Title"
      placeholder={placeholder ?? "Add title (optional)"}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.currentTarget.value;
        onChange(v.trim() === "" ? null : v);
      }}
      styles={{
        input: {
          fontFamily: titleStyle.fontFamily,
          fontSize: `${titleStyle.fontSize}pt`,
          color: titleStyle.color,
        },
        label: {
          fontFamily: titleStyle.fontFamily,
          color: titleStyle.color,
        },
      }}
    />
  );
}

function BracketPairsSection({
  brackets,
  pairs,
  onSetTitle,
  formatStyles,
}: {
  brackets: BracketWithPlayers[] | null;
  pairs: Array<{ left: BracketWithPlayers; right?: BracketWithPlayers }>;
  onSetTitle: (bracketId: number, title: string | null) => void;
  formatStyles: FormatStyles;
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
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function BracketPairCard({
  left,
  right,
  onSetTitle,
  formatStyles,
}: {
  left: BracketWithPlayers;
  right?: BracketWithPlayers;
  onSetTitle: (bracketId: number, title: string | null) => void;
  formatStyles: FormatStyles;
}) {
  const leftPlayers = toUIPlayers(left);
  const rightPlayers = right ? toUIPlayers(right) : null;

  const groupChipText = `Groups ${left.index}${right ? ` & ${right.index}` : ""}`;

  return (
    <Paper withBorder radius="md" p="md" style={{ position: "relative" }}>
      <Badge variant="light">{groupChipText}</Badge>

      <Grid gutter="sm" mb="sm">
        <Grid.Col span={{ base: 12, md: right ? 6 : 12 }}>
          <BracketTitleEditor
            value={left.title}
            onChange={(t) => onSetTitle(left.id, t)}
            placeholder={`Title for Group ${left.index} (optional)`}
            titleStyle={formatStyles.bracketTitle}
          />
        </Grid.Col>

        {right && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <BracketTitleEditor
              value={right.title}
              onChange={(t) => onSetTitle(right.id, t)}
              placeholder={`Title for Group ${right.index} (optional)`}
              titleStyle={formatStyles.bracketTitle}
            />
          </Grid.Col>
        )}
      </Grid>

      <Group justify="center" align="flex-start" gap="lg" wrap="wrap">
        <Box style={{ maxWidth: "100%", overflowX: "auto" }}>
          <CollapsedLeft.Individuals
            size={left.num_players}
            players={leftPlayers}
            textStyles={{
              playerId: formatStyles.playerId,
              playerText: formatStyles.playerText,
            }}
          />
        </Box>

        {right && rightPlayers && (
          <Box style={{ maxWidth: "100%", overflowX: "auto" }}>
            <CollapsedRight.Individuals
              size={right.num_players}
              players={rightPlayers}
              textStyles={{
                playerId: formatStyles.playerId,
                playerText: formatStyles.playerText,
              }}
            />
          </Box>
        )}
      </Group>
    </Paper>
  );
}

function PosterGroupsSection({
  brackets,
  onSetTitle,
  formatStyles,
}: {
  brackets: BracketWithPlayers[] | null;
  onSetTitle: (bracketId: number, title: string | null) => void;
  formatStyles: FormatStyles;
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

          <Box mb="sm">
            <BracketTitleEditor
              value={b.title}
              onChange={(t) => onSetTitle(b.id, t)}
              placeholder={`Title for Group ${b.index} (optional)`}
              titleStyle={formatStyles.bracketTitle}
            />
          </Box>

          <Box style={{ maxWidth: "100%", overflowX: "auto" }}>
            <Expanded.Individuals
              size={b.num_players}
              players={toUIPlayers(b)}
            />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

const TARGETS: Array<{ label: string; value: StyleTarget }> = [
  { label: "Player ID", value: "playerId" },
  { label: "Player name/club", value: "playerText" },
  { label: "Bracket title", value: "bracketTitle" },
];

function StyleEditor({
  styles,
  onChange,
  target,
  setTarget,
  fontChoices,
}: {
  styles: FormatStyles;
  onChange: (next: FormatStyles) => void;
  target: StyleTarget;
  setTarget: (t: StyleTarget) => void;
  fontChoices: string[];
}) {
  const s = styles[target];

  return (
    <Paper withBorder p="sm" radius="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Title order={6}>Style</Title>
          <SegmentedControl
            value={target}
            onChange={(v) => setTarget(v as StyleTarget)}
            data={TARGETS}
          />
        </Group>

        <Group wrap="wrap" gap="sm" align="end">
          <Select
            label="Font family"
            data={fontChoices}
            value={s.fontFamily}
            onChange={(v) => {
              if (!v) return;
              onChange({
                ...styles,
                [target]: { ...s, fontFamily: v },
              });
            }}
            w={320}
          />

          <NumberInput
            label="Font size (pt)"
            min={6}
            max={72}
            value={s.fontSize}
            onChange={(v) => {
              if (typeof v !== "number") return;
              onChange({
                ...styles,
                [target]: { ...s, fontSize: v },
              });
            }}
            w={140}
          />

          <ColorInput
            label="Font color"
            value={s.color}
            onChange={(v) => {
              onChange({
                ...styles,
                [target]: { ...s, color: v },
              });
            }}
            w={180}
          />
        </Group>
      </Stack>
    </Paper>
  );
}

export default function BracketsEditor() {
  const router = useRouter();
  const { id: tournamentId } = getTournamentIdFromRouter();
  const divisionId = router.query.division_id;

  const ready = router.isReady;

  const { t } = useTranslation();

  const [players, setPlayers] = useState<DivisionPlayer[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("booklet");

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // two style sets (persist per format)
  const [bookletStyles, setBookletStyles] =
    useState<FormatStyles>(DEFAULT_BOOKLET);
  const [posterStyles, setPosterStyles] =
    useState<FormatStyles>(DEFAULT_POSTER);

  const [styleTarget, setStyleTarget] = useState<StyleTarget>("playerId");

  // swap selections
  const [swapA, setSwapA] = useState<string | null>(null);
  const [swapB, setSwapB] = useState<string | null>(null);

  const [brackets, setBrackets] = useState<BracketWithPlayers[] | null>(null);

  useEffect(() => {
    if (!divisionId) return;
    fetchDivisionBracketsWithPlayers(Number(divisionId)).then((res) => {
      // assuming your response wrapper is { data: [...] }
      setBrackets(res.data.data);
    });

    fetchDivisionPlayers(Number(divisionId))
      .then((res) => {
        setPlayers(res.data.players ?? []);
      })
      .catch(console.error);
  }, [divisionId]);

  // Unsaved guard
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onRouteStart = (url: string) => {
      if (!dirty || url === router.asPath) return;
      const ok = confirm(
        t("unsaved_prompt", "You have unsaved changes. Save before leaving?"),
      );
      if (!ok) {
        router.events.emit("routeChangeError");
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
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

  const playerOptions = useMemo(() => {
    return players.map((p) => {
      const code = p.code ?? String(p.id);
      const name = p.name ?? "";
      return {
        value: String(p.id), // stable key for backend updates
        label: `${code} — ${name}`.trim(), // what you want to show
      };
    });
  }, [players]);

  // sort by index just in case
  const sorted = useMemo(
    () => (brackets ?? []).slice().sort((a, b) => a.index - b.index),
    [brackets],
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
      const next = prev.map((b) => (b.id === bracketId ? { ...b, title } : b));
      return next;
    });
    setDirty(true);
  };

  const doSwap = () => {
    if (!brackets || !swapA || !swapB || swapA === swapB) return;

    const aId = Number(swapA);
    const bId = Number(swapB);
    if (!Number.isFinite(aId) || !Number.isFinite(bId)) return;

    // build a fast lookup so we can refresh name/club/code after swap
    const metaById = new Map<
      number,
      { name?: string | null; club?: string | null; code?: string | null }
    >();
    for (const p of players) {
      metaById.set(Number(p.id), {
        name: p.name ?? null,
        club: p.club ?? null,
        code: p.code ?? null,
      });
    }

    setBrackets((prev) => {
      if (!prev) return prev;

      const aLoc = findPlayerLoc(prev, aId);
      const bLoc = findPlayerLoc(prev, bId);
      if (!aLoc || !bLoc) return prev;

      // copy brackets + slots (don’t mutate previous state)
      const next = prev.map((br) => ({
        ...br,
        players: br.players.map((s) => ({ ...s })),
      }));

      const aBracket = next.find((b) => b.id === aLoc.bracketId);
      const bBracket = next.find((b) => b.id === bLoc.bracketId);
      if (!aBracket || !bBracket) return prev;

      const aSlot = aBracket.players[aLoc.slotIndex];
      const bSlot = bBracket.players[bLoc.slotIndex];

      // Swap the *players* assigned to the two positions
      const tmpPlayerId = aSlot.player_id;
      aSlot.player_id = bSlot.player_id;
      bSlot.player_id = tmpPlayerId;

      // Refresh display fields so UI updates immediately (optional, but nice)
      const aMeta = metaById.get(aSlot.player_id);
      aSlot.name = aMeta?.name ?? aSlot.name ?? null;
      aSlot.club = aMeta?.club ?? aSlot.club ?? null;
      aSlot.code = aMeta?.code ?? aSlot.code ?? null;

      const bMeta = metaById.get(bSlot.player_id);
      bSlot.name = bMeta?.name ?? bSlot.name ?? null;
      bSlot.club = bMeta?.club ?? bSlot.club ?? null;
      bSlot.code = bMeta?.code ?? bSlot.code ?? null;

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

  const regenerateAll = async () => {
    // if (!group) return;
    const ok = confirm(
      t(
        "regenerate_confirm",
        "Regenerate all seeding? All current seeding will be lost and replaced.",
      ),
    );
    if (!ok) return;

    setSwapA(null);
    setSwapB(null);
    setDirty(true); // require Save to persist
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

  // active style set & mutators based on route format
  const styles = viewMode === "booklet" ? bookletStyles : posterStyles;
  const setStyles = viewMode === "booklet" ? setBookletStyles : setPosterStyles;

  return (
    <>
      <TournamentLayout tournament_id={tournamentId}>
        <Stack p="md" gap="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Title order={3}>
              {t("edit_seeding", "Edit Seeding / Positions")} —{" "}
              {"Division A - Men's Individuals"}
            </Title>
            <Text c="dimmed" size="sm">
              {24} {t("players", "players")} • {3} {t("brackets", "brackets")}
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
              ? t(
                  "settings_apply_booklet",
                  "These settings apply to Booklet only.",
                )
              : t(
                  "settings_apply_poster",
                  "These settings apply to Poster only.",
                )}
          </Text>

          {/* STICKY: toggle + swap + action buttons */}
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
              {/* Sticky: swap left, actions right */}
              <Group justify="space-between" align="flex-end" wrap="wrap">
                {/* LEFT side: swap controls */}
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

                {/* RIGHT side: actions */}
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

              {/* Hint below swap row */}
              <Text c="dimmed" size="sm">
                {t(
                  "seeding_hint",
                  "Swaps update seeding and apply to both Booklet & Poster.",
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

          {/* Trees preview for the active format */}
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
    </>
  );
}
