import { useTranslation } from "next-i18next/pages";
import React, { useEffect, useMemo, useState } from "react";
import { SWRResponse } from "swr";
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "mantine-react-table-open";
import {
  ActionIcon,
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
  IconUsers,
} from "@tabler/icons-react";
import { mkConfig, generateCsv, download } from "export-to-csv";

import PlayerCreateModal, {
  PlayerEditModal,
} from "../modals/player_create_modal";
import PlayerFieldsConfigModal from "../modals/player_fields_config_modal";
import { Player } from "../../interfaces/player";
import { FieldInsertable } from "../../interfaces/player_fields";
import { TournamentMinimal } from "../../interfaces/tournament";
import { deletePlayer } from "../../services/player";
import { EmptyRoster } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";
import { GenerateBracketsButton } from "../modals/bracket_create_modal";

export default function PlayersTable({
  swrPlayersResponse,
  swrPlayerFieldsResponse,
  tournamentData,
}: {
  swrPlayersResponse: SWRResponse;
  swrPlayerFieldsResponse: SWRResponse;
  tournamentData: TournamentMinimal;
}) {
  const { t } = useTranslation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"single" | "multi">("single");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fieldsModalOpen, setFieldsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const players: Player[] =
    swrPlayersResponse.data != null ? swrPlayersResponse.data.data.players : [];

  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];
  // Fields are created from the first Excel import. Individual adds are only
  // allowed after that import has defined the columns.
  const hasFields = playerFields.length > 0;
  const canAddPlayer = hasFields;

  const openCreate = (tab: "single" | "multi") => {
    setCreateTab(tab);
    setCreateModalOpen(true);
  };

  const handleAddPlayer = () => {
    if (!canAddPlayer) {
      openCreate("multi");
      return;
    }
    openCreate("single");
  };

  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
  });

  const handleExportAll = () => {
    const rows = players.map((p) => {
      const base: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        club: p.club ?? "",
        code: p.code ?? "",
      };
      for (const f of playerFields) {
        if (!f.include) continue;
        base[f.key] = p.data?.[f.key] ?? "";
      }
      return base;
    });
    const csv = generateCsv(csvConfig)(rows as any);
    download(csvConfig)(csv);
  };

  const handleDeleteRows = async (rows: MRT_Row<Player>[]) => {
    if (!rows.length) return;
    const ok = window.confirm(
      t(
        "confirm_remove_players",
        "Are you sure you want to remove the selected players?",
      ),
    );
    if (!ok) return;
    try {
      await Promise.all(
        rows.map((row) => deletePlayer(tournamentData.id, row.original.id)),
      );
      const remaining = players.length - rows.length;
      if (remaining <= 0) {
        localStorage.removeItem(
          `imported_player_excels:${tournamentData.id}`,
        );
      }
      await swrPlayersResponse.mutate();
    } catch (err) {
      console.error("Failed to delete player(s):", err);
    }
  };

  const columns = useMemo<MRT_ColumnDef<Player>[]>(() => {
    const nameCol: MRT_ColumnDef<Player> = {
      accessorKey: "name",
      header: t("name_header", "Name"),
      filterVariant: "text",
      Cell: ({ cell }) => (
        <Text fw={600} size="sm">
          {cell.getValue<string>()}
        </Text>
      ),
    };
    const clubCol: MRT_ColumnDef<Player> = {
      accessorKey: "club",
      header: t("club_header", "Club"),
      filterVariant: "text",
      Cell: ({ cell }) => cell.getValue<string | null>() || "—",
    };

    const fieldCols = playerFields
      .filter((f) => f.include)
      .sort((a, b) => a.position - b.position)
      .map((f) => {
        const col: MRT_ColumnDef<Player> = {
          id: f.key,
          header: f.label,
          accessorFn: (row) => row.data[f.key],
          filterVariant:
            f.type === "TEXT"
              ? "text"
              : f.type === "CHECKBOX"
                ? "checkbox"
                : f.type === "NUMBER"
                  ? "range"
                  : "multi-select",
        };
        if (f.type === "DROPDOWN") {
          col.mantineFilterMultiSelectProps = {
            data: f.options ?? [],
          };
        }
        if (f.type === "NUMBER") {
          col.filterFn = "between";
        }
        if (f.type === "CHECKBOX") {
          col.accessorFn = (row) => (row.data[f.key] ? "true" : "false");
          col.Cell = ({ cell }) =>
            cell.getValue<string>() === "true" ? t("yes") : t("no");
        }
        return col;
      });

    const actionsCol: MRT_ColumnDef<Player> = {
      id: "actions",
      header: t("actions_header", "Actions"),
      enableColumnFilter: false,
      enableSorting: false,
      enableColumnOrdering: false,
      size: 100,
      Cell: ({ row }) => (
        <Group gap={4} wrap="nowrap">
          <Tooltip label={t("edit_player_title", "Edit player")}>
            <ActionIcon
              variant="subtle"
              color="green"
              aria-label={t("edit_player_title", "Edit player")}
              onClick={() => {
                setEditingPlayer(row.original);
                setEditModalOpen(true);
              }}
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
    };

    return [nameCol, clubCol, ...fieldCols, actionsCol];
  }, [playerFields, t]);

  const table = useMantineReactTable({
    columns,
    data: players,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    selectAllMode: "all",
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableStickyHeader: true,
    enableRowPinning: true,
    rowPinningDisplayMode: "select-sticky",
    initialState: {
      density: "xs",
      showColumnFilters: true,
    },
    renderTopToolbarCustomActions: ({ table: tableInstance }) => {
      const selected = tableInstance.getSelectedRowModel().rows;
      return (
        <Group gap="xs">
          <Button
            leftSection={<IconPlus size={16} />}
            variant="filled"
            onClick={handleAddPlayer}
          >
            {t("add_player_button", "Add player")}
          </Button>
          <Button
            leftSection={<IconListDetails size={16} />}
            variant="outline"
            onClick={() => setFieldsModalOpen(true)}
          >
            {t("configure_template", "Manage Player Fields")}
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="red"
            disabled={!selected.length}
            onClick={async () => {
              tableInstance.resetRowSelection();
              tableInstance.resetRowPinning();
              await handleDeleteRows(selected);
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
        <GenerateBracketsButton table={tableInstance} />
      </Group>
    ),
  });

  useEffect(() => {
    const leafIds = table.getAllLeafColumns().map((col) => col.id);
    const current = table.getState().columnOrder;
    const base = (current.length ? current : leafIds).filter(
      (id) => id !== "actions" && leafIds.includes(id),
    );
    for (const id of leafIds) {
      if (id !== "actions" && !base.includes(id)) base.push(id);
    }
    const next = [...base, "actions"];
    const same =
      next.length === current.length &&
      next.every((id, index) => id === current[index]);
    if (!same) table.setColumnOrder(next);
  }, [columns, table]);

  if (swrPlayersResponse.error || swrPlayerFieldsResponse.error) {
    return (
      <RequestErrorAlert
        error={swrPlayersResponse.error || swrPlayerFieldsResponse.error}
      />
    );
  }

  if (swrPlayersResponse.isLoading || swrPlayerFieldsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  return (
    <>
      <PlayerCreateModal
        swrPlayersResponse={swrPlayersResponse}
        swrPlayerFieldsResponse={swrPlayerFieldsResponse}
        tournament_id={tournamentData.id}
        opened={createModalOpen}
        setOpened={setCreateModalOpen}
        initialTab={createTab}
        allowSingle={canAddPlayer}
      />
      <PlayerEditModal
        swrPlayersResponse={swrPlayersResponse}
        tournament_id={tournamentData.id}
        opened={editModalOpen}
        setOpened={setEditModalOpen}
        player={editingPlayer}
      />
      <PlayerFieldsConfigModal
        tournament_id={tournamentData.id}
        opened={fieldsModalOpen}
        onClose={() => setFieldsModalOpen(false)}
        onSave={async () => {
          setFieldsModalOpen(false);
          await swrPlayerFieldsResponse.mutate();
        }}
      />
      {players.length === 0 ? (
        <Stack gap="md">
          <Group gap="xs">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddPlayer}
            >
              {t("add_player_button", "Add player")}
            </Button>
            {hasFields ? (
              <Button
                leftSection={<IconListDetails size={16} />}
                variant="outline"
                onClick={() => setFieldsModalOpen(true)}
              >
                {t("configure_template", "Manage Player Fields")}
              </Button>
            ) : null}
          </Group>
          <EmptyRoster
            icon={<IconUsers size={22} stroke={1.5} />}
            title={t("no_players_title", "No players yet")}
            description={
              hasFields
                ? t(
                    "no_players_description",
                    "Add players one at a time, or import a spreadsheet that uses these columns.",
                  )
                : t(
                    "no_players_import_first",
                    "Import a spreadsheet to set up the player columns. You can add individual players after that.",
                  )
            }
          />
        </Stack>
      ) : (
        <MantineReactTable table={table} />
      )}
    </>
  );
}
