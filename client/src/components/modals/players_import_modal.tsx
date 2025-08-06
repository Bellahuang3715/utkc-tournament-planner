import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  FileButton,
  Select,
  Group,
  Text,
  ActionIcon,
  Paper,
  Stack,
  useMantineTheme,
  Loader,
  NumberInput,
} from "@mantine/core";
import { IconX, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import ExcelJS from "exceljs";

import { getClubs } from "../../services/adapter";
import ClubModal from "./club_modal";
import { Club } from "../../interfaces/club";

export interface PlayersUpload {
  file: File;
  clubName: string;
  sheet: string;
  headerRow: number;
}

interface PlayersImportModalProps {
  onImportAll: (uploads: PlayersUpload[]) => void;
}

export default function PlayersImportModal({
  onImportAll,
}: PlayersImportModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];
  const isLoadingClubs = swrClubs.isLoading;
  const isErrorClubs = !!swrClubs.error;

  // memoize the dropdown data
  const selectData = useMemo(
    () =>
      clubs.map((c) => ({
        value: c.name,
        label: `${c.name} (${c.abbreviation})`,
      })),
    [clubs],
  );

  const [clubName, setClubName] = useState<string | null>(null);
  const [clubFile, setClubFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [uploads, setUploads] = useState<PlayersUpload[]>([]);
  const [clubModalOpen, setClubModalOpen] = useState(false);

  // scan file for sheet names
  useEffect(() => {
    if (!clubFile) {
      setSheetNames([]);
      setSelectedSheet("");
      return;
    }
    (async () => {
      const buffer = await clubFile.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const names = wb.worksheets.map((ws) => ws.name);
      setSheetNames(names);
      if (!selectedSheet && names.length > 0) {
        setSelectedSheet(names[0]);
      }
    })();
  }, [clubFile]);

  const canAdd = !!clubFile && !!selectedSheet && headerRow >= 1 && !!clubName;

  const handleAdd = () => {
    if (!canAdd) return;
    setUploads((u) => [
      ...u,
      {
        file: clubFile!,
        clubName: clubName!,
        sheet: selectedSheet,
        headerRow,
      },
    ]);
    setClubFile(null);
    setClubName(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaderRow(1);
  };

  return (
    <>
      <ClubModal
        club={null}
        swrClubsResponse={swrClubs}
        opened={clubModalOpen}
        setOpened={setClubModalOpen}
      />
        <Stack gap="md" p="md">
          {/* 1) File Upload */}
          <FileButton onChange={setClubFile} accept=".xlsx">
            {(props) => (
              <Button
                {...props}
                variant="outline"
                leftSection={<IconUpload size={16} />}
                fullWidth
              >
                {clubFile
                  ? clubFile.name
                  : t("upload_club_file", "Upload .xlsx file")}
              </Button>
            )}
          </FileButton>

          <Group gap="sm" align="flex-end">
            {/* 2) Sheet & Header Row */}
            <Select
              label={t("select_sheet", "Which sheet contains the participants' info?")}
              data={sheetNames.map((n) => ({ value: n, label: n }))}
              required
              placeholder={t(
                "sheet_select_placeholder",
                "Select a sheet..."
              )}
              value={selectedSheet}
              onChange={(v) => v && setSelectedSheet(v)}
              disabled={!sheetNames.length}
              w="100%"
            />
            <NumberInput
              label={t("header_row", "Enter the row that contains the table headers (Ex. Name, Rank, etc.)")}
              min={1}
              required
              value={headerRow}
              onChange={(v) => typeof v === "number" && setHeaderRow(v)}
              disabled={!clubFile}
              w="100%"
            />
            {/* 3) Club Select & Add */}
            {isLoadingClubs ? (
              <Loader size="sm" />
            ) : isErrorClubs ? (
              <Text color="red" size="sm">
                {t("failed_load_clubs", "Failed to load clubs")}
              </Text>
            ) : (
              <Select
                label={t("club_select", "Select the club the participants belong to")}
                data={[
                  ...selectData,
                  {
                    value: "__add__",
                    label: `+ ${t("add_new_club", "Add new club…")}`,
                  },
                ]}
                required
                placeholder={t(
                  "club_select_pla",
                  "Select club (or add new if not listed)"
                )}
                searchable
                nothingFoundMessage={t("no_clubs_found", "No clubs found")}
                value={clubName}
                onChange={(val) => {
                  if (val === "__add__") setClubModalOpen(true);
                  else setClubName(val);
                }}
                w="100%"
              />
            )}
            <Button onClick={handleAdd} disabled={!canAdd}>
              {t("add_club", "Add")}
            </Button>
          </Group>

          {/* 4) Preview List */}
          {uploads.length > 0 && (
            <Paper withBorder p="sm">
              <Stack gap="xs">
                {uploads.map((u, idx) => (
                  <Group key={idx} justify="space-between">
                    <div>
                      <Text size="sm">
                        <strong>{u.clubName}</strong> — {u.file.name}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {t("sheet")}: {u.sheet} | {t("header_row")}:{" "}
                        {u.headerRow}
                      </Text>
                    </div>
                    <ActionIcon
                      onClick={() =>
                        setUploads((list) => list.filter((_, i) => i !== idx))
                      }
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}

          {/* 5) Final Import */}
          <Button
            fullWidth
            color="green"
            disabled={uploads.length === 0}
            onClick={() => onImportAll(uploads)}
          >
            {t("import_all", "Import All Clubs")}
          </Button>
        </Stack>
    </>
  );
}
