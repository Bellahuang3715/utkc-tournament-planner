import { Grid } from '@mantine/core';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';

import PlayerCreateModal from '../../../../components/modals/player_create_modal';
import PlayersTable from '../../../../components/tables/players';
import { getTableState, tableStateToPagination } from '../../../../components/tables/table';
import { capitalize, getTournamentIdFromRouter } from '../../../../components/utils/util';
import { getPlayersPaginated, getPlayerFields } from '../../../../services/adapter';
import TournamentLayout from '../../_tournament_layout';

export default function Players() {
  const tableState = getTableState('name');
  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayersResponse = getPlayersPaginated(
    tournamentData.id,
    tableStateToPagination(tableState)
  );
  const swrPlayerFieldsResponse = getPlayerFields(tournamentData.id);
  const { t } = useTranslation();
  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Grid justify="space-between">
        <Grid.Col span="content">
          <PlayerCreateModal
            swrPlayersResponse={swrPlayersResponse}
            tournament_id={tournamentData.id}
          />
        </Grid.Col>
      </Grid>
      <PlayersTable
        swrPlayersResponse={swrPlayersResponse}
        swrPlayerFieldsResponse={swrPlayerFieldsResponse}
        tournamentData={tournamentData}
      />
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ['common'])),
  },
});
