import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "next-i18next/pages";

import { FieldInsertable } from "../../interfaces/player_fields";
import {
  DuplicateGroup,
  PlayerSnapshot,
} from "../utils/player_duplicates";

function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function detailRows(player: PlayerSnapshot, fields: FieldInsertable[]) {
  const rows: { label: string; value: string }[] = [
    { label: "Name", value: player.name },
    { label: "Club", value: player.clubName || "—" },
  ];
  if (player.code) rows.push({ label: "Code", value: player.code });

  const seen = new Set<string>();
  const ordered = [...fields].sort((a, b) => a.position - b.position);
  for (const field of ordered) {
    seen.add(field.key);
    rows.push({
      label: field.label,
      value: formatValue(player.data[field.key]),
    });
  }
  for (const [key, value] of Object.entries(player.data)) {
    if (seen.has(key)) continue;
    rows.push({ label: key, value: formatValue(value) });
  }
  return rows;
}

function PlayerCard({
  player,
  fields,
  checked,
  onChecked,
}: {
  player: PlayerSnapshot;
  fields: FieldInsertable[];
  checked?: boolean;
  onChecked?: (checked: boolean) => void;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        {player.saved ? (
          <Badge variant="light" color="gray">
            Already in this tournament
          </Badge>
        ) : (
          <Checkbox
            checked={checked}
            onChange={(event) => onChecked?.(event.currentTarget.checked)}
            label="Keep this player"
          />
        )}
        <Text size="xs" c="dimmed">
          {player.source}
        </Text>
        <Stack gap={6}>
          {detailRows(player, fields).map((row) => (
            <Group key={row.label} gap="md" wrap="nowrap" align="flex-start">
              <Text size="sm" c="dimmed" w={140} style={{ flexShrink: 0 }}>
                {row.label}
              </Text>
              <Text size="sm" style={{ wordBreak: "break-word" }}>
                {row.value}
              </Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function PlayerDuplicateModal({
  groups,
  fields,
  context,
  onCancel,
  onConfirm,
}: {
  groups: DuplicateGroup[] | null;
  fields: FieldInsertable[];
  context: "import" | "single";
  onCancel: () => void;
  onConfirm: (keptIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!groups) return;
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      for (const player of group.pending) initial[player.id] = false;
    }
    setChecked(initial);
  }, [groups]);

  return (
    <Modal
      opened={groups != null}
      onClose={onCancel}
      closeOnClickOutside={false}
      title={t("duplicate_players_title", "Same name and club")}
      centered
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" lh={1.6}>
          {context === "import"
            ? t(
                "duplicate_players_intro",
                "These players share a name and club. A club can have more than one player with the same name, so choose which ones to keep. Other players in this import are not listed here and will still be added.",
              )
            : t(
                "duplicate_player_single_intro",
                "This name and club is already in the tournament. A club can have more than one player with the same name. The saved player stays, and you can add this one too.",
              )}
        </Text>
        <ScrollArea.Autosize mah={480} type="auto" offsetScrollbars>
          <Stack gap="lg">
            {groups?.map((group, index) => (
              <Stack key={group.key} gap="sm">
                {index > 0 && <Divider />}
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={4}>
                    <Text fw={600}>
                      {group.name}
                      <Text span c="dimmed" fw={400}>
                        {" "}
                        · {group.clubName}
                      </Text>
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.5}>
                      {group.saved.length > 0
                        ? group.pending.length > 1
                          ? t(
                              "duplicate_players_saved_many_hint",
                              "Already in this tournament, and this import has more than one match. The saved player stays. Select any new players you also want to add.",
                            )
                          : t(
                              "duplicate_players_saved_hint",
                              "Already in this tournament. That saved player stays. Select the new player if you also want to add them.",
                            )
                        : t(
                            "duplicate_players_pending_hint",
                            "Not saved yet. Select every copy you want to keep. You can keep more than one.",
                          )}
                    </Text>
                  </Stack>
                  {group.pending.length > 1 && (
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      onClick={() =>
                        setChecked((current) => {
                          const next = { ...current };
                          for (const player of group.pending) next[player.id] = true;
                          return next;
                        })
                      }
                    >
                      {t("select_all_players", "Select all")}
                    </Button>
                  )}
                </Group>
                {group.saved.map((player) => (
                  <PlayerCard key={player.id} player={player} fields={fields} />
                ))}
                {group.pending.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    fields={fields}
                    checked={checked[player.id] ?? false}
                    onChecked={(value) =>
                      setChecked((current) => ({ ...current, [player.id]: value }))
                    }
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        </ScrollArea.Autosize>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel}>
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={() =>
              onConfirm(
                Object.entries(checked)
                  .filter(([, value]) => value)
                  .map(([id]) => id),
              )
            }
          >
            {t("continue_button", "Continue")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
