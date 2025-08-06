import React, { useState } from "react";
import { Button, Group } from "@mantine/core";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { IconEdit } from "@tabler/icons-react";

import PlayersTable from "../../../../components/tables/players";
import {
  capitalize,
  getTournamentIdFromRouter,
} from "../../../../components/utils/util";
import { getPlayers, getPlayerFields } from "../../../../services/adapter";
import TournamentLayout from "../../_tournament_layout";
import PlayerFieldsConfigModal, {
  PlayerFieldsConfig,
} from "../../../../components/modals/player_fields_config_modal";

export default function Players() {
  // state for modal & uploading
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);

  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayersResponse = getPlayers(tournamentData.id);
  console.log("players", swrPlayersResponse);

  const swrPlayerFieldsResponse = getPlayerFields(tournamentData.id);
  const { t } = useTranslation();

  // save template‐schema, then jump to club‐upload phase
  const handleTemplateSave = (config: PlayerFieldsConfig) => {
    setTemplateModalOpen(false);
  };


  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Group align="center" mb="md">
        {/* left side: two outline buttons, spaced nicely */}
        <Group gap="sm">
          <Button
            leftSection={<IconEdit size={16} />}
            variant="outline"
            onClick={() => setTemplateModalOpen(true)}
          >
            {t("configure_template", "Manage Player Fields")}
          </Button>
          {/* 1) Define your template once */}
          <PlayerFieldsConfigModal
            tournament_id={tournamentData.id}
            opened={isTemplateModalOpen}
            onClose={() => setTemplateModalOpen(false)}
            onSave={handleTemplateSave}
          />
        </Group>
      </Group>
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
