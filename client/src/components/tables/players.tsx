import { useTranslation } from "next-i18next";
import React, { useMemo, useState } from "react";
import { SWRResponse } from "swr";
import {
  MaterialReactTable,
  MaterialReactTableProps,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Flex, Button } from "@mantine/core";
import { IconUpload, IconPlus, IconUser, IconUsers } from "@tabler/icons-react";

import SaveButton from "../buttons/save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { IconUserPlus } from "@tabler/icons-react";
import { mkConfig, generateCsv, download } from "export-to-csv";

import { Player } from "../../interfaces/player";
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "../../services/player";
import { FieldInsertable } from "../../interfaces/player_fields";
import { TournamentMinimal } from "../../interfaces/tournament";
import { NoContent } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";

import TemplateConfigModal, {
  TemplateConfig,
} from "../modals/template_config_modal";
import ClubImportModal, { ClubUpload } from "../modals/excel_create_modal";

export default function PlayersTable({
  swrPlayersResponse,
  swrPlayerFieldsResponse,
  tournamentData,
}: {
  swrPlayersResponse: SWRResponse;
  swrPlayerFieldsResponse: SWRResponse;
  tournamentData: TournamentMinimal;
}) {
  // state for modal & uploading
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isClubImportOpen, setClubImportOpen] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig | null>(
    null
  );

  // 1) Save template‐schema, then jump to club‐upload phase
  const handleTemplateSave = (config: TemplateConfig) => {
    setTemplateConfig(config);
    setTemplateModalOpen(false);
    setClubImportOpen(true);
  };

  // 2) Import all club sheets using saved templateConfig
  const handleImportAll = async (uploads: ClubUpload[]) => {
    if (!templateConfig) return;
    // TODO: loop through uploads and your API call, e.g.:
    // for (const { file, clubName, clubAbbr } of uploads) {
    //   await importClubSheet(tournament_id, templateConfig, { file, clubName, clubAbbr });
    // }
    setClubImportOpen(false);
  };
  const { t } = useTranslation();

  const players: Player[] =
    swrPlayersResponse.data != null ? swrPlayersResponse.data.data.players : [];
  console.log("players", players);

  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];
  console.log("playerFields", playerFields);

  // ────── CSV CONFIG ─────────────────────────────────────────────
  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
  });

  // export all rows (unfiltered/unpaginated)
  const handleExportAll = () => {
    // const csv = generateCsv(csvConfig)(players);
    // download(csvConfig)(csv);
  };

  // export only selected rows
  const handleExportSelected = (rows: MRT_Row<Player>[]) => {
    // const rowData = rows.map((r) => r.original);
    // const csv = generateCsv(csvConfig)(rowData);
    // download(csvConfig)(csv);
  };

  // 1) build the column definitions
  const columns = useMemo<MRT_ColumnDef<Player>[]>(
    () =>
      playerFields
        .filter((f) => f.include)
        .sort((a, b) => a.position - b.position)
        .map((f) => {
          const col: MRT_ColumnDef<Player> = {
            id: f.key,
            header: f.label,
            accessorFn: (row) => row.data[f.key],
            // size: 150,
            // pick filterVariant by field type
            filterVariant:
              f.type === "TEXT"
                ? "text"
                : f.type === "BOOLEAN"
                ? "checkbox"
                : f.type === "NUMBER"
                ? "range"
                : "multi-select",
          };

          if (f.type === "DROPDOWN") {
            col.filterSelectOptions = f.options;
          }
          if (f.type === "NUMBER") {
            col.filterFn = "between";
          }
          if (f.type === "BOOLEAN") {
            // MRT expects strings for checkbox filters
            col.accessorFn = (row) => (row.data[f.key] ? "true" : "false");
            col.Cell = ({ cell }) =>
              cell.getValue<string>() === "true" ? t("yes") : t("no");
          }
          return col;
        })
        .concat({
          id: "actions",
          header: t("actions", "Actions"),
          enableEditing: false,
          enableColumnFilter: false,
          enableSorting: false,
          Cell: ({ row, table }) => (
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
              {/* edit/delete as before */}
            </Box>
          ),
        }),
    [playerFields, t]
  );

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

  if (players.length === 0) {
    return <NoContent title={t("no_players_title")} />;
  }

  // 4) define create/update/delete handlers
  const handleCreate: MaterialReactTableProps<Player>["onCreatingRowSave"] =
    async ({ values, table }) => {
      // values is Record<fieldKey, any>
      await createPlayer(tournamentData.id, { data: values });
      await swrPlayersResponse.mutate();
      table.setCreatingRow(null);
    };

  const handleSave: MaterialReactTableProps<Player>["onEditingRowSave"] =
    async ({ values, row, table }) => {
      await updatePlayer(tournamentData.id, row.original.id, { data: values });
      await swrPlayersResponse.mutate();
      table.setEditingRow(null);
    };

  const handleDelete = (row: MRT_Row<Player>) => {
    if (
      window.confirm(
        t("confirm_delete_message", {
          name: row.original.data.name ?? row.original.id,
        })
      )
    ) {
      deletePlayer(tournamentData.id, row.original.id);
      swrPlayersResponse.mutate();
    }
  };

  // 4) render
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MaterialReactTable<Player>
        columns={columns}
        data={players}
        enableColumnOrdering={true}
        enableStickyHeader={true}
        enableColumnPinning={true}
        enableRowPinning={true}
        enableRowSelection={true}
        // enableRowNumbers={true}
        // enableColumnResizing={true}
        rowPinningDisplayMode="select-sticky"
        getRowId={(row) => row.id.toString()}
        enableEditing
        createDisplayMode="row"
        editDisplayMode="row"
        onCreatingRowSave={handleCreate}
        onEditingRowSave={handleSave}
        renderRowActions={({ row, table }) => (
          <Box sx={{ display: "flex", gap: "0.5rem" }}>
            <Tooltip title={t("edit")}>
              <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("delete")}>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(row)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        renderTopToolbarCustomActions={({ table }) => (
          <>
            <Flex justify="space-between" mb="md" align="center">
              {/* create new */}
              <SaveButton
                variant="contained"
                leftSection={<IconUserPlus size={24} />}
                title={t("add_player_button")}
                onClick={() => table.setCreatingRow(true)}
              >
                {t("add_player_button")}
              </SaveButton>

              <Flex gap="sm">
                {/* Always show “Configure Template” */}
                <Button
                  leftSection={<IconUpload size={16} />}
                  variant="outline"
                  onClick={() => setTemplateModalOpen(true)}
                >
                  {t("configure_template", "Configure Template")}
                </Button>

                {/* Always show “Import Sheet”, but disable until we have a template */}
                <Button
                  leftSection={<IconUpload size={16} />}
                  variant="outline"
                  onClick={() => setClubImportOpen(true)}
                  // disabled={!templateConfig}
                >
                  {t("import_sheet", "Import Filled Sheet")}
                </Button>
              </Flex>
            </Flex>

            {/* 1) Define your template once */}
            <TemplateConfigModal
              tournament_id={tournamentData.id}
              opened={isTemplateModalOpen}
              onClose={() => setTemplateModalOpen(false)}
              onSave={handleTemplateSave}
            />

            {/* 2) Then batch‐upload club sheets */}
            <ClubImportModal
              opened={isClubImportOpen}
              onClose={() => setClubImportOpen(false)}
              onImportAll={handleImportAll}
            />
          </>
        )}
        renderBottomToolbarCustomActions={({ table }) => (
          <Box sx={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {/* export all data */}
            <Button
              leftSection={<FileDownloadIcon />}
              onClick={handleExportAll}
            >
              {t("export_all_data", "Export All Data")}
            </Button>

            {/* export selected rows */}
            <Button
              leftSection={<FileDownloadIcon />}
              disabled={!table.getIsSomeRowsSelected()}
              onClick={() =>
                handleExportSelected(table.getSelectedRowModel().rows)
              }
            >
              {t("export_selected_rows", "Export Selected Rows")}
            </Button>
          </Box>
        )}
        initialState={{ showColumnFilters: true }}
      />
    </LocalizationProvider>
  );
}
