import { Stack, Text } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import { useRouter } from "next/router";
import ModalFooter from "./modal_footer";

export default function NoPlayersForTeam({
  tournamentId,
  onClose,
}: {
  tournamentId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Stack gap="md">
      <Text size="sm">
        {t(
          "no_players_for_team",
          "This tournament has no players yet. Add players before creating a team.",
        )}
      </Text>
      <ModalFooter
        onCancel={onClose}
        primaryLabel={t("go_to_players_page", "Go to players page")}
        onPrimary={() =>
          void router.push(`/tournaments/${tournamentId}/participants/players`)
        }
      />
    </Stack>
  );
}
