import React, { useState, useEffect } from "react";
import { Button, Group } from "@mantine/core";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { IconUpload, IconEdit } from "@tabler/icons-react";
import ExcelJS from "exceljs";

import PlayersTable from "../../../../components/tables/players";
import {
  capitalize,
  getTournamentIdFromRouter,
} from "../../../../components/utils/util";
import { getPlayers, getPlayerFields } from "../../../../services/adapter";
import TournamentLayout from "../../_tournament_layout";
import TemplateConfigModal, {
  TemplateConfig,
} from "../../../../components/modals/template_config_modal";
import ClubImportModal, {
  ClubUpload,
} from "../../../../components/modals/excel_create_modal";
import {
  FieldInsertable,
  PlayerFieldTypes,
} from "../../../../interfaces/player_fields";
import { updatePlayerFields } from "../../../../services/player_fields";
import { createPlayer } from "../../../../services/player";

export default function Players() {
  // state for modal & uploading
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isClubImportOpen, setClubImportOpen] = useState(false);

  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayersResponse = getPlayers(tournamentData.id);
  console.log("players", swrPlayersResponse);

  const swrPlayerFieldsResponse = getPlayerFields(tournamentData.id);
  const { t } = useTranslation();

  // const [fields, setFields] = useState<FieldInsertable[]>([]);

  // 1) Save template‐schema, then jump to club‐upload phase
  const handleTemplateSave = (config: TemplateConfig) => {
    setTemplateModalOpen(false);
    setClubImportOpen(true);
  };

  // 2) Import all club sheets
  const handleImportAll = async (uploads: ClubUpload[]) => {
    if (uploads.length === 0) return;
    console.log("uploads", uploads);

    // One‑time schema upload from the first sheet
    const { file: tmplFile, sheet: tmplSheet, headerRow: tmplHeader } = uploads[0];
    const tmplWb = new ExcelJS.Workbook();
    await tmplWb.xlsx.load(await tmplFile.arrayBuffer());
    const tmplWs = tmplWb.getWorksheet(tmplSheet);
    if (!tmplWs) return;

    // build an array of { col, headerLabel } for every non-empty cell in headerRow
    const rawHeader = tmplWs.getRow(tmplHeader).values as any[];
    const headerMap: { col: number; header: string }[] = [];
    for (let col = 1; col < rawHeader.length; col++) {
      const val = rawHeader[col];
      if (val != null && String(val).trim() !== '') {
        headerMap.push({ col, header: String(val).trim() });
      }
    }

    // One-time: push that schema into players_field
    const fields: FieldInsertable[] = headerMap.map((h, i) => ({
      key:    h.header.toLowerCase().replace(/\s+/g, '_'),
      label:  h.header,
      include:true,
      type:   'TEXT' as PlayerFieldTypes,
      options:[],
      position:i,
    }));
    console.log("fields", fields);
    // push schema to players_field
    // await updatePlayerFields(tournamentData.id, fields);

    // Now import every upload
    for (const { file, clubName, sheet, headerRow } of uploads) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.getWorksheet(sheet);
      if (!ws) continue;

      // for each row *after* headerRow
      for (let r = headerRow + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        // build a raw map header→value, pulling out .result if it's a formula
        const rowData: Record<string, any> = {};
        headerMap.forEach(({ col, header }) => {
          const raw = row.getCell(col).value;
          let val: any;
          if (
            raw != null &&
            typeof raw === "object" &&
            "result" in raw
          ) {
            val = raw.result;
          } else {
            val = raw;
          }
          rowData[header] = val ?? null;
        });

        const nameValue = rowData['Name'] ?? rowData['name'];
        if (!nameValue || String(nameValue).trim() === '') {
          // no name → stop at this row
          break;
        }

        const body = {
          name: String(nameValue),
          club: clubName,
          data: rowData,
        };

        console.log('posting player:', body);
        // await createPlayer(tournamentData.id, body);
      }
    }

    // refresh table
    await swrPlayersResponse.mutate();
    setClubImportOpen(false);
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
            {t("configure_template", "Configure Template")}
          </Button>
          <Button
            leftSection={<IconUpload size={16} />}
            variant="outline"
            onClick={() => setClubImportOpen(true)}
          >
            {t("import_sheet", "Import Filled Sheet")}
          </Button>
          {/* 1) Define your template once */}
          <TemplateConfigModal
            tournament_id={tournamentData.id}
            opened={isTemplateModalOpen}
            onClose={() => setTemplateModalOpen(false)}
            onSave={handleTemplateSave}
          />

          {/* 2) Then batch‐upload club sheets */}
          <ClubImportModal
            opened={isClubImportOpen}
            onClose={() => setClubImportOpen(false)}
            onImportAll={handleImportAll}
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
