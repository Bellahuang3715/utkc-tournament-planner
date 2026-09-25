import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useTranslation } from "next-i18next/pages";
import { mutate } from "swr";

import type { DivisionType } from "../../interfaces/division";
import type { TournamentSchedulePayload } from "../../interfaces/schedule_timetable";
import { requestSucceeded } from "../../services/adapter";
import { fetchDivisionBrackets } from "../../services/bracket";
import { updateDivision } from "../../services/division";
import {
  fetchScheduleTimetable,
  saveScheduleTimetable,
} from "../../services/schedule_timetable";
import {
  applyPlacementDurations,
  eliminationMatchCount,
  estimateBlockMins,
  placementDurationsOverlap,
} from "../../utils/schedule_timetable";

export type DivisionTimingTarget = {
  id: number;
  name: string;
  prefix?: string | null;
  duration_mins: number;
  margin_mins: number;
  division_type: DivisionType;
};

type BracketRow = {
  id: number;
  index: number;
  title?: string | null;
  num_players: number;
};

type LengthChange = {
  placementId: string;
  label: string;
  fromMins: number;
  toMins: number;
};

type ConfirmState = {
  durationMins: number;
  marginMins: number;
  changes: LengthChange[];
  overlaps: boolean;
  schedule: TournamentSchedulePayload;
};

function asNumber(value: number | string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function bracketLabel(bracket: BracketRow): string {
  const title = bracket.title?.trim();
  return title ? title : `Group ${bracket.index}`;
}

export default function DivisionTimingModal({
  opened,
  division,
  tournamentId,
  onClose,
  onSaved,
}: {
  opened: boolean;
  division: DivisionTimingTarget | null;
  tournamentId: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [duration, setDuration] = useState<number | string>(5);
  const [margin, setMargin] = useState<number | string>(1);
  const [brackets, setBrackets] = useState<BracketRow[]>([]);
  const [loadingBrackets, setLoadingBrackets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pushLater, setPushLater] = useState(false);
  const [syncKey, setSyncKey] = useState<string | null>(null);

  const divisionId = division?.id ?? null;

  if (!opened && syncKey !== null) {
    setSyncKey(null);
  } else if (opened && division && syncKey !== String(division.id)) {
    setSyncKey(String(division.id));
    setDuration(division.duration_mins);
    setMargin(division.margin_mins);
    setConfirm(null);
    setPushLater(false);
  }

  useEffect(() => {
    if (!opened || divisionId == null) return;
    let cancelled = false;
    setLoadingBrackets(true);
    fetchDivisionBrackets(divisionId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.data?.data ?? []) as BracketRow[];
        setBrackets(list);
      })
      .catch(() => {
        if (!cancelled) setBrackets([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBrackets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opened, divisionId]);

  const durationMins = asNumber(duration);
  const marginMins = asNumber(margin);
  const timingValid =
    durationMins != null && durationMins > 0 && marginMins != null && marginMins >= 0;
  const isTeams = division?.division_type === "TEAMS";
  const unit = isTeams ? t("teams_count_unit", "teams") : t("players_count_unit", "players");

  const previews = useMemo(() => {
    if (durationMins == null || marginMins == null) return [];
    return brackets
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((bracket) => ({
        id: bracket.id,
        label: bracketLabel(bracket),
        count: Number(bracket.num_players ?? 0),
        matches: eliminationMatchCount(Number(bracket.num_players ?? 0)),
        mins: estimateBlockMins(durationMins, marginMins, Number(bracket.num_players ?? 0)),
      }));
  }, [brackets, durationMins, marginMins]);

  if (!division) return null;

  const close = () => {
    if (saving) return;
    setConfirm(null);
    onClose();
  };

  const persistDivision = async (nextDuration: number, nextMargin: number) => {
    const res = await updateDivision(division.id, {
      name: division.name,
      prefix: division.prefix ?? undefined,
      duration_mins: nextDuration,
      margin_mins: nextMargin,
      division_type: division.division_type,
    });
    if (!res || !requestSucceeded(res)) return false;
    return true;
  };

  const finish = async (message: string) => {
    setConfirm(null);
    onClose();
    await mutate(`tournaments/${tournamentId}/schedule_timetable`);
    await onSaved();
    showNotification({
      color: "green",
      title: t("timing_saved", "Timing saved"),
      message,
    });
  };

  const handleSave = async () => {
    if (!timingValid || durationMins == null || marginMins == null) return;
    if (
      durationMins === division.duration_mins &&
      marginMins === division.margin_mins
    ) {
      close();
      return;
    }

    setSaving(true);
    try {
      const [bracketRes, schedule] = await Promise.all([
        fetchDivisionBrackets(division.id),
        fetchScheduleTimetable(tournamentId),
      ]);
      if (!schedule) return;

      const freshBrackets = (bracketRes.data?.data ?? []) as BracketRow[];
      setBrackets(freshBrackets);
      const byBracketId = new Map(freshBrackets.map((b) => [Number(b.id), b]));
      const durationById = new Map<string, number>();
      const changes: LengthChange[] = [];

      for (const placement of schedule.placements) {
        if (placement.kind !== "division") continue;
        if (Number(placement.divisionId) !== division.id) continue;
        const bracket = byBracketId.get(Number(placement.bracketId));
        if (!bracket) continue;
        const toMins = estimateBlockMins(
          durationMins,
          marginMins,
          Number(bracket.num_players ?? 0),
        );
        if (toMins === placement.durationMins) continue;
        durationById.set(placement.id, toMins);
        changes.push({
          placementId: placement.id,
          label: placement.label,
          fromMins: placement.durationMins,
          toMins,
        });
      }

      if (changes.length === 0) {
        const ok = await persistDivision(durationMins, marginMins);
        if (!ok) return;
        const placed = schedule.placements.some(
          (placement) =>
            placement.kind === "division" && Number(placement.divisionId) === division.id,
        );
        await finish(
          placed
            ? t(
                "timing_saved_already_matches",
                "Division timing was updated. Placed blocks already match this estimate.",
              )
            : t("timing_saved_division", "Division timing was updated."),
        );
        return;
      }

      changes.sort((a, b) => a.label.localeCompare(b.label));
      setPushLater(false);
      setConfirm({
        durationMins,
        marginMins,
        changes,
        overlaps: placementDurationsOverlap(schedule.placements, durationById),
        schedule,
      });
    } catch {
      showNotification({
        color: "red",
        title: t("error", "An error occurred"),
        message: t("timing_load_failed", "Could not check the schedule. Try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const applyConfirm = async (updateBlocks: boolean) => {
    if (!confirm) return;
    setSaving(true);
    try {
      const ok = await persistDivision(confirm.durationMins, confirm.marginMins);
      if (!ok) return;

      if (!updateBlocks) {
        await finish(
          t(
            "timing_saved_division_only",
            "Division timing was updated. Placed blocks were left as they are.",
          ),
        );
        return;
      }

      const durationById = new Map(
        confirm.changes.map((change) => [change.placementId, change.toMins]),
      );
      const placements = applyPlacementDurations(
        confirm.schedule.placements,
        durationById,
        confirm.overlaps && pushLater,
      );
      const res = await saveScheduleTimetable(tournamentId, {
        placements,
        customBlocks: confirm.schedule.customBlocks,
      });
      if (!res || !requestSucceeded(res)) {
        await onSaved();
        return;
      }
      const message =
        confirm.overlaps && pushLater
          ? t(
              "timing_saved_schedule_shifted",
              "Division timing was updated. Block lengths changed, and later blocks on the same court were pushed so nothing overlaps.",
            )
          : confirm.overlaps
            ? t(
                "timing_saved_schedule_overlap",
                "Division timing and block lengths were updated. Overlapping blocks were left for you to fix on the schedule.",
              )
            : t(
                "timing_saved_schedule",
                "Division timing and schedule block lengths were updated. Start times stayed put.",
              );
      await finish(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={
        confirm
          ? t("update_schedule_title", "Update schedule?")
          : t("edit_timing", "Match timing")
      }
      centered
      size="lg"
    >
      {confirm ? (
        <Stack gap="md">
          <Text size="sm">
            {confirm.changes.length === 1
              ? t(
                  "update_schedule_intro_one",
                  "1 group from {{name}} is already on the schedule.",
                  { name: division.name },
                )
              : t(
                  "update_schedule_intro",
                  "{{count}} groups from {{name}} are already on the schedule.",
                  { count: confirm.changes.length, name: division.name },
                )}
          </Text>
          <ScrollArea.Autosize mah={220}>
            <Stack gap={4}>
              {confirm.changes.map((change) => (
                <Text key={change.placementId} size="sm">
                  {change.label}: {change.fromMins} {t("minutes_short", "min")} → {change.toMins}{" "}
                  {t("minutes_short", "min")}
                </Text>
              ))}
            </Stack>
          </ScrollArea.Autosize>
          {confirm.overlaps ? (
            <Alert color="yellow">
              <Stack gap="xs">
                <Text size="sm">
                  {t(
                    "timing_overlap_warning",
                    "Longer blocks overlap the next block on that court.",
                  )}
                </Text>
                <Checkbox
                  checked={pushLater}
                  onChange={(e) => setPushLater(e.currentTarget.checked)}
                  label={t(
                    "push_later_blocks",
                    "Push later blocks on the same court so nothing overlaps",
                  )}
                />
              </Stack>
            </Alert>
          ) : (
            <Text size="sm" c="dimmed">
              {t(
                "timing_keep_starts",
                "Start times stay where they are. Update block lengths to match the new estimate, or keep the blocks you already placed.",
              )}
            </Text>
          )}
          <Group justify="flex-end" wrap="wrap">
            <Button variant="default" onClick={() => setConfirm(null)} disabled={saving}>
              {t("back", "Back")}
            </Button>
            <Button
              variant="default"
              onClick={() => void applyConfirm(false)}
              loading={saving}
            >
              {t("update_division_only", "Update division only")}
            </Button>
            <Button onClick={() => void applyConfirm(true)} loading={saving}>
              {t("update_block_lengths", "Update block lengths")}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Group grow>
            <NumberInput
              label={t("duration_minutes", "Duration (minutes)")}
              min={1}
              step={1}
              value={duration}
              onChange={setDuration}
            />
            <NumberInput
              label={t("margin_minutes", "Margin (minutes)")}
              description={t("margin_hint", "Extra minutes after each match")}
              min={0}
              step={1}
              value={margin}
              onChange={setMargin}
            />
          </Group>
          <Text size="sm" c="dimmed">
            {isTeams
              ? t(
                  "timing_formula_teams",
                  "Elimination: a group of N teams plays N − 1 matches. Length is (match + margin) × matches, rounded to 10 minutes.",
                )
              : t(
                  "timing_formula_players",
                  "Elimination: a group of N players plays N − 1 matches. Length is (match + margin) × matches, rounded to 10 minutes.",
                )}
          </Text>
          {loadingBrackets ? (
            <Text size="sm" c="dimmed">
              {t("loading", "Loading…")}
            </Text>
          ) : previews.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t(
                "timing_no_groups",
                "Estimates appear once this division has groups.",
              )}
            </Text>
          ) : (
            <Stack gap={4}>
              {previews.map((row) => (
                <Text key={row.id} size="sm">
                  {row.label} · {row.count} {unit} · {row.matches}{" "}
                  {t("matches", "matches")} · {row.mins} {t("minutes_short", "min")}
                </Text>
              ))}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleSave()} loading={saving} disabled={!timingValid}>
              {t("save")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
