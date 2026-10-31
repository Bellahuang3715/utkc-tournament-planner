import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
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

  const groupCount = groups?.length ?? 0;

  return (
    <Modal
      opened={groups != null}
      onClose={onCancel}
      closeOnClickOutside={false}
      title={t(
        "duplicate_players_title",
        "Duplicate players detected",
      )}
      centered
      size="lg"
    >
      <Stack gap="md">
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title={
            context === "import"
              ? t(
                  "duplicate_players_heading",
                  "Same name and club found in this import",
                )
              : t(
                  "duplicate_player_single_heading",
                  "Same name and club already in this tournament",
                )
          }
        >
          {context === "import"
            ? t(
                "duplicate_players_intro",
                "A club can have more than one player with the same name. Select every copy you want to keep.",
              )
            : t(
                "duplicate_player_single_intro",
                "A club can have more than one player with the same name. The saved player stays, and you can add this one too.",
              )}
        </Alert>
        <ScrollArea.Autosize mah={480} type="auto" offsetScrollbars>
          <Stack gap="lg">
            {groups?.map((group, index) => (
              <Stack key={group.key} gap="sm">
                {index > 0 && <Divider />}
                <Stack gap="xs">
                  <Group gap="xs" wrap="wrap">
                    {groupCount > 1 && (
                      <Text size="sm" c="dimmed">
                        {t("duplicate_group_of", "{{current}} of {{total}}", {
                          current: index + 1,
                          total: groupCount,
                        })}
                      </Text>
                    )}
                  </Group>
                  <Text fw={700} size="lg">
                    {group.name}
                    <Text span c="dimmed" fw={500} size="md">
                      {" "}
                      · {group.clubName}
                    </Text>
                  </Text>
                </Stack>
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
