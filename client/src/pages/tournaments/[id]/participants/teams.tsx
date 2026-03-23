import React, { useState } from "react";
import { Button, Group } from "@mantine/core";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { IconEdit } from "@tabler/icons-react";

import TeamsTable from "../../../../components/tables/teams";
import {
  capitalize,
  getTournamentIdFromRouter,
  responseIsValid,
} from "../../../../components/utils/util";
import { TeamInterface } from "../../../../interfaces/team";
import { getTeams } from "../../../../services/adapter";
import TournamentLayout from "../../_tournament_layout";
import CategoryConfigModal from "../../../../components/modals/category_config_modal";

export default function Teams() {
  const [configOpen, setConfigOpen] = useState(false);

  const { t } = useTranslation();
  const { tournamentData } = getTournamentIdFromRouter();
  const swrTeamsResponse = getTeams(tournamentData.id);

  let teams: TeamInterface[] =
    swrTeamsResponse.data != null ? swrTeamsResponse.data.data.teams : [];

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Group align="center" mb="md">
        {/* left side: two outline buttons, spaced nicely */}
        <Group gap="sm">
          <Button
            leftSection={<IconEdit size={16} />}
            variant="outline"
            onClick={() => setConfigOpen(true)}
          >
            {t("manage_teams_categories", "Manage Teams Categories")}
          </Button>
          <CategoryConfigModal
            tournament_id={tournamentData.id}
            opened={configOpen}
            onClose={() => setConfigOpen(false)}
            onSaved={() => swrTeamsResponse.mutate()}
          />
        </Group>
      </Group>
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
