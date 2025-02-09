import { Group, Stack } from '@mantine/core';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import React from 'react';

// import Builder from '../../../../components/builder/builder';
// import { CreateStageButtonLarge } from '../../../../components/buttons/create_stage';
// import ActivateNextStageModal from '../../../../components/modals/activate_next_stage_modal';
// import ActivatePreviousStageModal from '../../../../components/modals/activate_previous_stage_modal';
import { NoContent } from '../../../../components/no_content/empty_table_info';
import { TableSkeletonTwoColumnsSmall } from '../../../../components/utils/skeletons';
import { getTournamentIdFromRouter } from '../../../../components/utils/util';
import { Ranking } from '../../../../interfaces/ranking';
// import { StageWithStageItems } from '../../../../interfaces/stage';
import {
  getAvailableStageItemInputs,
  getRankings,
  getRankingsPerStageItem,
  getStages,
  getTournamentById,
} from '../../../../services/adapter';
import TournamentLayout from '../../_tournament_layout';

export default function StagesPage() {
  const { t } = useTranslation();
  const { tournamentData } = getTournamentIdFromRouter();
  const swrStagesResponse = getStages(tournamentData.id);
  const swrRankingsResponse = getRankings(tournamentData.id);
  const swrTournamentResponse = getTournamentById(tournamentData.id);
  const swrAvailableInputsResponse = getAvailableStageItemInputs(tournamentData.id);
  const swrRankingsPerStageItemResponse = getRankingsPerStageItem(tournamentData.id);
  const tournamentDataFull =
    swrTournamentResponse.data != null ? swrTournamentResponse.data.data : null;
  const rankings: Ranking[] = swrRankingsResponse.data != null ? swrRankingsResponse.data.data : [];

//   const stages: StageWithStageItems[] =
//     swrStagesResponse.data != null ? swrStagesResponse.data.data : [];

  let content;


  return <TournamentLayout tournament_id={tournamentData.id}>{content}</TournamentLayout>;
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ['common'])),
  },
});
