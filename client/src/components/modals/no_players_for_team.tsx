import { Button, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import { useRouter } from "next/router";

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
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t("cancel_button", "Cancel")}
        </Button>
        <Button
          onClick={() =>
            router.push(`/tournaments/${tournamentId}/participants/players`)
          }
        >
          {t("go_to_players_page", "Go to players page")}
        </Button>
      </Group>
    </Stack>
  );
}
