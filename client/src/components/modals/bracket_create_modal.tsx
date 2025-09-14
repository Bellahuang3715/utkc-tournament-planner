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
  SegmentedControl,
  Stack,
  Divider,
  ScrollArea,
  Alert,
  Badge,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import BuildIcon from "@mui/icons-material/Build";
import type { MRT_TableInstance } from "material-react-table";
import { useRouter } from "next/router";
import { useTranslation } from 'next-i18next';

import { createDivision, addPlayersToDivision } from "../../services/division";
import { DivisionType } from "../../interfaces/division";
import { getTournamentIdFromRouter } from "../utils/util";
import { assignBrackets, type SeedingPlayer } from "../utils/seeding";
import { fetchDivisionPlayers } from "../../services/division";

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

const toSeedingPlayers = (
  api: Array<{ name: string; club: string; code: string | null; bias: boolean }>,
  divisionId: number
): SeedingPlayer[] =>
  api.map((p, idx) => ({
    id: p.code ?? `div${divisionId}-row${idx}`, // fallback if code is null
    name: p.name,
    club: p.club,
    bias: !!p.bias,
  }));

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
    [selectedRows]
  );
  const selectedPlayerIds = useMemo(
    () => selectedPlayers.map((p) => p.id),
    [selectedPlayers]
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
    ]
  );

  // bias selection state
  const [biasIds, setBiasIds] = useState<Array<string | number>>([]);

  const toggleBias = (id: string | number) => {
    setBiasIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev; // cap at 6
      return [...prev, id];
    });
  };

  const clearBias = () => setBiasIds([]);

  const biasCount = biasIds.length;
  const biasHint =
    biasCount === 0
      ? t("bias_optional", "Optional: pick 4–6 strong players")
      : t("bias_selected_count", `Selected ${biasCount} (recommended 4–6)`);

  // form
  const form = useForm({
    initialValues: {
      name: "",
      withPrefix: false,
      prefix: "",
      durationMinutes: 5,
      marginMinutes: 1,
      type: "INDIVIDUALS" as DivisionType,
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
      const res = await fetchDivisionPlayers(divisionId);
      const apiPlayers = res?.data?.players ?? [];
      console.log("apiPlayers", apiPlayers);
      
      const input: SeedingPlayer[] = toSeedingPlayers(apiPlayers, divisionId);
      const brackets = assignBrackets(input);

      // For now, just print; later, call an API to persist brackets/slots
      // (e.g., POST /divisions/:id/brackets with the structure you need)
      console.log('Seeding result for division', divisionId, brackets);
    }

    router.push(`/tournaments/${tournamentId}/brackets`);

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
          <Stepper.Step
            label={t("confirm", "Confirm")}
          >
            <Stack gap="md">
              <Text>
                {t(
                  "confirm_text",
                  `Generate brackets for ${selectedCount} player${
                    selectedCount === 1 ? "" : "s"
                  } that match the following criteria:`
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
          <Stepper.Step
            label={t("player_bias", "Strong Player Bias")}
          >
            <Stack gap="sm">
              <Alert variant="light">
                <Stack gap={4}>
                  <Text>
                    {t(
                      "player_bias_note",
                      "Pick 4–6 strong players to give a bias to. These players will be placed as far away from each other as possible, and will be given a bye spot if possible."
                    )}
                  </Text>
                  <Group gap="xs" align="center">
                    <Badge variant={biasCount ? "filled" : "light"}>
                      {biasHint}
                    </Badge>
                    {biasCount > 6 && (
                      <Text c="red" size="sm">
                        {t("bias_max_six", "Maximum 6 players.")}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Alert>

              <ScrollArea h={260} offsetScrollbars>
                <Stack gap="xs">
                  {selectedPlayers.map((p) => {
                    const id = p.id;
                    const label = getPlayerName(p);
                    const club = getPlayerClub(p);
                    const checked = biasIds.includes(id);
                    const disabled = !checked && biasIds.length >= 6; // hard cap

                    return (
                      <Checkbox
                        key={String(id)}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleBias(id)}
                        label={
                          <Group gap={8}>
                            <Text>{label}</Text>
                            {club && (
                              <Text c="dimmed" size="sm">
                                • {club}
                              </Text>
                            )}
                          </Group>
                        }
                      />
                    );
                  })}
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

          {/* Step 2: Division form */}
          <Stepper.Step
            label={t("division", "Division Details")}
          >
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
                    "Prefix will be used to generate player code/ID (ex. A01, A02, ...)"
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

                <SegmentedControl
                  fullWidth
                  data={[
                    {
                      label: t("individuals", "Individuals"),
                      value: "INDIVIDUALS",
                    },
                    { label: t("teams", "Teams"), value: "TEAMS" },
                  ]}
                  {...form.getInputProps("type")}
                />

                <Group justify="space-between" mt="sm">
                  <Button variant="default" onClick={() => setActive(0)}>
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

/** Build a readable list of filters from MRT/TanStack Table state */
function summarizeFilters<TRow extends RowWithId>(
  table: MRT_TableInstance<TRow>
): string[] {
  const state = table.getState() as any;
  const filters: string[] = [];

  // Column filters
  for (const f of state.columnFilters ?? []) {
    if (!f) continue;
    const col = table.getColumn(f.id);
    // Try to derive a label (string header or fallback to id)
    const rawHeader = col?.columnDef?.header as unknown;
    const label = typeof rawHeader === "string" ? rawHeader : col?.id ?? f.id;
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
      const label = typeof rawHeader === "string" ? rawHeader : col?.id ?? s.id;
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
