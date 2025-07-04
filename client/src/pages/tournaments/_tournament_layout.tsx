// pages/tournaments/[id]/_tournament_layout.tsx
import React from "react";
import { useRouter } from "next/router";
import { Box, Tabs, useMantineTheme } from "@mantine/core";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";

import { TournamentLinks } from "../../components/navbar/_main_links";
import { responseIsValid } from "../../components/utils/util";
import { getTournamentById } from "../../services/adapter";

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
  const theme = useMantineTheme();

  const tournamentResponse = getTournamentById(tournament_id);
  const breadcrumbs = responseIsValid(tournamentResponse) ? (
    <h2>/ {tournamentResponse.data.data.name}</h2>
  ) : null;

  return (
    <Layout
      additionalNavbarLinks={<TournamentLinks tournament_id={tournament_id} />}
      breadcrumbs={breadcrumbs}
    >
      {isParticipants && (
        <Box mb="lg">
          {/* 3. Tabs—with pills, bigger font, colored underline */}
          <Tabs
            value={path}
            onChange={(val) => val && router.push(val)}
            variant="outline"
            radius="md"
            styles={{
              /* border under the row of tabs */
              list: {
                borderBottom: `2px solid ${theme.colors.gray[2]}`,
              },
              /* style every tab, including its active state */
              tab: {
                fontSize: theme.fontSizes.md,
                padding: "8px 16px",
                /* target active tab */
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

      {children}
    </Layout>
  );
}
