// pages/tournaments/[id]/_tournament_layout.tsx
import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { Badge, Box, Group, Tabs, useMantineTheme } from "@mantine/core";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";

import { TournamentLinks } from "../../components/navbar/_main_links";
import { responseIsValid } from "../../components/utils/util";
import { getTournamentById } from "../../services/adapter";
import { getScorekeeperToken } from "../../utils/scorekeeper_access";

import Layout from "../_layout";

export default function TournamentLayout({
  children,
  tournament_id,
}: {
  children: React.ReactNode;
  tournament_id: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const path = router.asPath.replace(/\/+$/, "");
  const base = `/tournaments/${tournament_id}`;
  const isParticipants = path.startsWith(`${base}/participants`);
  const isScores = path.startsWith(`${base}/scores`);
  const theme = useMantineTheme();

  const tournamentResponse = getTournamentById(tournament_id);
  const tournament = responseIsValid(tournamentResponse)
    ? tournamentResponse.data.data
    : null;

  const roleFromApi = tournament?.my_role as
    | "organizer"
    | "scorekeeper"
    | null
    | undefined;
  const role: "organizer" | "scorekeeper" | null =
    roleFromApi ??
    (getScorekeeperToken(tournament_id) ? "scorekeeper" : null);

  useEffect(() => {
    if (role === "scorekeeper" && !isScores) {
      void router.replace(`${base}/scores`);
    }
  }, [role, isScores, base, router]);

  const breadcrumbs = tournament ? (
    <Group gap="sm">
      <h2>/ {tournament.name}</h2>
      {tournament.status === "archived" ? (
        <Badge color="gray" variant="light">
          {t("archived", "Archived")}
        </Badge>
      ) : null}
    </Group>
  ) : null;

  return (
    <Layout
      additionalNavbarLinks={
        <TournamentLinks tournament_id={tournament_id} role={role} />
      }
      breadcrumbs={breadcrumbs}
    >
      {isParticipants && role !== "scorekeeper" && (
        <Box mb="lg">
          <Tabs
            value={path}
            onChange={(val) => val && router.push(val)}
            variant="outline"
            radius="md"
            styles={{
              list: {
                borderBottom: `2px solid ${theme.colors.gray[2]}`,
              },
              tab: {
                fontSize: theme.fontSizes.md,
                padding: "8px 16px",
                "&[data-active]": {
                  backgroundColor: theme.colors.blue[0],
                  color: theme.colors.blue[7],
                  fontWeight: 600,
                },
              },
            }}
          >
            <Tabs.List grow>
              <Tabs.Tab
                value={`${base}/participants/players`}
                leftSection={<IconUser size={16} stroke={1.5} />}
              >
                {t("players_title")}
              </Tabs.Tab>
              <Tabs.Tab
                value={`${base}/participants/teams`}
                leftSection={<IconUsers size={16} stroke={1.5} />}
              >
                {t("teams_title")}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Box>
      )}

      {role === "scorekeeper" && !isScores ? null : children}
    </Layout>
  );
}
