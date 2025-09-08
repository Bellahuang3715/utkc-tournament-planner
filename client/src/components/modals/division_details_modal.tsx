import React, { useState, useEffect } from "react";
import {
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  NumberInput,
} from "@mantine/core";
import { useTranslation } from "next-i18next";

interface BracketData {
  id: string;
  name: string;
  payload: any;
}

interface GroupModel {
  id: number;
  name: string;
  categoryId: string;
  matchDuration: number; // minutes
  overtimeDuration: number; // minutes
  totalPlayers: number;
  brackets: BracketData[];
}

export default function DivisionDetailsModal({
  opened,
  group,
  onClose,
  onSave,
}: {
  opened: boolean;
  group: GroupModel | null;
  onClose: () => void;
  onSave: (updated: GroupModel) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<GroupModel | null>(group);

  useEffect(() => setDraft(group), [group]);

  if (!draft) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={t("edit_group", "Edit Group")} centered size="lg">
      <Stack gap="md">
        <TextInput
          label={t("group_name", "Group Name")}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
        />
        <TextInput
          label={t("category_id", "Category ID")}
          value={draft.categoryId}
          onChange={(e) =>
            setDraft({ ...draft, categoryId: e.currentTarget.value })
          }
        />
        <NumberInput
          label={t("match_duration", "Match Duration (min)")}
          min={0}
          value={draft.matchDuration}
          onChange={(v) =>
            typeof v === "number" && setDraft({ ...draft, matchDuration: v })
          }
        />
        <NumberInput
          label={t("overtime_duration", "Overtime Duration (min)")}
          min={0}
          value={draft.overtimeDuration}
          onChange={(v) =>
            typeof v === "number" &&
            setDraft({ ...draft, overtimeDuration: v })
          }
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={() => onSave(draft)}>{t("save")}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}