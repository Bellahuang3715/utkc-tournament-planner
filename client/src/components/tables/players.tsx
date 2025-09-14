import { useTranslation } from "next-i18next";
import React, { useState, useMemo } from "react";
import { SWRResponse } from "swr";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Box, IconButton, Tooltip } from "@mui/material";
import { BiEditAlt } from "react-icons/bi";
import { Button } from "@mantine/core";

import AddBoxIcon from "@mui/icons-material/AddBox";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlayerCreateModal, { PlayerEditModal } from "../modals/player_create_modal";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { mkConfig, generateCsv, download } from "export-to-csv";

import { Player } from "../../interfaces/player";
import { FieldInsertable } from "../../interfaces/player_fields";
import { TournamentMinimal } from "../../interfaces/tournament";
import { NoContent } from "../no_content/empty_table_info";
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const players: Player[] =
    swrPlayersResponse.data != null ? swrPlayersResponse.data.data.players : [];
  console.log("players", players);

  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];
    
  // console.log("playerFields", playerFields);

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

  // 1) build the column definitions
   const columns = useMemo<MRT_ColumnDef<Player>[]>(
     () => {
      // 1a) explicit "name" column
      const nameCol: MRT_ColumnDef<Player> = {
        accessorKey: 'name',
        header: t('name_header', 'Name'),
        filterVariant: 'text',
      };
      const clubCol: MRT_ColumnDef<Player> = {
        accessorKey: 'club',
        header: t('club_header', 'Club'),
        filterVariant: 'text',
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
            col.filterSelectOptions = f.options;
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

        const actionsCol = {
          id: "actions",
          header: "Actions",
          enableColumnFilter: false,
          enableSorting: false,
          enableEditing: false,
          size: 100,
          Cell: ({ row }: { row: MRT_Row<Player> }) => (
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
              <Button
                color="green"
                size="xs"
                style={{ marginRight: 10 }}
                onClick={() => {
                  setEditingPlayer(row.original);
                  setEditModalOpen(true);
                }}
                leftSection={<BiEditAlt size={20} />}
              >
                {t("edit_player_title")}
              </Button>
            </Box>
          ),
        }

        return [
          nameCol,
          clubCol,
          ...fieldCols,
          actionsCol
        ];
      },
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

  return (
    <>
      <PlayerCreateModal
        swrPlayersResponse={swrPlayersResponse}
        tournament_id={tournamentData.id}
        opened={createModalOpen}
        setOpened={setCreateModalOpen}
      />
      <PlayerEditModal
        swrPlayersResponse={swrPlayersResponse}
        tournament_id={tournamentData.id}
        opened={editModalOpen}
        setOpened={setEditModalOpen}
        player={editingPlayer}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MaterialReactTable<Player>
          columns={columns}
          data={players}
          enableColumnOrdering
          enableStickyHeader
          enableColumnPinning
          enableRowPinning
          enableRowSelection
          // enableRowNumbers={true}
          // enableColumnResizing={true}
          // selectAllMode="all"
          rowPinningDisplayMode="select-sticky"
          getRowId={(row) => row.id.toString()}
          renderRowActions={({ row, table }) => (
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
              <Tooltip title={t("edit")}>
                <IconButton
                  size="small"
                  onClick={() => table.setEditingRow(row)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          renderTopToolbarCustomActions={({ table }) => {
            const handleRemoveUsers = () => {
              confirm("Are you sure you want to remove the selected players?");
            };

            return (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Tooltip title="Add Player">
                  <IconButton onClick={() => setCreateModalOpen(true)}>
                    <AddBoxIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove Player(s)">
                  <span>
                    <IconButton
                      disabled={
                        table.getSelectedRowModel().flatRows.length === 0
                      }
                      onClick={handleRemoveUsers}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            );
          }}
          renderBottomToolbarCustomActions={({ table }) => (
            <Box
              sx={{
                display: "flex",
                gap: "16px",
                padding: "8px",
                flexWrap: "wrap",
              }}
            >
              {/* export all data */}
              <Button
                leftSection={<FileDownloadIcon />}
                onClick={handleExportAll}
                style={{ textTransform: "none" }}
              >
                {t("export_all_data", "Export All Data")}
              </Button>

              {/* brackets generator */}
              <GenerateBracketsButton table={table} />
            </Box>
          )}
          initialState={{ showColumnFilters: true, density: 'compact' }}
        />
      </LocalizationProvider>
    </>
  );
}
