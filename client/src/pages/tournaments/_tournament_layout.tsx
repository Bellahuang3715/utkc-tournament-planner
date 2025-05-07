// pages/tournaments/[id]/_tournament_layout.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  Title,
  Text,
  Button,
  FileButton,
  Tabs,
  useMantineTheme,
} from '@mantine/core';
import { IconUpload, IconPlus, IconUser, IconUsers, IconGavel } from '@tabler/icons-react';
import { useTranslation } from "next-i18next";

import { TournamentLinks } from "../../components/navbar/_main_links";
import { responseIsValid } from "../../components/utils/util";
import { getTournamentById } from "../../services/adapter";
import ExcelCreateModal, { FieldDefinition } from "../../components/modals/excel_create_modal";
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

  // state for modal & uploading
  const [uploading, setUploading] = useState(false);
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);

  // handler once the user has imported and configured their sheet
  const handleImport = async (payload: {
    file: File;
    clubName: string;
    clubAbbr: string;
    selectedSheet: string;
    fields: FieldDefinition[];
  }) => {
    // TODO: call your import API with payload, then revalidate SWR
    setImportModalOpen(false);
  };

  return (
    <Layout
      additionalNavbarLinks={<TournamentLinks tournament_id={tournament_id} />}
      breadcrumbs={breadcrumbs}
    >
      {isParticipants && (
        <Box mb="lg">
          <Text color="dimmed" size="sm" mb="md">
            {t(
              'participants_description',
              'Generate or import your Players, Teams, and Judges data here.'
            )}
          </Text>

          {/* 2. Action buttons */}
          <Flex justify="space-between" mb="md" align="center">
            <Flex gap="sm">
              <Button
                leftSection={<IconUpload size={16} />}
                variant="outline"
                onClick={() => setImportModalOpen(true)}
              >
                {t('import_sheet', 'Import Filled Sheet')}
              </Button>
            </Flex>
          </Flex>

          {/* Excel template configuration modal */}
          <ExcelCreateModal
            opened={isImportModalOpen}
            onClose={() => setImportModalOpen(false)}
            onImport={handleImport}
          />

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
                padding: '8px 16px',
                /* target active tab */
                '&[data-active]': {
                  backgroundColor: theme.colors.blue[0],
                  color: theme.colors.blue[7],
                  fontWeight: 600,
                },
              },
            }}
          >
            <Tabs.List grow>
              <Tabs.Tab value={`${base}/participants/players`} leftSection={<IconUser size={16} stroke={1.5} />}>
                {t('players_title')}
              </Tabs.Tab>
              <Tabs.Tab value={`${base}/participants/teams`} leftSection={<IconUsers size={16} stroke={1.5} />}>
                {t('teams_title')}
              </Tabs.Tab>
              <Tabs.Tab value={`${base}/participants/judges`} leftSection={<IconGavel size={16} stroke={1.5} />}>
                {t('judges_title')}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Box>
      )}

      {children}
    </Layout>
  );
}
