import { useMemo, useState } from "react";
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  List,
  Checkbox,
  TextInput,
  NumberInput,
  Select,
  Stack,
  Divider,
  ScrollArea,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import BuildIcon from "@mui/icons-material/Build";
import type { MRT_TableInstance } from "material-react-table";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";

import {
  createDivision,
  addPlayersToDivision,
  addTeamsToDivision,
} from "../../services/division";
import { DivisionType, DivisionPlayer } from "../../interfaces/division";
import { getTournamentIdFromRouter } from "../utils/util";
import { assignBrackets, getBracketSizeOptions, pickBracketSizes } from "../utils/seeding";
import { fetchDivisionPlayers } from "../../services/division";
import { postDivisionBrackets, postDivisionBracketsTeams } from "../../services/bracket";
import { assignTeamBrackets, getTeamBracketSizeOptions } from "../utils/seeding_teams";
import { updatePlayerCodes } from "../../services/player";

type PlayerRow = {
  id: string | number;
  club?: string | null;
  name?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  data?: Record<string, any>; // your dynamic fields live here
  [k: string]: any;
};

type RowWithId = { id: string | number } & Record<string, any>;

interface GenerateBracketsButtonProps<TRow extends RowWithId> {
  table: MRT_TableInstance<TRow>;
}

function makePlayerCodes(prefix: string, n: number): string[] {
  const width = String(n).length; // 1..n digits
  const pfx = prefix.trim();
  return Array.from(
    { length: n },
    (_, i) => `${pfx}${String(i + 1).padStart(width, "0")}`,
  );
}

/** e.g. [16, 16] → "16, 16"; [8, 8, 8, 8, 11, 11] → "8, 8, 8, 8, 11, 11" */
function formatBracketOption(sizes: number[]): string {
  return sizes.join(", ");
}

/** Return multiset as sorted array (for consistent "remaining" order). */
function multisetToSortedArray(counts: Map<number, number>): number[] {
  const out: number[] = [];
  for (const [s, c] of Array.from(counts.entries()).sort(([a], [b]) => a - b)) {
    for (let i = 0; i < c; i++) out.push(s);
  }
  return out;
}

/** Available sizes for group at index i: sizes s where (used so far for s) < (combo count of s). */
function availableSizesForGroup(combination: number[], orderSoFar: number[]): number[] {
  const comboCounts = new Map<number, number>();
  for (const s of combination) comboCounts.set(s, (comboCounts.get(s) ?? 0) + 1);
  for (const s of orderSoFar) comboCounts.set(s, (comboCounts.get(s) ?? 0) - 1);
  return multisetToSortedArray(
    new Map([...comboCounts.entries()].filter(([, c]) => c > 0))
  );
}

/** Build new order after setting group at index to size; fill rest with remaining multiset. */
function orderWithGroupSet(combination: number[], currentOrder: number[], groupIndex: number, size: number): number[] {
  const used = [...currentOrder.slice(0, groupIndex), size];
  const remaining = (() => {
    const counts = new Map<number, number>();
    for (const s of combination) counts.set(s, (counts.get(s) ?? 0) + 1);
    for (const s of used) counts.set(s, (counts.get(s) ?? 0) - 1);
    return multisetToSortedArray(
      new Map([...counts.entries()].filter(([, c]) => c > 0))
    );
  })();
  return [...used, ...remaining];
}

export function GenerateBracketsButton<TRow extends RowWithId>({
  table,
}: GenerateBracketsButtonProps<TRow>) {
  const { id: tournamentId } = getTournamentIdFromRouter();
  const router = useRouter();
  const { t } = useTranslation();

  const [opened, { open, close }] = useDisclosure(false);
  const [active, setActive] = useState(0);

  // selection
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedPlayers = useMemo(
    () => selectedRows.map((r) => r.original as PlayerRow),
    [selectedRows],
  );
  const selectedPlayerIds = useMemo(
    () => selectedPlayers.map((p) => p.id),
    [selectedPlayers],
  );

  // filters snapshot
  const appliedFilters = useMemo(
    () => summarizeFilters(table),
    // depend specifically on changing state slices to avoid extra re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      table.getState().columnFilters,
      table.getState().globalFilter,
      table.getState().sorting,
    ],
  );

  // bias selection state
  const [biasIds, setBiasIds] = useState<Array<string | number>>([]);

  const toggleBias = (id: string | number) => {
    setBiasIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const clearBias = () => setBiasIds([]);

  const biasCount = biasIds.length;
  const biasHint =
    biasCount === 0
      ? t(
          "bias_optional",
          "Optional: select strong players to bias seeding and byes.",
        )
      : t(
          "bias_selected_count",
          `Selected ${biasCount} strong player${
            biasCount === 1 ? "" : "s"
          } for bias.`,
        );

  // Group players by club, sorted alphabetically within each club
  const playersByClub = useMemo(() => {
    const byClub = new Map<string, PlayerRow[]>();
    const noClubLabel = t("no_club", "No club");
    for (const p of selectedPlayers) {
      const club = getPlayerClub(p) || noClubLabel;
      if (!byClub.has(club)) byClub.set(club, []);
      byClub.get(club)!.push(p);
    }
    for (const arr of byClub.values()) {
      arr.sort((a, b) =>
        getPlayerName(a).localeCompare(getPlayerName(b), undefined, { sensitivity: "base" })
      );
    }
    return Array.from(byClub.entries()).sort(([a], [b]) => {
      if (a === noClubLabel) return 1;
      if (b === noClubLabel) return -1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [selectedPlayers, t]);

  // Bracket size options for selected count (recomputed when selectedCount changes)
  const bracketSizeOptions = useMemo(
    () => (selectedCount > 0 ? getBracketSizeOptions(selectedCount) : []),
    [selectedCount]
  );
  const defaultSizes = useMemo(
    () => (selectedCount > 0 ? pickBracketSizes(selectedCount) : []),
    [selectedCount]
  );

  // form
  const form = useForm({
    initialValues: {
      name: "",
      withPrefix: false,
      prefix: "",
      durationMinutes: 5,
      marginMinutes: 1,
      type: "INDIVIDUALS" as DivisionType,
      /** Bracket size combination: "" = use default, or JSON string of number[]. */
      bracketSizesKey: "",
      /** Optional order override: JSON number[] (which size per group). Empty = use combination as-is. */
      bracketSizeOrder: "",
    },
    validate: {
      name: (v) => (v.trim().length < 1 ? "Division name is required" : null),
      prefix: (v, values) =>
        values.withPrefix && v.trim().length < 1
          ? "Prefix cannot be empty when enabled"
          : null,
      durationMinutes: (v) => (v <= 0 ? "Must be > 0" : null),
      marginMinutes: (v) => (v < 0 ? "Cannot be negative" : null),
    },
  });

  const resetWizard = () => {
    setActive(0);
    form.reset();
  };

  const handleSubmit = async (values: typeof form.values) => {
    const createRes = await createDivision({
      tournament_id: tournamentId,
      name: values.name.trim(),
      prefix: values.withPrefix ? values.prefix.trim() : undefined,
      duration_mins: values.durationMinutes,
      margin_mins: values.marginMinutes,
      division_type: values.type === "TEAMS" ? "TEAMS" : "INDIVIDUALS",
    });

    const divisionId: number = createRes?.data?.data?.id ?? createRes?.data?.id;

    if (divisionId && selectedPlayerIds.length) {
      await addPlayersToDivision(divisionId, selectedPlayerIds, biasIds);
    }

    // TO-DO: this should only be called if addPlayersToDivision is successful
    if (divisionId) {
      
      if (values.withPrefix) {
        const codes = makePlayerCodes(values.prefix, selectedPlayerIds.length);
        console.log("Generated player codes", codes);

        console.log("Updating player codes for players", selectedPlayerIds);
        
        await updatePlayerCodes(
          Number(tournamentId),
          selectedPlayerIds.map((id, i) => ({
            player_id: Number(id),
            code: codes[i],
          })),
        );
      }

      const res = await fetchDivisionPlayers(divisionId);
      const apiPlayers = res?.data?.players ?? [];
      console.log("apiPlayers", apiPlayers);
      
      let chosenSizes: number[] | undefined;
      const orderOverride = form.values.bracketSizeOrder?.trim();
      if (orderOverride) {
        try {
          const parsed = JSON.parse(orderOverride) as unknown;
          chosenSizes = Array.isArray(parsed) ? parsed : undefined;
        } catch {
          chosenSizes = undefined;
        }
      }
      if (chosenSizes == null && form.values.bracketSizesKey !== "") {
        try {
          const parsed = JSON.parse(form.values.bracketSizesKey) as unknown;
          chosenSizes = Array.isArray(parsed) ? parsed : undefined;
        } catch {
          chosenSizes = undefined;
        }
      }
      const seeded = assignBrackets(apiPlayers, chosenSizes);
      console.log('Seeding result for division', divisionId, seeded);

      await postDivisionBrackets(divisionId, seeded, true);
    }

    router.push(`/tournaments/${tournamentId}/divisions`);

    close();
    resetWizard();
  };

  return (
    <>
      <Button
        leftSection={<BuildIcon />}
        disabled={selectedCount === 0}
        onClick={open}
        style={{ textTransform: "none" }}
      >
        {t("generate_brackets", "Generate Brackets with Selected Players")}
      </Button>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          resetWizard();
        }}
        title={t("generate_modal_title", "Generate Brackets")}
        size="lg"
        centered
        overlayProps={{ blur: 2 }}
      >
        <Stepper
          active={active}
          onStepClick={setActive}
          allowNextStepsSelect={false}
        >
          {/* Step 1: Confirm */}
          <Stepper.Step label={t("confirm", "Confirm")}>
            <Stack gap="md">
              <Text>
                {t(
                  "confirm_text",
                  `Generate brackets for ${selectedCount} player${
                    selectedCount === 1 ? "" : "s"
                  } that match the following criteria:`,
                )}
              </Text>

              {appliedFilters.length > 0 ? (
                <List spacing="xs">
                  {appliedFilters.map((f, i) => (
                    <List.Item key={i}>{f}</List.Item>
                  ))}
                </List>
              ) : (
                <Text c="dimmed">{t("no_filters", "No filters applied")}</Text>
              )}

              <Divider />

              <Group justify="space-between">
                <Button
                  variant="default"
                  onClick={() => {
                    close();
                    resetWizard();
                  }}
                >
                  {t("cancel", "Cancel")}
                </Button>
                <Button onClick={() => setActive(1)}>
                  {t("next", "Next")}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 2: Player Bias (optional) */}
          <Stepper.Step label={t("player_bias", "Strong Player Bias")}>
            <Stack gap="sm">
              <Alert variant="light">
                <Text size="sm">
                  {t(
                    "player_bias_note",
                    "Optionally select strong players to give a bias to. They will be placed as far apart as possible and given bye spots when possible.",
                  )}
                </Text>
                {biasCount > 0 && (
                  <Text size="xs" mt={4} c="dimmed">
                    {biasHint}
                  </Text>
                )}
              </Alert>

              <ScrollArea h={260} offsetScrollbars>
                <Stack gap="md">
                  {playersByClub.map(([clubName, players]) => (
                    <Stack key={clubName} gap="xs">
                      <Text fw={600} size="sm" c="dimmed">
                        {clubName}
                      </Text>
                      {players.map((p) => {
                        const id = p.id;
                        const label = getPlayerName(p);
                        const checked = biasIds.includes(id);
                        return (
                          <Checkbox
                            key={String(id)}
                            checked={checked}
                            onChange={() => toggleBias(id)}
                            label={label}
                          />
                        );
                      })}
                    </Stack>
                  ))}
                </Stack>
              </ScrollArea>

              <Group justify="space-between" mt="sm">
                <Button variant="subtle" onClick={clearBias}>
                  {t("clear_selection", "Clear selection")}
                </Button>
                <Group>
                  <Button variant="default" onClick={() => setActive(0)}>
                    {t("back", "Back")}
                  </Button>
                  <Button onClick={() => setActive(2)}>
                    {t("next", "Next")}
                  </Button>
                  <Button variant="light" onClick={() => setActive(2)}>
                    {t("skip", "Skip")}
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 2: Bracket size combination */}
          <Stepper.Step label={t("bracket_layout", "Bracket Layout")}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {t(
                  "bracket_layout_description",
                  "Choose how to split {{count}} players into brackets. Sizes are kept roughly equal.",
                  { count: selectedCount }
                )}
              </Text>
              <Select
                label={t("bracket_sizes", "Bracket size combination")}
                data={[
                  {
                    value: "",
                    label: t("bracket_sizes_default", "Default (recommended)"),
                  },
                  ...bracketSizeOptions.map((sizes) => ({
                    value: JSON.stringify(sizes),
                    label: formatBracketOption(sizes),
                  })),
                ]}
                {...form.getInputProps("bracketSizesKey")}
                onChange={(value) => {
                  form.setFieldValue("bracketSizesKey", value ?? "");
                  form.setFieldValue("bracketSizeOrder", "");
                }}
              />
              {(() => {
                const key = form.values.bracketSizesKey;
                if (!key) return null;
                let combination: number[];
                try {
                  const parsed = JSON.parse(key) as unknown;
                  combination = Array.isArray(parsed) ? parsed : [];
                } catch {
                  return null;
                }
                if (combination.length === 0) return null;
                const orderJson = form.values.bracketSizeOrder;
                let currentOrder: number[] = combination;
                if (orderJson) {
                  try {
                    const o = JSON.parse(orderJson) as unknown;
                    currentOrder = Array.isArray(o) && o.length === combination.length ? o : combination;
                  } catch {
                    /* use combination */
                  }
                }
                const optionsFor = (i: number) =>
                  availableSizesForGroup(combination, currentOrder.slice(0, i));
                return (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      {t("bracket_group_sizes_optional", "Optional: assign size to each bracket group")}
                    </Text>
                    {currentOrder.map((size, i) => (
                      <Group key={i} gap="sm">
                        <Text size="sm" w={80}>
                          {t("bracket_group_label", "Group {{n}}", { n: i + 1 })}
                        </Text>
                        <Select
                          size="xs"
                          style={{ width: 80 }}
                          data={[...new Set(optionsFor(i))].map((s) => ({ value: String(s), label: String(s) }))}
                          value={String(size)}
                          onChange={(v) => {
                            const s = v ? parseInt(v, 10) : size;
                            if (Number.isNaN(s)) return;
                            const newOrder = orderWithGroupSet(combination, currentOrder, i, s);
                            form.setFieldValue("bracketSizeOrder", JSON.stringify(newOrder));
                          }}
                        />
                      </Group>
                    ))}
                  </Stack>
                );
              })()}
              <Group justify="space-between" mt="sm">
                <Button variant="default" onClick={() => setActive(1)}>
                  {t("back", "Back")}
                </Button>
                <Button onClick={() => setActive(3)}>
                  {t("next", "Next")}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 3: Division form */}
          <Stepper.Step label={t("division", "Division Details")}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label={t("division_name", "Division name")}
                  placeholder="Division A"
                  withAsterisk
                  {...form.getInputProps("name")}
                />

                <TextInput
                  label={t("prefix", "Prefix")}
                  placeholder="A"
                  {...form.getInputProps("prefix")}
                />
                <Checkbox
                  label={t("use_prefix", "Create prefix to generate player ID")}
                  description={t(
                    "prefix_note",
                    "Prefix will be used to generate player code/ID (ex. A01, A02, ...)",
                  )}
                  {...form.getInputProps("withPrefix", { type: "checkbox" })}
                />

                <Group grow>
                  <NumberInput
                    label={t("duration_minutes", "Duration (minutes)")}
                    min={1}
                    step={1}
                    {...form.getInputProps("durationMinutes")}
                  />
                  <NumberInput
                    label={t("margin_minutes", "Margin (minutes)")}
                    min={0}
                    step={1}
                    {...form.getInputProps("marginMinutes")}
                  />
                </Group>

                <Group justify="space-between" mt="sm">
                  <Button variant="default" onClick={() => setActive(2)}>
                    {t("back", "Back")}
                  </Button>
                  <Button type="submit">{t("generate", "Generate")}</Button>
                </Group>
              </Stack>
            </form>
          </Stepper.Step>

          <Stepper.Completed>
            <Text>{t("done", "All done!")}</Text>
          </Stepper.Completed>
        </Stepper>
      </Modal>
    </>
  );
}

/** Teams table: Generate Brackets with Selected Teams — 2 steps only (Confirm, Division Details), no Prefix. */
export function GenerateBracketsButtonTeams<TRow extends RowWithId>({
  table,
}: {
  table: MRT_TableInstance<TRow>;
}) {
  const { id: tournamentId } = getTournamentIdFromRouter();
  const router = useRouter();
  const { t } = useTranslation();

  const [opened, { open, close }] = useDisclosure(false);
  const [active, setActive] = useState(0);
  const [biasTeamIds, setBiasTeamIds] = useState<number[]>([]);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedTeamIds = useMemo(
    () => selectedRows.map((r) => Number((r.original as RowWithId).id)),
    [selectedRows],
  );
  const selectedTeamNames = useMemo(
    () =>
      selectedRows.map(
        (r) => String((r.original as RowWithId & { name?: string }).name ?? "")
      ),
    [selectedRows],
  );

  const appliedFilters = useMemo(
    () => summarizeFilters(table),
    [
      table.getState().columnFilters,
      table.getState().globalFilter,
      table.getState().sorting,
    ],
  );

  const bracketSizeOptions = useMemo(
    () => (selectedCount > 0 ? getTeamBracketSizeOptions(selectedCount) : []),
    [selectedCount],
  );

  const form = useForm({
    initialValues: {
      name: "",
      durationMinutes: 5,
      marginMinutes: 1,
      bracketSizesKey: "",
      bracketSizeOrder: "",
    },
    validate: {
      name: (v) => (v.trim().length < 1 ? "Division name is required" : null),
      durationMinutes: (v) => (v <= 0 ? "Must be > 0" : null),
      marginMinutes: (v) => (v < 0 ? "Cannot be negative" : null),
    },
  });

  const resetWizard = () => {
    setActive(0);
    setBiasTeamIds([]);
    form.reset();
  };

  const toggleBias = (teamId: number) => {
    setBiasTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = async (values: typeof form.values) => {
    const createRes = await createDivision({
      tournament_id: Number(tournamentId),
      name: values.name.trim(),
      prefix: undefined,
      duration_mins: values.durationMinutes,
      margin_mins: values.marginMinutes,
      division_type: "TEAMS",
    });

    const divisionId: number = createRes?.data?.data?.id ?? createRes?.data?.id;
    if (!divisionId || selectedTeamIds.length === 0) {
      router.push(`/tournaments/${tournamentId}/divisions`);
      close();
      resetWizard();
      return;
    }

    await addTeamsToDivision(divisionId, selectedTeamIds, biasTeamIds);

    let chosenSizes: number[] | undefined;
    const orderOverride = form.values.bracketSizeOrder?.trim();
    if (orderOverride) {
      try {
        const parsed = JSON.parse(orderOverride) as unknown;
        chosenSizes = Array.isArray(parsed) ? parsed : undefined;
      } catch {
        chosenSizes = undefined;
      }
    }
    if (chosenSizes == null && form.values.bracketSizesKey !== "") {
      try {
        const parsed = JSON.parse(form.values.bracketSizesKey) as unknown;
        chosenSizes = Array.isArray(parsed) ? parsed : undefined;
      } catch {
        chosenSizes = undefined;
      }
    }
    const seeded = assignTeamBrackets(selectedTeamNames, {
      teamIds: selectedTeamIds,
      biasTeamIds: biasTeamIds.length ? biasTeamIds : undefined,
      sizes: chosenSizes,
    });
    await postDivisionBracketsTeams(divisionId, seeded, true);

    router.push(`/tournaments/${tournamentId}/divisions`);
    close();
    resetWizard();
  };

  return (
    <>
      <Button
        leftSection={<BuildIcon />}
        disabled={selectedCount === 0}
        onClick={open}
        style={{ textTransform: "none" }}
      >
        {t("generate_brackets_teams", "Generate Brackets with Selected Teams")}
      </Button>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          resetWizard();
        }}
        title={t("generate_modal_title", "Generate Brackets")}
        size="lg"
        centered
        overlayProps={{ blur: 2 }}
      >
        <Stepper
          active={active}
          onStepClick={setActive}
          allowNextStepsSelect={false}
        >
          <Stepper.Step label={t("confirm", "Confirm")}>
            <Stack gap="md">
              <Text>
                {t(
                  "confirm_text_teams",
                  `Generate brackets for ${selectedCount} team${
                    selectedCount === 1 ? "" : "s"
                  } that match the following criteria:`,
                )}
              </Text>
              {appliedFilters.length > 0 ? (
                <List spacing="xs">
                  {appliedFilters.map((f, i) => (
                    <List.Item key={i}>{f}</List.Item>
                  ))}
                </List>
              ) : (
                <Text c="dimmed">{t("no_filters", "No filters applied")}</Text>
              )}
              <Divider />
              <Group justify="space-between">
                <Button variant="default" onClick={() => { close(); resetWizard(); }}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button onClick={() => setActive(1)}>{t("next", "Next")}</Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label={t("strong_teams", "Strong teams")}>
            <Stack gap="md">
              <Text c="dimmed" size="sm">
                {t(
                  "strong_teams_hint",
                  "Optionally mark stronger teams so they are spread across brackets and get bye priority."
                )}
              </Text>
              <ScrollArea.Autosize mah={220}>
                <Stack gap="xs">
                  {selectedRows.map((row) => {
                    const teamId = Number((row.original as RowWithId).id);
                    const name =
                      (row.original as RowWithId & { name?: string }).name ?? "";
                    return (
                      <Checkbox
                        key={teamId}
                        label={name || `Team ${teamId}`}
                        checked={biasTeamIds.includes(teamId)}
                        onChange={() => toggleBias(teamId)}
                      />
                    );
                  })}
                </Stack>
              </ScrollArea.Autosize>
              <Group justify="space-between">
                <Button variant="default" onClick={() => setActive(0)}>
                  {t("back", "Back")}
                </Button>
                <Button onClick={() => setActive(2)}>{t("next", "Next")}</Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label={t("bracket_layout", "Bracket Layout")}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {t(
                  "bracket_layout_description_teams",
                  "Choose how to split {{count}} teams into brackets. Sizes are kept roughly equal.",
                  { count: selectedCount }
                )}
              </Text>
              <Select
                label={t("bracket_sizes", "Bracket size combination")}
                data={[
                  {
                    value: "",
                    label: t("bracket_sizes_default", "Default (recommended)"),
                  },
                  ...bracketSizeOptions.map((sizes) => ({
                    value: JSON.stringify(sizes),
                    label: formatBracketOption(sizes),
                  })),
                ]}
                value={form.values.bracketSizesKey}
                onChange={(value) => {
                  form.setFieldValue("bracketSizesKey", value ?? "");
                  form.setFieldValue("bracketSizeOrder", "");
                }}
              />
              {(() => {
                const key = form.values.bracketSizesKey;
                if (!key) return null;
                let combination: number[];
                try {
                  const parsed = JSON.parse(key) as unknown;
                  combination = Array.isArray(parsed) ? parsed : [];
                } catch {
                  return null;
                }
                if (combination.length === 0) return null;
                const orderJson = form.values.bracketSizeOrder;
                let currentOrder: number[] = combination;
                if (orderJson) {
                  try {
                    const o = JSON.parse(orderJson) as unknown;
                    currentOrder = Array.isArray(o) && o.length === combination.length ? o : combination;
                  } catch {
                    /* use combination */
                  }
                }
                const optionsFor = (i: number) =>
                  availableSizesForGroup(combination, currentOrder.slice(0, i));
                return (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      {t("bracket_group_sizes_optional", "Optional: assign size to each bracket group")}
                    </Text>
                    {currentOrder.map((size, i) => (
                      <Group key={i} gap="sm">
                        <Text size="sm" w={80}>
                          {t("bracket_group_label", "Group {{n}}", { n: i + 1 })}
                        </Text>
                        <Select
                          size="xs"
                          style={{ width: 80 }}
                          data={[...new Set(optionsFor(i))].map((s) => ({ value: String(s), label: String(s) }))}
                          value={String(size)}
                          onChange={(v) => {
                            const s = v ? parseInt(v, 10) : size;
                            if (Number.isNaN(s)) return;
                            const newOrder = orderWithGroupSet(combination, currentOrder, i, s);
                            form.setFieldValue("bracketSizeOrder", JSON.stringify(newOrder));
                          }}
                        />
                      </Group>
                    ))}
                  </Stack>
                );
              })()}
              <Group justify="space-between" mt="sm">
                <Button variant="default" onClick={() => setActive(1)}>
                  {t("back", "Back")}
                </Button>
                <Button onClick={() => setActive(3)}>
                  {t("next", "Next")}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label={t("division", "Division Details")}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label={t("division_name", "Division name")}
                  placeholder="Division A"
                  withAsterisk
                  {...form.getInputProps("name")}
                />
                <Group grow>
                  <NumberInput
                    label={t("duration_minutes", "Duration (minutes)")}
                    min={1}
                    step={1}
                    {...form.getInputProps("durationMinutes")}
                  />
                  <NumberInput
                    label={t("margin_minutes", "Margin (minutes)")}
                    min={0}
                    step={1}
                    {...form.getInputProps("marginMinutes")}
                  />
                </Group>
                <Group justify="space-between" mt="sm">
                  <Button variant="default" onClick={() => setActive(2)}>
                    {t("back", "Back")}
                  </Button>
                  <Button type="submit">{t("generate", "Generate")}</Button>
                </Group>
              </Stack>
            </form>
          </Stepper.Step>
        </Stepper>
      </Modal>
    </>
  );
}

/** Build a readable list of filters from MRT/TanStack Table state */
function summarizeFilters<TRow extends RowWithId>(
  table: MRT_TableInstance<TRow>,
): string[] {
  const state = table.getState() as any;
  const filters: string[] = [];

  // Column filters
  for (const f of state.columnFilters ?? []) {
    if (!f) continue;
    const col = table.getColumn(f.id);
    // Try to derive a label (string header or fallback to id)
    const rawHeader = col?.columnDef?.header as unknown;
    const label = typeof rawHeader === "string" ? rawHeader : (col?.id ?? f.id);
    const val = valueToLabel(f.value);
    if (val !== "") filters.push(`${label}: ${val}`);
  }

  // Global filter
  if (state.globalFilter) {
    filters.push(`Search: ${valueToLabel(state.globalFilter)}`);
  }

  // Sorting snapshot (optional)
  if (state.sorting && state.sorting.length > 0) {
    const parts = state.sorting.map((s: any) => {
      const col = table.getColumn(s.id);
      const rawHeader = col?.columnDef?.header as unknown;
      const label =
        typeof rawHeader === "string" ? rawHeader : (col?.id ?? s.id);
      return `${label} ${s.desc ? "↓" : "↑"}`;
    });
    filters.push(`Sort: ${parts.join(", ")}`);
  }

  return filters;
}

function valueToLabel(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(valueToLabel).join(", ");
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "[object]";
    }
  }
  return String(v);
}

function getPlayerName(p: PlayerRow): string {
  // Try common fields; fall back to dynamic data; finally use id
  const fromDynamic = p.data?.name ?? p.data?.full_name ?? p.data?.player_name;
  const composed =
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.name ||
    p.display_name ||
    fromDynamic ||
    "";
  return composed || String(p.id);
}

function getPlayerClub(p: PlayerRow): string | null {
  return (p.club ?? p.data?.club ?? null) || null;
}
