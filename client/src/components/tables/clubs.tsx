import React, { useState, useMemo } from "react";
import { useTranslation } from "next-i18next";
import { SWRResponse } from "swr";
import {
  MaterialReactTable,
  MaterialReactTableProps,
  type MRT_ColumnDef,
  type MRT_Row,
} from 'material-react-table';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Club } from "../../interfaces/club";
import { deleteClub } from "../../services/club";
import ClubModal from "../modals/club_modal";
import { EmptyTableInfo } from "../no_content/empty_table_info";
import RequestErrorAlert from "../utils/error_alert";
import { TableSkeletonSingleColumn } from "../utils/skeletons";

export default function ClubsTable({
  swrClubsResponse,
}: {
  swrClubsResponse: SWRResponse;
}) {
  const clubs: Club[] =
    swrClubsResponse.data != null ? swrClubsResponse.data.data : [];
  const { t } = useTranslation();

  // column definitions
  const columns = useMemo<MRT_ColumnDef<Club>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('name_header', 'Name'),
      },
      {
        accessorKey: 'abbreviation',
        header: t('abbreviation_header', 'Abbreviation'),
      },
      {
        accessorKey: 'representative',
        header: t('representative_header', 'Representative'),
        Cell: ({ cell }) => cell.getValue<string>() || '—',
      },
      {
        accessorKey: 'contact_email',
        header: t('email_header', 'Contact Email'),
        Cell: ({ cell }) => {
          const email = cell.getValue<string>();
          return email ? <a href={`mailto:${email}`}>{email}</a> : '—';
        },
      },
      {
        accessorKey: 'updated',
        header: t('updated_header', 'Last Updated'),
        Cell: ({ cell }) => (
          <time dateTime={cell.getValue<string>()}>{new Date(cell.getValue<string>()).toLocaleString()}</time>
        ),
      },
    ],
    [t]
  );

  // 4) define create/update/delete handlers
  const handleCreate: MaterialReactTableProps<Club>['onCreatingRowSave'] = async ({ values, table }) => {
    // values is Record<fieldKey, any>
    // await createPlayer(tournamentData.id, { data: values });
    await swrClubsResponse.mutate();
    table.setCreatingRow(null);
  };

  const handleUpdate: MaterialReactTableProps<Club>['onEditingRowSave'] = async ({ values, row, table }) => {
    // await updatePlayer(
    //   tournamentData.id,
    //   row.original.id,
    //   { data: values }
    // );
    await swrClubsResponse.mutate();
    table.setEditingRow(null);
  };

  const handleDelete = (row: MRT_Row<Club>) => {
    if (window.confirm(t('confirm_delete_message', { name: row.original.name }))) {
      deleteClub(row.original.id);
      swrClubsResponse.mutate();
    }
  };

  if (swrClubsResponse.error)
    return <RequestErrorAlert error={swrClubsResponse.error} />;
  if (swrClubsResponse.isLoading) return <TableSkeletonSingleColumn />;
  if (clubs.length === 0)
    return <EmptyTableInfo entity_name={t("clubs_title")} />;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MaterialReactTable<Club>
        columns={columns}
        data={clubs}
        enableColumnOrdering={true}
        enableStickyHeader={true}
        enableEditing
        createDisplayMode="row"
        editDisplayMode="row"
        onCreatingRowSave={handleCreate}
        onEditingRowSave={handleUpdate}
        renderTopToolbarCustomActions={({ table }) => (
          <ClubModal
            club={null}
            swrClubsResponse={swrClubsResponse}
          />
        )}
        renderRowActions={({ row, table }) => (
          <Box sx={{ display: 'flex', gap: '0.5rem' }}>
            <Tooltip title={t('edit_button', 'Edit')}>          
              <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('delete_button', 'Delete')}>          
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
      />
    </LocalizationProvider>
  );
}
