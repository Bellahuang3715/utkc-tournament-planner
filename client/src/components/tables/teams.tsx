import React, { useMemo, useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { SWRResponse } from "swr";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "mantine-react-table-open";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconDownload,
  IconListDetails,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import { mkConfig, generateCsv, download } from "export-to-csv";

import { TeamInterface } from "../../interfaces/team";
import { TournamentMinimal } from "../../interfaces/tournament";
import { deleteTeam } from "../../services/team";
import { categoryChipBackground, chipTextColor } from "../../utils/chipStyle";
import { GenerateBracketsButtonTeams } from "../modals/bracket_create_modal";
import CategoryConfigModal from "../modals/category_config_modal";
import TeamModal from "../modals/team_modal";
import { EmptyRoster } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";

export default function TeamsTable({
  tournamentData,
  swrTeamsResponse,
  teams,
}: {
  tournamentData: TournamentMinimal;
  swrTeamsResponse: SWRResponse;
  teams: TeamInterface[];
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamInterface | undefined>(
    undefined,
  );

  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
  });

  const handleExportAll = () => {
    const rows = teams.map((team) => ({
      id: team.id,
      code: team.code,
      club: team.club,
      category: team.category,
      created: team.created,
      active: team.active,
      wins: team.wins,
    }));
    const csv = generateCsv(csvConfig)(rows as any);
    download(csvConfig)(csv);
  };

  const handleDeleteRows = async (rows: MRT_Row<TeamInterface>[]) => {
    if (!rows.length) return;
    const ok = window.confirm(
      t(
        "confirm_remove_teams",
        "Are you sure you want to remove the selected team(s)?",
      ),
    );
    if (!ok) return;
    try {
      await Promise.all(
        rows.map((row) => deleteTeam(tournamentData.id, row.original.id)),
      );
      await swrTeamsResponse.mutate();
    } catch (err) {
      console.error("Failed to delete team(s):", err);
    }
  };

  const openCreate = () => {
    setEditingTeam(undefined);
    setModalOpen(true);
  };

  const openEdit = (team: TeamInterface) => {
    setEditingTeam(team);
    setModalOpen(true);
  };

  const columns = useMemo<MRT_ColumnDef<TeamInterface>[]>(() => {
    const categoryFilterOptions = [
      ...new Set(teams.map((x) => x.category).filter(Boolean)),
    ].sort() as string[];

    return [
      {
        accessorKey: "active",
        header: t("status", "Status"),
        enableColumnFilter: false,
        Cell: ({ cell }) =>
          cell.getValue<boolean>() ? (
            <Badge color="green">{t("active", "Active")}</Badge>
          ) : (
            <Badge color="red">{t("inactive", "Inactive")}</Badge>
          ),
      },
      {
        accessorKey: "code",
        header: t("name_table_header", "Name"),
        filterVariant: "text",
        Cell: ({ cell }) => (
          <Text fw={600} size="sm">
            {cell.getValue<string>()}
          </Text>
        ),
      },
      {
        accessorKey: "club",
        header: t("club_header", "Club"),
        enableSorting: false,
        filterVariant: "text",
        Cell: ({ cell }) => cell.getValue<string | null>() || "—",
      },
      {
        accessorKey: "members",
        header: t("members_table_header", "Members"),
        enableSorting: false,
        filterVariant: "text",
        Cell: ({ cell }) => {
          const value = cell.getValue<unknown>();
          if (value == null || value === "") return "—";
          return String(value);
        },
      },
      {
        accessorKey: "category",
        header: t("category_table_header", "Category"),
        enableSorting: false,
        filterVariant: "multi-select",
        mantineFilterMultiSelectProps: {
          data: categoryFilterOptions,
        },
        Cell: ({ row }) => {
          const label = row.original.category;
          const bg = categoryChipBackground(
            row.original.category_color,
            label,
          );
          return (
            <Badge
              style={{
                backgroundColor: bg,
                color: chipTextColor(bg),
              }}
            >
              {label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: t("actions_header", "Actions"),
        enableColumnFilter: false,
        enableSorting: false,
        size: 100,
        Cell: ({ row }) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={t("edit_team_button", "Edit")}>
              <ActionIcon
                variant="subtle"
                color="green"
                aria-label={t("edit_team_button", "Edit")}
                onClick={() => openEdit(row.original)}
              >
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("delete_button", "Delete")}>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={t("delete_button", "Delete")}
                onClick={() => void handleDeleteRows([row])}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ];
  }, [t, teams]);

  const table = useMantineReactTable({
    columns,
    data: teams,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,
    enableColumnOrdering: false,
    enableColumnPinning: true,
    initialState: {
      density: "xs",
      showColumnFilters: false,
    },
    renderTopToolbarCustomActions: ({ table: tableInstance }) => {
      const selected = tableInstance.getSelectedRowModel().rows;
      return (
        <Group gap="xs">
          <Button
            leftSection={<IconPlus size={16} />}
            variant="filled"
            onClick={openCreate}
          >
            {t("add_team_button", "Add team")}
          </Button>
          <Button
            leftSection={<IconListDetails size={16} />}
            variant="outline"
            onClick={() => setCategoriesModalOpen(true)}
          >
            {t("manage_teams_categories", "Manage Teams Categories")}
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="red"
            disabled={!selected.length}
            onClick={async () => {
              await handleDeleteRows(selected);
              tableInstance.resetRowSelection();
            }}
          >
            {t("delete_selected", "Delete selected")}
          </Button>
        </Group>
      );
    },
    renderBottomToolbarCustomActions: ({ table: tableInstance }) => (
      <Group gap="md" p="xs" wrap="wrap">
        <Button
          leftSection={<IconDownload size={16} />}
          variant="light"
          onClick={handleExportAll}
        >
          {t("export_all_data", "Export All Data")}
        </Button>
        <GenerateBracketsButtonTeams table={tableInstance} />
      </Group>
    ),
  });

  if (swrTeamsResponse.error) {
    return <RequestErrorAlert error={swrTeamsResponse.error} />;
  }

  if (swrTeamsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  return (
    <>
      <TeamModal
        team={editingTeam}
        tournament_id={tournamentData.id}
        swrTeamsResponse={swrTeamsResponse}
        opened={modalOpen}
        setOpened={setModalOpen}
      />
      <CategoryConfigModal
        tournament_id={tournamentData.id}
        opened={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        onSaved={() => swrTeamsResponse.mutate()}
      />
      {teams.length === 0 ? (
        <Stack gap="md">
          <Group gap="xs">
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              {t("add_team_button", "Add team")}
            </Button>
            <Button
              leftSection={<IconListDetails size={16} />}
              variant="outline"
              onClick={() => setCategoriesModalOpen(true)}
            >
              {t("manage_teams_categories", "Manage Teams Categories")}
            </Button>
          </Group>
          <EmptyRoster
            icon={<IconUsersGroup size={22} stroke={1.5} />}
            title={t("no_teams_title", "No teams yet")}
            description={t(
              "no_teams_description",
              "Add teams to this tournament to get started.",
            )}
          />
        </Stack>
      ) : (
        <MantineReactTable table={table} />
      )}
    </>
  );
}
