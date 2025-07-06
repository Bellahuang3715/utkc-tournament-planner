import React, { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { SWRResponse } from 'swr';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Badge } from '@mantine/core';

import { TeamInterface } from '../../interfaces/team';
import { TournamentMinimal } from '../../interfaces/tournament';
import { deleteTeam } from '../../services/team';
import TeamUpdateModal from '../modals/team_update_modal';
import { NoContent } from '../no_content/empty_table_info';
import RequestErrorAlert from '../utils/error_alert';
import { TableSkeletonSingleColumn } from '../utils/skeletons';

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

  // 1) Column definitions
  const columns = useMemo<MRT_ColumnDef<TeamInterface>[]>(
    () => [
      {
        accessorKey: 'active',
        header: t('status'),
        enableColumnFilter: false,
        Cell: ({ cell }) =>
          cell.getValue<boolean>() ? (
            <Badge color="green">{t('active')}</Badge>
          ) : (
            <Badge color="red">{t('inactive')}</Badge>
          ),
      },
      {
        accessorKey: 'name',
        header: t('name_table_header'),
      },
      {
        accessorKey: 'dojo',
        header: t('members_table_header'),
        enableSorting: false,
      },
      {
        accessorKey: 'created',
        header: t('created'),
        enableColumnFilter: false,
        Cell: ({ cell }) => (
          <time dateTime={cell.getValue<string>()}>
            {new Date(cell.getValue<string>()).toLocaleString()}
          </time>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableColumnFilter: false,
        enableSorting: false,
        enableEditing: false,
        size: 100,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: '0.5rem' }}>
            <Tooltip title={t('edit_team_button', 'Edit')}>
              <div>
                <TeamUpdateModal
                  tournament_id={tournamentData.id}
                  team={row.original}
                  swrTeamsResponse={swrTeamsResponse}
                />
              </div>
            </Tooltip>
            <Tooltip title={t('delete_team_button', 'Delete')}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={async () => {
                    if (
                      window.confirm(
                        t('confirm_delete_team_message', {
                          name: row.original.name,
                        })
                      )
                    ) {
                      await deleteTeam(
                        tournamentData.id,
                        row.original.id
                      );
                      await swrTeamsResponse.mutate();
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [t, tournamentData.id, swrTeamsResponse]
  );

  // 2) Early returns
  if (swrTeamsResponse.error) return <RequestErrorAlert error={swrTeamsResponse.error} />;

  if (swrTeamsResponse.isLoading) {
    return <TableSkeletonSingleColumn />;
  }

  if (teams.length === 0) {
    return <NoContent title={t('no_teams_title')} />;
  }

  // 3) Render MRT
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MaterialReactTable<TeamInterface>
        columns={columns}
        data={teams}
        enableColumnOrdering={false}
        enableColumnPinning
        enableColumnFilters
        enableRowSelection
        enableSorting
        enablePagination
        // muiTablePaginationProps={{
        //   rowsPerPageOptions: [5, 10, 20],
        // }}
        // initialState={{
        //   pagination: { pageSize: 10 }, // default page size
        // }}
      />
    </LocalizationProvider>
  );
}
