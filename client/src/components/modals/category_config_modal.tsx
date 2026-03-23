import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  ColorInput,
  Group,
  Stack,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";

import { getTeamCategories, requestSucceeded } from "../../services/adapter";
import type { TeamCategoryInterface } from "../../interfaces/team_category";
import {
  createTeamCategory,
  deleteTeamCategory,
  updateTeamCategory,
} from "../../services/team_categories";

export default function CategoryConfigModal({
  tournament_id,
  opened,
  onClose,
  onSaved,
}: {
  tournament_id: number;
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const { data, mutate, isLoading } = getTeamCategories(tournament_id);

  const [draft, setDraft] = useState<TeamCategoryInterface[]>([]);
  const [baseline, setBaseline] = useState<TeamCategoryInterface[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened) {
      setSeeded(false);
      return;
    }
    if (seeded) return;
    const rows = data?.data;
    if (!rows) return;
    const copy = (rows as TeamCategoryInterface[]).map((c) => ({ ...c }));
    setDraft(copy);
    setBaseline(copy.map((c) => ({ ...c })));
    setSeeded(true);
  }, [opened, data, seeded]);

  const updateRow = (id: number, changes: Partial<TeamCategoryInterface>) => {
    setDraft((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    );
  };

  const handleAdd = async () => {
    const res = await createTeamCategory(
      tournament_id,
      t("new_team_category", "New category"),
      "#d0ebff",
    );
    const created = (res as { data?: { data?: TeamCategoryInterface } } | undefined)
      ?.data?.data;
    if (created) {
      setDraft((d) => [...d, created]);
      setBaseline((b) => [...b, { ...created }]);
      await mutate();
      onSaved?.();
    }
  };

  const handleDelete = async (row: TeamCategoryInterface) => {
    const ok = window.confirm(
      t(
        "confirm_delete_team_category",
        "Delete this category? It must not be used by any team.",
      ),
    );
    if (!ok) return;
    const res = await deleteTeamCategory(tournament_id, row.id);
    if (!requestSucceeded(res)) return;
    setDraft((d) => d.filter((x) => x.id !== row.id));
    setBaseline((b) => b.filter((x) => x.id !== row.id));
    await mutate();
    onSaved?.();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const row of draft) {
        const base = baseline.find((b) => b.id === row.id);
        if (!base) continue;
        const name = row.name.trim();
        if (!name) {
          window.alert(t("category_name_required", "Each category needs a name."));
          return;
        }
        if (
          base.name !== name ||
          base.color !== row.color ||
          base.position !== row.position
        ) {
          const res = await updateTeamCategory(tournament_id, row.id, {
            name,
            color: row.color,
            position: row.position,
          });
          if (!requestSucceeded(res)) return;
        }
      }
      const next = draft.map((c) => ({ ...c, name: c.name.trim() }));
      setDraft(next);
      setBaseline(next.map((c) => ({ ...c })));
      await mutate();
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t("manage_teams_categories", "Manage Teams Categories")}
    >
      {opened && isLoading && !data ? (
        <Loader />
      ) : (
        <Stack gap="md">
          {draft.map((cat) => (
            <Group key={cat.id} gap="sm" wrap="nowrap">
              <ColorInput
                value={cat.color}
                onChange={(c) => updateRow(cat.id, { color: c })}
                size="xs"
              />
              <TextInput
                placeholder={t("category_name_placeholder", "Category name")}
                value={cat.name}
                onChange={(e) =>
                  updateRow(cat.id, { name: e.currentTarget.value })
                }
                style={{ flex: 1 }}
                size="xs"
              />
              <ActionIcon color="red" onClick={() => handleDelete(cat)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            leftSection={<IconPlus size={16} />}
            variant="outline"
            onClick={handleAdd}
          >
            {t("add_category", "Add category")}
          </Button>
        </Stack>
      )}

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          {t("cancel", "Cancel")}
        </Button>
        <Button color="green" onClick={handleSave} loading={saving}>
          {t("save_changes", "Save changes")}
        </Button>
      </Group>
    </Modal>
  );
}
