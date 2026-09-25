import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import React from "react";

import TeamsTable from "../../../../components/tables/teams";
import { getTournamentIdFromRouter } from "../../../../components/utils/util";
import { TeamInterface } from "../../../../interfaces/team";
import { getTeams } from "../../../../services/adapter";
import TournamentLayout from "../../_tournament_layout";

export default function Teams() {
  const { tournamentData } = getTournamentIdFromRouter();
  const swrTeamsResponse = getTeams(tournamentData.id);

  const teams: TeamInterface[] =
    swrTeamsResponse.data != null ? swrTeamsResponse.data.data.teams : [];

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <TeamsTable
        swrTeamsResponse={swrTeamsResponse}
        tournamentData={tournamentData}
        teams={teams}
      />
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
