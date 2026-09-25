import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import React from "react";

import PlayersTable from "../../../../components/tables/players";
import { getTournamentIdFromRouter } from "../../../../components/utils/util";
import { getPlayers, getPlayerFields } from "../../../../services/adapter";
import TournamentLayout from "../../_tournament_layout";

export default function Players() {
  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayersResponse = getPlayers(tournamentData.id);
  const swrPlayerFieldsResponse = getPlayerFields(tournamentData.id);

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
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
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
