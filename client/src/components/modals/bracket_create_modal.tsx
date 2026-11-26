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
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import BuildIcon from "@mui/icons-material/Build";
import { IconInfoCircle } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next/pages";

import {
  createDivision,
  addPlayersToDivision,
  addTeamsToDivision,
} from "../../services/division";
import {
  DivisionType,
  DivisionPlayer,
  type Division,
  type IndividualsPlayerMembership,
} from "../../interfaces/division";
import { getTournamentIdFromRouter } from "../utils/util";
import {
  assignBrackets,
  getBracketSizeOptions,
  pickBracketSizes,
  MIN_BRACKET_SIZE,
} from "../utils/seeding";
import { fetchDivisionPlayers } from "../../services/division";
import { postDivisionBrackets, postDivisionBracketsTeams } from "../../services/bracket";
import {
  assignTeamBrackets,
  getTeamBracketSizeOptions,
  MIN_TEAM_BRACKET_SIZE,
} from "../utils/seeding_teams";
import { updatePlayerCodes } from "../../services/player";
import {
  getDivisions,
  getIndividualsMemberships,
  getErrorDetail,
  requestSucceeded,
} from "../../services/adapter";
import { WarningAlert } from "../utils/warning_alert";
import ModalFooter from "./modal_footer";

const DUPLICATE_DIVISION_NAME_MSG =
  "A division with this name already exists in this tournament. Division names must be unique.";
const DUPLICATE_DIVISION_PREFIX_MSG =
  "A division with this prefix already exists in this tournament. Prefixes must be unique.";

function findIndividualsMembershipConflicts(
  memberships: IndividualsPlayerMembership[],
  playerIds: number[],
  targetHasPrefix: boolean,
): IndividualsPlayerMembership[] {
  const selected = new Set(playerIds);
  return memberships.filter((m) => {
    if (!selected.has(m.player_id)) return false;
    const otherHasPrefix = Boolean((m.prefix ?? "").trim());
    return targetHasPrefix || otherHasPrefix;
  });
}

function membershipConflictDetail(
  conflicts: IndividualsPlayerMembership[],
): string {
  const seen = new Set<number>();
  const parts: string[] = [];
  for (const m of conflicts) {
    if (seen.has(m.player_id)) continue;
    seen.add(m.player_id);
    parts.push(`${m.player_name} (${m.division_name})`);
  }
  return (
    "These players are already in another individuals division and cannot be " +
    `added here when player codes / prefixes are involved: ${parts.join(", ")}.`
  );
}

function findDivisionIdentityConflict(
  divisions: Division[],
  name: string,
  prefix: string | undefined,
): string | null {
  const cleanedName = name.trim();
  const cleanedPrefix = prefix?.trim() || "";
  if (
    divisions.some(
      (d) => d.name.trim().toLowerCase() === cleanedName.toLowerCase(),
    )
  ) {
    return DUPLICATE_DIVISION_NAME_MSG;
  }
  if (
    cleanedPrefix &&
    divisions.some(
      (d) =>
        (d.prefix ?? "").trim().toLowerCase() === cleanedPrefix.toLowerCase(),
    )
  ) {
    return DUPLICATE_DIVISION_PREFIX_MSG;
  }
  return null;
}

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

/** Minimal table surface used by Generate Brackets (MRT / TanStack). */
type BracketTableInstance<TRow extends RowWithId> = {
  getSelectedRowModel: () => { rows: Array<{ original: TRow }> };
  getState: () => {
    columnFilters?: Array<{ id: string; value: unknown }>;
    globalFilter?: unknown;
    sorting?: Array<{ id: string; desc: boolean }>;
  };
  getColumn: (id: string) => {
    id?: string;
    columnDef?: { header?: unknown };
  } | undefined;
};

interface GenerateBracketsButtonProps<TRow extends RowWithId> {
  table: BracketTableInstance<TRow>;
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
  const swrDivisions = getDivisions(
    tournamentId != null ? Number(tournamentId) : null,
  );
  const swrMemberships = getIndividualsMemberships(
    tournamentId != null ? Number(tournamentId) : null,
  );
  const existingDivisions: Division[] = swrDivisions.data?.data ?? [];
  const individualsMemberships: IndividualsPlayerMembership[] =
    swrMemberships.data?.data ?? [];

  const [opened, { open, close }] = useDisclosure(false);
  const [active, setActive] = useState(0);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  // selection — only count while closed; materialize rows when the wizard opens
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedPlayers = useMemo(
    () =>
      opened ? selectedRows.map((r) => r.original as PlayerRow) : [],
    [opened, selectedRows],
  );
  const selectedPlayerIds = useMemo(
    () => selectedPlayers.map((p) => p.id),
    [selectedPlayers],
  );

  // filters snapshot (only needed inside the open wizard)
  const appliedFilters = useMemo(
    () => (opened ? summarizeFilters(table) : []),
    // depend specifically on changing state slices to avoid extra re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      opened,
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
    if (!opened) return [];
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
  }, [opened, selectedPlayers, t]);

  // Bracket size options — only when the wizard is open (was freezing select-all)
  const bracketSizeOptions = useMemo(
    () =>
      opened && selectedCount >= MIN_BRACKET_SIZE
        ? getBracketSizeOptions(selectedCount)
        : [],
    [opened, selectedCount]
  );
  const defaultSizes = useMemo(
    () =>
      opened && selectedCount >= MIN_BRACKET_SIZE
        ? pickBracketSizes(selectedCount)
        : [],
    [opened, selectedCount]
  );

  // form
  const form = useForm({
    initialValues: {
      name: "",
      prefix: "",
      durationMinutes: 3,
      marginMinutes: 1,
      type: "INDIVIDUALS" as DivisionType,
      /** Bracket size combination: "" = use default, or JSON string of number[]. */
      bracketSizesKey: "",
      /** Optional order override: JSON number[] (which size per group). Empty = use combination as-is. */
      bracketSizeOrder: "",
    },
    validate: {
      name: (v) => (v.trim().length < 1 ? "Division name is required" : null),
      prefix: (v) => {
        const trimmed = v.trim();
        if (!trimmed) return null;
        if (trimmed.length > 1) return "Prefix must be a single character";
        if (!/^[A-Za-z]$/.test(trimmed)) return "Prefix must be a letter (A–Z)";
        return null;
      },
      durationMinutes: (v) => (v <= 0 ? "Must be > 0" : null),
      marginMinutes: (v) => (v < 0 ? "Cannot be negative" : null),
    },
  });

  const resetWizard = () => {
    setActive(0);
    setFormWarning(null);
    form.reset();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (selectedPlayerIds.length < MIN_BRACKET_SIZE) {
      setFormWarning(
        t(
          "too_few_players_message",
          "A division needs at least {{min}} players to generate brackets.",
          { min: MIN_BRACKET_SIZE },
        ),
      );
      return;
    }

    const prefix = values.prefix.trim().replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
    const name = values.name.trim();
    const conflict = findDivisionIdentityConflict(
      existingDivisions,
      name,
      prefix || undefined,
    );
    if (conflict) {
      setFormWarning(t(
        conflict.includes("prefix")
          ? "duplicate_division_prefix"
          : "duplicate_division_name",
        conflict,
      ));
      return;
    }

    const membershipConflicts = findIndividualsMembershipConflicts(
      individualsMemberships,
      selectedPlayerIds.map(Number),
      Boolean(prefix),
    );
    if (membershipConflicts.length) {
      setFormWarning(membershipConflictDetail(membershipConflicts));
      return;
    }

    setFormWarning(null);

    const createRes = await createDivision({
      tournament_id: tournamentId,
      name,
      prefix: prefix || undefined,
      duration_mins: values.durationMinutes,
      margin_mins: values.marginMinutes,
      division_type: values.type === "TEAMS" ? "TEAMS" : "INDIVIDUALS",
    });

    if (!createRes || !requestSucceeded(createRes)) {
      setFormWarning(
        getErrorDetail(createRes) ??
          t("create_division_failed", "Failed to create division."),
      );
      return;
    }

    const divisionId: number = createRes?.data?.data?.id ?? createRes?.data?.id;
    if (!divisionId) {
      return;
    }

    if (selectedPlayerIds.length) {
      const attachRes = await addPlayersToDivision(
        divisionId,
        selectedPlayerIds,
        biasIds,
      );
      if (attachRes?.response?.status === 409 || attachRes?.isAxiosError) {
        setFormWarning(
          getErrorDetail(attachRes) ??
            membershipConflictDetail(membershipConflicts),
        );
        return;
      }
    }

    // Auto-generate player codes whenever a prefix is provided.
    if (prefix) {
      const codes = makePlayerCodes(prefix, selectedPlayerIds.length);
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
    await postDivisionBrackets(divisionId, seeded, true);

    router.push(`/tournaments/${tournamentId}/divisions`);
    close();
    resetWizard();
  };

  const tooFewPlayers = selectedCount < MIN_BRACKET_SIZE;
  const generatePlayersLabel = t(
    "generate_brackets",
    "Generate Brackets with Selected Players",
  );

  return (
    <>
      <Tooltip
        label={t(
          "min_players_for_division",
          "Select at least {{min}} players to create a division.",
          { min: MIN_BRACKET_SIZE },
        )}
        disabled={!tooFewPlayers}
        withArrow
      >
        <span>
          <Button
            leftSection={<BuildIcon />}
            disabled={tooFewPlayers}
            onClick={open}
            style={{ textTransform: "none" }}
          >
            {generatePlayersLabel}
          </Button>
        </span>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          resetWizard();
        }}
        title={t("generate_modal_title", "Generate Brackets")}
        size="lg"
        centered
        closeOnClickOutside={false}
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

              <ModalFooter
                onCancel={() => {
                  close();
                  resetWizard();
                }}
                primaryLabel={t("next", "Next")}
                onPrimary={() => setActive(1)}
              />
            </Stack>
          </Stepper.Step>

          {/* Step 2: Player Bias (optional) */}
          <Stepper.Step label={t("player_bias", "Strong Player Bias")}>
            <Stack gap="sm">
              <Alert
                variant="light"
                color="blue"
                icon={<IconInfoCircle size={16} />}
              >
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

              <ModalFooter
                onCancel={() => {
                  close();
                  resetWizard();
                }}
                primaryLabel={t("next", "Next")}
                onPrimary={() => setActive(2)}
                leftSection={
                  <>
                    <Button variant="default" onClick={() => setActive(0)}>
                      {t("back", "Back")}
                    </Button>
                    <Button variant="subtle" onClick={clearBias}>
                      {t("clear_selection", "Clear selection")}
                    </Button>
                    <Button variant="light" onClick={() => setActive(2)}>
                      {t("skip", "Skip")}
                    </Button>
                  </>
                }
              />
            </Stack>
          </Stepper.Step>

          {/* Step 3: Division form (includes bracket layout) */}
          <Stepper.Step label={t("division", "Division Details")}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label={t("division_name", "Division name")}
                  placeholder="Division A"
                  withAsterisk
                  {...form.getInputProps("name")}
                  onChange={(e) => {
                    form.setFieldValue("name", e.currentTarget.value);
                    setFormWarning(null);
                  }}
                />

                <TextInput
                  label={t("prefix", "Prefix")}
                  placeholder="A"
                  maxLength={1}
                  description={t(
                    "prefix_optional_hint",
                    "Optional. One letter only (A–Z). Leave blank if you do not need player codes.",
                  )}
                  {...form.getInputProps("prefix")}
                  onChange={(e) => {
                    const next = e.currentTarget.value
                      .replace(/[^A-Za-z]/g, "")
                      .slice(0, 1)
                      .toUpperCase();
                    form.setFieldValue("prefix", next);
                    setFormWarning(null);
                  }}
                />
                <Alert
                  variant="light"
                  color="blue"
                  icon={<IconInfoCircle size={16} />}
                >
                  {t(
                    "prefix_note",
                    "Prefix will be used to generate player code/ID (ex. A01, A02, ...). Specify a single letter (A–Z) if you want player codes.",
                  )}
                </Alert>

                {formWarning ? <WarningAlert>{formWarning}</WarningAlert> : null}

                <Divider label={t("bracket_layout", "Bracket Layout")} labelPosition="left" />

                <Alert
                  variant="light"
                  color="blue"
                  icon={<IconInfoCircle size={16} />}
                >
                  {t(
                    "bracket_layout_description",
                    "Choose how to split {{count}} players into brackets. Sizes are kept roughly equal.",
                    { count: selectedCount },
                  )}
                </Alert>
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

                <Divider label={t("time_limit", "Time Limit")} labelPosition="left" />

                <Alert
                  variant="light"
                  color="blue"
                  icon={<IconInfoCircle size={16} />}
                >
                  {t(
                    "duration_margin_schedule_note",
                    "These will be used to create the court schedule.",
                    { count: selectedCount },
                  )}
                </Alert>

                <Group grow>
                  <NumberInput
                    label={t("duration_minutes", "Match duration (minutes)")}
                    min={1}
                    step={1}
                    {...form.getInputProps("durationMinutes")}
                  />
                  <NumberInput
                    label={t("margin_minutes", "Encho (minutes)")}
                    min={0}
                    step={1}
                    {...form.getInputProps("marginMinutes")}
                  />
                </Group>

                <ModalFooter
                  onCancel={() => {
                    close();
                    resetWizard();
                  }}
                  primaryLabel={t("generate", "Generate")}
                  primaryType="submit"
                  leftSection={
                    <Button variant="default" onClick={() => setActive(1)}>
                      {t("back", "Back")}
                    </Button>
                  }
                />
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

/** Teams table: Generate Brackets with Selected Teams — Confirm, Strong teams, Division Details (no Prefix). */
export function GenerateBracketsButtonTeams<TRow extends RowWithId>({
  table,
}: {
  table: BracketTableInstance<TRow>;
}) {
  const { id: tournamentId } = getTournamentIdFromRouter();
  const router = useRouter();
  const { t } = useTranslation();
  const swrDivisions = getDivisions(
    tournamentId != null ? Number(tournamentId) : null,
  );
  const existingDivisions: Division[] = swrDivisions.data?.data ?? [];

  const [opened, { open, close }] = useDisclosure(false);
  const [active, setActive] = useState(0);
  const [biasTeamIds, setBiasTeamIds] = useState<number[]>([]);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedTeamIds = useMemo(
    () =>
      opened
        ? selectedRows.map((r) => Number((r.original as RowWithId).id))
        : [],
    [opened, selectedRows],
  );
  const selectedTeamNames = useMemo(
    () =>
      opened
        ? selectedRows.map(
            (r) =>
              String((r.original as RowWithId & { code?: string }).code ?? ""),
          )
        : [],
    [opened, selectedRows],
  );

  const appliedFilters = useMemo(
    () => (opened ? summarizeFilters(table) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      opened,
      table.getState().columnFilters,
      table.getState().globalFilter,
      table.getState().sorting,
    ],
  );

  const bracketSizeOptions = useMemo(
    () =>
      opened && selectedCount >= MIN_TEAM_BRACKET_SIZE
        ? getTeamBracketSizeOptions(selectedCount)
        : [],
    [opened, selectedCount],
  );

  const form = useForm({
    initialValues: {
      name: "",
      durationMinutes: 3,
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
    setFormWarning(null);
    form.reset();
  };

  const toggleBias = (teamId: number) => {
    setBiasTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (selectedTeamIds.length < MIN_TEAM_BRACKET_SIZE) {
      setFormWarning(
        t(
          "too_few_teams_message",
          "A division needs at least {{min}} teams to generate brackets.",
          { min: MIN_TEAM_BRACKET_SIZE },
        ),
      );
      return;
    }

    const name = values.name.trim();
    const conflict = findDivisionIdentityConflict(existingDivisions, name, undefined);
    if (conflict) {
      setFormWarning(t("duplicate_division_name", conflict));
      return;
    }

    setFormWarning(null);

    const createRes = await createDivision({
      tournament_id: Number(tournamentId),
      name,
      prefix: undefined,
      duration_mins: values.durationMinutes,
      margin_mins: values.marginMinutes,
      division_type: "TEAMS",
    });

    if (!createRes || !requestSucceeded(createRes)) {
      setFormWarning(
        getErrorDetail(createRes) ??
          t("create_division_failed", "Failed to create division."),
      );
      return;
    }

    const divisionId: number = createRes?.data?.data?.id ?? createRes?.data?.id;
    if (!divisionId || selectedTeamIds.length === 0) {
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

  const tooFewTeams = selectedCount < MIN_TEAM_BRACKET_SIZE;
  const generateTeamsLabel = t(
    "generate_brackets_teams",
    "Generate Brackets with Selected Teams",
  );

  return (
    <>
      <Tooltip
        label={t(
          "min_teams_for_division",
          "Select at least {{min}} teams to create a division.",
          { min: MIN_TEAM_BRACKET_SIZE },
        )}
        disabled={!tooFewTeams}
        withArrow
      >
        <span>
          <Button
            leftSection={<BuildIcon />}
            disabled={tooFewTeams}
            onClick={open}
            style={{ textTransform: "none" }}
          >
            {generateTeamsLabel}
          </Button>
        </span>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          resetWizard();
        }}
        title={t("generate_modal_title", "Generate Brackets")}
        size="lg"
        centered
        closeOnClickOutside={false}
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
              <ModalFooter
                onCancel={() => {
                  close();
                  resetWizard();
                }}
                primaryLabel={t("next", "Next")}
                onPrimary={() => setActive(1)}
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label={t("strong_teams", "Strong teams")}>
            <Stack gap="md">
              <Alert
                variant="light"
                color="blue"
                icon={<IconInfoCircle size={16} />}
              >
                {t(
                  "strong_teams_hint",
                  "Optionally mark stronger teams so they are spread across brackets and get bye priority.",
                )}
              </Alert>
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
              <ModalFooter
                onCancel={() => {
                  close();
                  resetWizard();
                }}
                primaryLabel={t("next", "Next")}
                onPrimary={() => setActive(2)}
                leftSection={
                  <Button variant="default" onClick={() => setActive(0)}>
                    {t("back", "Back")}
                  </Button>
                }
              />
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
                  onChange={(e) => {
                    form.setFieldValue("name", e.currentTarget.value);
                    setFormWarning(null);
                  }}
                />

                {formWarning ? <WarningAlert>{formWarning}</WarningAlert> : null}

                <Divider label={t("bracket_layout", "Bracket Layout")} labelPosition="left" />

                <Alert
                  variant="light"
                  color="blue"
                  icon={<IconInfoCircle size={16} />}
                >
                  {t(
                    "bracket_layout_description_teams",
                    "Choose how to split {{count}} teams into brackets. Sizes are kept roughly equal.",
                    { count: selectedCount },
                  )}
                </Alert>
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

                <Divider />

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
                <Text size="sm" c="dimmed">
                  {t(
                    "duration_margin_schedule_note",
                    "These will be used to create the court schedule and can be modified later in the scheduler.",
                  )}
                </Text>

                <ModalFooter
                  onCancel={() => {
                    close();
                    resetWizard();
                  }}
                  primaryLabel={t("generate", "Generate")}
                  primaryType="submit"
                  leftSection={
                    <Button variant="default" onClick={() => setActive(1)}>
                      {t("back", "Back")}
                    </Button>
                  }
                />
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
  table: BracketTableInstance<TRow>,
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
