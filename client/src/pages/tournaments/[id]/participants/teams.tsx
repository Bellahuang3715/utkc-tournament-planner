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
import CategoryConfigModal, {
  Category,
} from "../../../../components/modals/category_config_modal";

export default function Teams() {
  // state for modal & uploading

  // --- local category state: an array of { id, name, color }
  const [categories, setCategories] = useState<Category[]>([]);

  // whether the config modal is open
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
            {t("configure_template", "Configure Template")}
          </Button>
          {/* 1) Define your template once */}
          <CategoryConfigModal
            tournament_id={tournamentData.id}
            opened={configOpen}
            onClose={() => setConfigOpen(false)}
            onSave={(newCats) => {
              setCategories(newCats);
              setConfigOpen(false);
            }}
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
