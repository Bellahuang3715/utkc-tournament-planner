import React, { useMemo } from "react";
import {
  Badge,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Title,
  Text,
} from "@mantine/core";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";

import TournamentLayout from "../../_tournament_layout";
import { getTournamentIdFromRouter } from "../../../../components/utils/util";
import RequestErrorAlert from "../../../../components/utils/error_alert";
import { getDivisions } from "../../../../services/adapter";

export default function ScoresPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: tournamentId, tournamentData } = getTournamentIdFromRouter();
  const tournamentIdValid = Number.isFinite(tournamentId);

  const swrDivisions = getDivisions(tournamentIdValid ? tournamentData.id : null);
  const divisions = swrDivisions.data?.data ?? [];

  const divisionOptions = useMemo(
    () =>
      divisions.map((d: any) => ({
        id: d.id as number,
        name: d.name as string,
        prefix: (d as any).prefix as string | null | undefined,
        division_type: d.division_type as string,
        totalPlayers: (d as any).totalPlayers as number | undefined,
      })),
    [divisions],
  );

  if (swrDivisions.error) return <RequestErrorAlert error={swrDivisions.error} />;

  if (!tournamentIdValid || !swrDivisions.data) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 400 }}>
          <Loader />
        </Center>
      </TournamentLayout>
    );
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="md" p="md">
        <Title order={2}>{t("scores_title", "Scores")}</Title>

        {!swrDivisions.data || swrDivisions.isLoading ? (
          <Center style={{ minHeight: 220 }}>
            <Loader />
          </Center>
        ) : divisionOptions.length === 0 ? (
          <Text c="dimmed">{t("no_divisions", "No divisions found.")}</Text>
        ) : (
          <>
            <Text c="dimmed">
              {t(
                "scores_note_blocks",
                "Pick a division to open the fillable scoring editor.",
              )}
            </Text>
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing="md"
              breakpoints={[
                { maxWidth: 36, cols: 1, spacing: "sm" },
              ]}
            >
              {divisionOptions.map((d) => {
                const subtitle =
                  typeof d.totalPlayers === "number"
                    ? `${d.totalPlayers} ${t("players", "players")}`
                    : d.prefix
                      ? `Prefix: ${d.prefix}`
                      : undefined;

                return (
                  <Card
                    key={d.id}
                    withBorder
                    radius="md"
                    p="md"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      router.push(`/tournaments/${tournamentData.id}/scores/${d.id}`)
                    }
                  >
                    <Group position="apart">
                      <Stack spacing={2}>
                        <Text weight={600}>{d.name}</Text>
                        {subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}
                      </Stack>
                      <Badge color={d.division_type === "TEAMS" ? "blue" : "violet"} variant="light">
                        {d.division_type === "TEAMS" ? t("teams", "Teams") : t("individuals", "Individuals")}
                      </Badge>
                    </Group>
                  </Card>
                );
              })}
            </SimpleGrid>
          </>
        )}
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});

