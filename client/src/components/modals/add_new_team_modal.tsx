import { useEffect, useState } from "react";
import { Button, Modal, Stack, TextInput, Select } from "@mantine/core";
import { useTranslation } from "next-i18next";

import { getClubs, getTeamCategories } from "../../services/adapter";
import type { Club } from "../../interfaces/club";
import { createTeam } from "../../services/team";
import { resolveClubIdByName } from "../../utils/clubs";
import type { TeamCategoryInterface } from "../../interfaces/team_category";

export default function AddNewTeamModal({
  tournamentId,
  opened,
  onClose,
  onSuccess,
}: {
  tournamentId: number;
  opened: boolean;
  onClose: () => void;
  onSuccess: (
    newTeamId: number,
    team: {
      code: string;
      category: string;
      category_color?: string | null;
      club: string;
      club_id: number;
    },
  ) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [clubId, setClubId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];
  const swrCats = getTeamCategories(tournamentId);
  const cats = swrCats.data?.data ?? [];

  useEffect(() => {
    if (!opened || cats.length === 0) return;
    setCategoryId((prev) => {
      if (prev) return prev;
      const mixed = cats.find(
        (c: TeamCategoryInterface) => c.name.toLowerCase() === "mixed",
      );
      return String(mixed?.id ?? cats[0].id);
    });
  }, [opened, cats]);

  const handleClose = () => {
    setName("");
    setCategoryId("");
    setClubId("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("team_name_required", "Team name is required."));
      return;
    }
    const catNum = Number(categoryId);
    if (!Number.isFinite(catNum)) {
      setError(
        t("team_categories_required", "Add team categories for this tournament first."),
      );
      return;
    }
    const clubIdNum = clubId ? Number(clubId) : resolveClubIdByName(clubs, "", 2);
    if (!Number.isFinite(clubIdNum)) {
      setError(t("club_required", "Select a club."));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await createTeam(
        tournamentId,
        trimmedName,
        true,
        [],
        clubIdNum,
        catNum,
      );
      const data = res?.data ?? res;
      const newTeamId = typeof data?.data?.id === "number" ? data.data.id : data?.id;
      if (typeof newTeamId !== "number") {
        setError(t("create_team_failed", "Team was created but could not get ID."));
        return;
      }
      const clubLabel = clubs.find((c) => c.id === clubIdNum)?.name ?? "";
      const created = data?.data;
      onSuccess(newTeamId, {
        code: trimmedName,
        category: created?.category ?? "",
        category_color: created?.category_color ?? null,
        club: clubLabel,
        club_id: clubIdNum,
      });
      handleClose();
    } catch {
      setError(t("create_team_error", "Failed to create team."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("add_new_team", "Add new team")}
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t("team_name", "Team name")}
          placeholder={t("team_name_placeholder", "e.g. Club A")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={error && !name.trim() ? error : undefined}
          required
        />
        <Select
          label={t("category_table_header", "Category")}
          placeholder={t("select_category", "Select category")}
          data={cats.map((c: TeamCategoryInterface) => ({
            value: String(c.id),
            label: c.name,
          }))}
          value={categoryId || null}
          onChange={(v) => setCategoryId(v ?? "")}
          disabled={cats.length === 0}
        />
        <Select
          label={t("club_header", "Club")}
          placeholder={t("club_select_placeholder", "Select club")}
          data={clubs.map((c) => ({ value: String(c.id), label: c.name }))}
          searchable
          value={clubId || null}
          onChange={(v) => setClubId(v ?? "")}
        />
        {error && name.trim() ? (
          <span style={{ color: "var(--mantine-color-red-6)", fontSize: 14 }}>{error}</span>
        ) : null}
        <Button onClick={handleSubmit} loading={submitting}>
          {t("create_team", "Create team")}
        </Button>
      </Stack>
    </Modal>
  );
}
