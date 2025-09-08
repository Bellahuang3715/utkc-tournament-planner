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
  Badge,
  Title,
  Divider,
} from "@mantine/core";
import { IconX, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import ExcelJS from "exceljs";

import { getClubs } from "../../services/adapter";
import ClubModal from "./club_modal";
import { Club } from "../../interfaces/club";
import { getPlayerFields } from "../../services/adapter";
import { getTournamentIdFromRouter } from "../utils/util";
import type { FieldInsertable } from "../../interfaces/player_fields";

export interface PlayersUpload {
  file: File;
  clubName: string;
  sheet: string;
  headerRow: number;
  dataRow: number;
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

  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayerFields = getPlayerFields(tournamentData.id);
  const playerFields: FieldInsertable[] = swrPlayerFields.data?.fields ?? [];
  const hasDefinedFields = playerFields.length > 0;

  const expectedHeaders = useMemo(
    () =>
      playerFields
        .filter((f) => f.include)
        .sort((a, b) => a.position - b.position)
        .map((f) => f.label),
    [playerFields]
  );

  // memoize the dropdown data
  const selectData = useMemo(
    () =>
      clubs.map((c) => ({
        value: c.name,
        label: `${c.name} (${c.abbreviation})`,
      })),
    [clubs]
  );

  const [clubName, setClubName] = useState<string | null>(null);
  const [clubFile, setClubFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [dataRow, setDataRow] = useState<number>(1);

  const [currentHeaders, setCurrentHeaders] = useState<string[]>([]);
  const [baselineHeaders, setBaselineHeaders] = useState<string[] | null>(null);

  const [uploads, setUploads] = useState<PlayersUpload[]>([]);
  const [clubModalOpen, setClubModalOpen] = useState(false);

  // helpers -------------------------------------------------------
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const nameCandidates = [
    "name",
    "first name",
    "firstname",
    "last name",
    "lastname",
    "given name",
    "family name",
  ];
  const isNameHeader = (s: string) => nameCandidates.includes(normalize(s));
  const stripNameHeaders = (arr: string[]) =>
    arr.filter((h) => !isNameHeader(h));

  const hasNameHeader = (headers: string[]) => {
    const set = new Set(headers.map(normalize));
    return nameCandidates.some((c) => set.has(c));
  };
  const diffHeaders = (base: string[], cur: string[]) => {
    const b = new Set(base.map(normalize));
    const c = new Set(cur.map(normalize));
    const missing = Array.from(b).filter((x) => !c.has(x));
    const added = Array.from(c).filter((x) => !b.has(x));
    return { missing, added };
  };

  const parseHeaders = (
    wb: ExcelJS.Workbook | null,
    sheet: string,
    rowNum: number
  ): string[] => {
    if (!wb || !sheet || rowNum < 1) return [];
    const ws = wb.getWorksheet(sheet);
    if (!ws) return [];
    const row = ws.getRow(rowNum);
    if (!row) return [];
    const headers: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text = (cell.text ?? String(cell.value ?? "")).toString().trim();
      if (text) headers.push(text);
    });
    return headers;
  };

  // load file -> workbook + sheet names
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clubFile) {
        setWorkbook(null);
        setSheetNames([]);
        setSelectedSheet("");
        setCurrentHeaders([]);
        return;
      }
      const buffer = await clubFile.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      if (cancelled) return;

      setWorkbook(wb);
      const names = wb.worksheets.map((ws) => ws.name);
      setSheetNames(names);
      setSelectedSheet((prev) =>
        prev && names.includes(prev) ? prev : names[0] ?? ""
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [clubFile]);

  // recompute current headers when workbook/sheet/headerRow change
  useEffect(() => {
    setCurrentHeaders(parseHeaders(workbook, selectedSheet, headerRow));
  }, [workbook, selectedSheet, headerRow]);

  const headersOk = useMemo(() => {
    if (!currentHeaders.length) return false;

    // first file: must have a name-ish header
    if (uploads.length === 0) {
      return hasNameHeader(currentHeaders);
    }

    // subsequent files: must match baseline, ignoring name headers
    const base = baselineHeaders ?? [];
    const { missing, added } = diffHeaders(
      stripNameHeaders(base),
      stripNameHeaders(currentHeaders)
    );
    return missing.length === 0 && added.length === 0;
  }, [uploads.length, baselineHeaders, currentHeaders]);

  // UI guards
  const canAdd =
    !!clubFile &&
    !!selectedSheet &&
    headerRow >= 1 &&
    dataRow >= 1 &&
    dataRow >= headerRow + 1 &&
    !!clubName &&
    currentHeaders.length > 0 &&
    headersOk;

  // actions -------------------------------------------------------
  const handleAdd = () => {
    if (!canAdd) return;

    // first file: ensure name-ish header exists
    if (uploads.length === 0) {
      setBaselineHeaders(currentHeaders);
    }

    setUploads((u) => [
      ...u,
      {
        file: clubFile!,
        clubName: clubName!,
        sheet: selectedSheet,
        headerRow,
        dataRow,
      },
    ]);

    // reset inputs for next add
    setClubFile(null);
    setClubName(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaderRow(1);
    setDataRow(1);
    setWorkbook(null);
    setCurrentHeaders([]);
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
            label={t(
              "select_sheet",
              "Which sheet contains the participants' info?"
            )}
            data={sheetNames.map((n) => ({ value: n, label: n }))}
            required
            placeholder={t("sheet_select_placeholder", "Select a sheet...")}
            value={selectedSheet}
            onChange={(v) => v && setSelectedSheet(v)}
            disabled={!sheetNames.length}
            w="100%"
          />
          <NumberInput
            label={t(
              "header_row",
              "Enter the row that contains the table headers (Ex. Name, Rank, etc.)"
            )}
            required
            value={headerRow}
            onChange={(v) => typeof v === "number" && setHeaderRow(v)}
            disabled={!clubFile}
            allowNegative={false}
            allowDecimal={false}
            w="100%"
          />
          <NumberInput
            label={t("header_row", "Enter the row where player data starts")}
            required
            value={dataRow}
            onChange={(v) => typeof v === "number" && setDataRow(v)}
            disabled={!clubFile}
            allowNegative={false}
            allowDecimal={false}
            placeholder="2"
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
              label={t(
                "club_select",
                "Select the club the participants belong to"
              )}
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

        {/* First-file header preview & confirmation */}
        {!!clubFile && currentHeaders.length > 0 && (
          <Paper withBorder p="sm">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Title order={6}>
                  {t("detected_headers", "Detected headers")}
                </Title>
              </Group>

              {/* Show the detected headers as badges */}
              <Group gap="xs">
                {currentHeaders.map((h, i) => (
                  <Badge key={i} variant="light">
                    {h}
                  </Badge>
                ))}
              </Group>

              {!hasNameHeader(currentHeaders) && (
                <Text c="red" size="sm">
                  {t(
                    "missing_name_header_msg",
                    'You must include at least one Name field (e.g. "Name", "First Name", "Last Name").'
                  )}
                </Text>
              )}

              {/* Guidance depends on whether fields already exist */}
              {!hasDefinedFields ? (
                <Text size="xs" c="dimmed">
                  {t(
                    "headers_template_note",
                    "These headers will be used as the template for all subsequent files."
                  )}
                </Text>
              ) : (
                (() => {
                  // Compare detected vs expected (from existing player fields)
                  const detectedForCompare = stripNameHeaders(currentHeaders);
                  const { missing, added } = diffHeaders(
                    expectedHeaders,
                    detectedForCompare
                  );

                  // If everything matches, show success note
                  if (missing.length === 0 && added.length === 0) {
                    return (
                      <Text size="sm" c="teal">
                        {t(
                          "headers_match_expected",
                          "Detected headers match the expected player fields for this tournament."
                        )}
                      </Text>
                    );
                  }

                  // Otherwise, show a compact diff
                  return (
                    <Stack gap={4}>
                      <Text size="sm" c="red">
                        {t(
                          "headers_mismatch_expected",
                          "Headers don’t match the expected player fields for this tournament."
                        )}
                      </Text>
                      {missing.length > 0 && (
                        <Text size="xs">
                          <strong>
                            {t("missing_headers", "Missing headers:")}
                          </strong>{" "}
                          {missing.join(", ")}
                        </Text>
                      )}
                      {added.length > 0 && (
                        <Text size="xs">
                          <strong>
                            {t("new_headers", "Contains new headers:")}
                          </strong>{" "}
                          {added.join(", ")}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {t(
                          "expected_headers_hint",
                          "Expected headers are derived from the tournament’s player fields."
                        )}
                      </Text>
                    </Stack>
                  );
                })()
              )}
            </Stack>
          </Paper>
        )}

        {uploads.length > 0 && <Divider my="md" />}

        {/* 4) Preview List */}
        {uploads.length > 0 && (
          <Stack gap="sm">
            {uploads.map((u, idx) => (
              <Paper key={idx} withBorder p="sm">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={2}>
                    <Text size="sm">
                      <strong>{u.clubName}</strong> — {u.file.name}
                    </Text>
                    {/* <Text size="xs" c="dimmed">
                      {t("x players")}
                    </Text> */}
                  </Stack>
                  <ActionIcon
                    onClick={() =>
                      setUploads((list) => list.filter((_, i) => i !== idx))
                    }
                    aria-label={t("remove", "Remove")}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
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
