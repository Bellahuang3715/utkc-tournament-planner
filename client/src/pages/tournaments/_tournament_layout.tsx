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

// default headers you want available for editing
const defaultFields: FieldDefinition[] = [
  { key: 'name', label: 'Name', include: true,  type: 'text',     options: [], group: 'Required' },
  { key: 'rank', label: 'Rank', include: true,  type: 'dropdown', options: ['1D','2D','3D','5D','6D'], group: 'Required' },
  // modify this to pull divisions options from DB
  // or indicate no divisions have been defined yet
  { key: 'division', label: 'Division', include: true,  type: 'dropdown', options: ['A','B','C','D','E'], group: 'Common' },
  { key: 'lunch', label: 'Lunch', include: true,  type: 'dropdown', options: ['Regular','Vegetarian'], group: 'Common' },
  { key: 'cost', label: 'Cost', include: true,  type: 'dropdown', options: [], group: 'Common' },
  { key: 'age', label: 'Age', include: true,  type: 'number', options: [], group: 'Others' },
  { key: 'gender', label: 'Gender', include: true,  type: 'dropdown', options: ['Male', 'Female'], group: 'Others' },
  { key: 'bogu', label: 'Bogu', include: true,  type: 'dropdown', options: ['Bogu', 'Non-Bogu'], group: 'Others' },
  { key: 'paid', label: 'Paid', include: true,  type: 'dropdown', options: ['Yes', 'No'], group: 'Others' },
  { key: 'after-party', label: 'After Party', include: true,  type: 'dropdown', options: ['Yes', 'No'], group: 'Others' },
  { key: 'status', label: 'Status', include: true,  type: 'dropdown', options: ['Active', 'Inactive'], group: 'Others' },
  { key: 'notes', label: 'Notes', include: true,  type: 'text', options: [], group: 'Others' },
];

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

  // handler for finished file selection
  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      // TODO: call your upload API, then revalidate SWR for players/teams/judges
      // await uploadExcel(file, tournament_id);
    } finally {
      setUploading(false);
    }
  };

  // handler when template modal saves fields
  const handleTemplateSave = async (fields: FieldDefinition[]) => {
    // TODO: call your API to generate the Excel with `fields` and trigger download
    // await generateTemplateExcel(tournament_id, fields);
    setTemplateModalOpen(false);
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
                leftSection={<IconPlus size={16} />}
                variant="outline"
                onClick={() => setTemplateModalOpen(true)}
              >
                {t('export_template', 'Create Excel Template')}
              </Button>

              <FileButton onChange={handleUpload} accept=".xlsx">
                {(fileProps) => (
                  <Button {...fileProps} leftSection={<IconUpload size={16} />} variant="outline" loading={uploading}>
                    {t('import_sheet', 'Import Filled Sheet')}
                  </Button>
                )}
              </FileButton>
            </Flex>
          </Flex>

          {/* Excel template configuration modal */}
          <ExcelCreateModal
            opened={isTemplateModalOpen}
            onClose={() => setTemplateModalOpen(false)}
            initialFields={defaultFields}
            onSave={handleTemplateSave}
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
