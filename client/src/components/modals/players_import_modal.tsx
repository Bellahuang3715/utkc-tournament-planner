import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Modal,
} from "@mantine/core";
import { IconX, IconUpload } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { useTranslation } from "next-i18next/pages";
import ExcelJS from "exceljs";

import { getClubs, getPlayerFields, getTeamCategories } from "../../services/adapter";
import ClubModal from "./club_modal";
import { Club } from "../../interfaces/club";
import type { TeamCategoryInterface } from "../../interfaces/team_category";
import { getTournamentIdFromRouter } from "../utils/util";
import type { FieldInsertable } from "../../interfaces/player_fields";
import { createTeam } from "../../services/team";
import { resolveClubIdByName } from "../../utils/clubs";

export interface PlayersUpload {
  file: File;
  clubName: string;
  clubAbbrev: string;
  sheet: string;
  headerRow: number;
  dataRow: number;
  teamCount: number;
  playerCount?: number;
}

interface PlayersImportModalProps {
  onImportAll: (uploads: PlayersUpload[]) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function teamName(abbrev: string, idx: number) {
  const letter = letters[idx] ?? `${idx + 1}`; // after Z -> 27, 28...
  return `${abbrev} ${letter}`;
}

// ExcelJS cell -> displayed text (handles formulas)
const cellText = (c: ExcelJS.Cell) => {
  const v = c.value as any;
  const raw = v && typeof v === "object" && "result" in v ? v.result : v;
  return String(raw ?? "").trim();
};

type NameCols = { name?: number; first?: number; last?: number };

const normalizeHeader = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ");

const detectNameCols = (
  headers: string[],
  headerRowNum: number,
  wb: ExcelJS.Workbook | null,
  sheet: string,
): NameCols => {
  if (!wb) return {};
  const ws = wb.getWorksheet(sheet);
  if (!ws) return {};

  // map normalized header -> col index by reading actual header row cells
  const row = ws.getRow(headerRowNum);
  const headerToCol: Record<string, number> = {};
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const h = cellText(cell as any);
    if (h) headerToCol[normalizeHeader(h)] = colNumber;
  });

  // Try single Name first
  const nameCol = headerToCol["name"];
  if (nameCol) return { name: nameCol };

  // Else First + Last variants
  const firstCol =
    headerToCol["first name"] ??
    headerToCol["firstname"] ??
    headerToCol["given name"];
  const lastCol =
    headerToCol["last name"] ??
    headerToCol["lastname"] ??
    headerToCol["family name"];

  return { first: firstCol, last: lastCol };
};

const countPlayersUntilEmptyName = (
  wb: ExcelJS.Workbook | null,
  sheet: string,
  headerRowNum: number,
  dataRowNum: number,
): number | null => {
  if (!wb || !sheet || headerRowNum < 1 || dataRowNum < 1) return null;
  const ws = wb.getWorksheet(sheet);
  if (!ws) return null;

  const nameCols = detectNameCols([], headerRowNum, wb, sheet);
  if (!nameCols.name && !nameCols.first && !nameCols.last) {
    // no detectable name columns -> can't count reliably
    return null;
  }

  let count = 0;

  for (let r = dataRowNum; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    let nameValue = "";
    if (nameCols.name) {
      nameValue = cellText(row.getCell(nameCols.name));
    } else {
      const first = nameCols.first ? cellText(row.getCell(nameCols.first)) : "";
      const last = nameCols.last ? cellText(row.getCell(nameCols.last)) : "";
      nameValue = [first, last].filter(Boolean).join(" ").trim();
    }

    if (!nameValue) break; // ✅ stop at first empty name

    count++;
  }

  return count;
};

export default function PlayersImportModal({
  onImportAll,
  onDirtyChange,
}: PlayersImportModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];
  const isLoadingClubs = swrClubs.isLoading;
  const isErrorClubs = !!swrClubs.error;

  const { tournamentData } = getTournamentIdFromRouter();
  const swrCats = getTeamCategories(tournamentData.id);
  const swrPlayerFields = getPlayerFields(tournamentData.id);
  const playerFields: FieldInsertable[] = swrPlayerFields.data?.fields ?? [];
  const hasDefinedFields = playerFields.length > 0;

  const expectedHeaders = useMemo(
    () =>
      playerFields
        .filter((f) => f.include)
        .sort((a, b) => a.position - b.position)
        .map((f) => f.label),
    [playerFields],
  );

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
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [dataRow, setDataRow] = useState<number>(1);

  const [currentHeaders, setCurrentHeaders] = useState<string[]>([]);
  const [baselineHeaders, setBaselineHeaders] = useState<string[] | null>(null);

  const [uploads, setUploads] = useState<PlayersUpload[]>([]);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [teamCount, setTeamCount] = useState<number | "">("");
  const [detectedPlayers, setDetectedPlayers] = useState<number | null>(null);
  const [duplicateFile, setDuplicateFile] = useState<File | null>(null);
  const [duplicateKind, setDuplicateKind] = useState<"added" | "imported" | null>(
    null,
  );

  useEffect(() => {
    const dirty =
      uploads.length > 0 ||
      clubFile != null ||
      clubName != null ||
      teamCount !== "" ||
      headerRow !== 1 ||
      dataRow !== 1;
    onDirtyChange?.(dirty);
  }, [
    uploads.length,
    clubFile,
    clubName,
    teamCount,
    headerRow,
    dataRow,
    onDirtyChange,
  ]);
  const fileResetRef = useRef<() => void>(null);
  const preferredSheetRef = useRef("");

  const importedFilesKey = `imported_player_excels:${tournamentData.id}`;

  const normalizeFileName = (name: string) => name.trim().toLowerCase();

  const readImportedFileNames = () => {
    try {
      const raw = localStorage.getItem(importedFilesKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((name) => String(name)) : [];
    } catch {
      return [];
    }
  };

  const rememberImportedFileNames = (names: string[]) => {
    const existing = new Set(readImportedFileNames());
    names.forEach((name) => existing.add(normalizeFileName(name)));
    localStorage.setItem(importedFilesKey, JSON.stringify([...existing]));
  };

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
  const clubCandidates = ["club", "club name", "clubname"];
  const isNameHeader = (s: string) => nameCandidates.includes(normalize(s));
  const isClubHeader = (s: string) => clubCandidates.includes(normalize(s));
  // Name and club are fixed columns, so they are not part of the field match.
  const stripFixedHeaders = (arr: string[]) =>
    arr.filter((h) => !isNameHeader(h) && !isClubHeader(h));

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

  const clubByName = useMemo(() => {
    const m = new Map<string, Club>();
    clubs.forEach((c) => m.set(c.name, c));
    return m;
  }, [clubs]);

  const parseHeaders = (
    wb: ExcelJS.Workbook | null,
    sheet: string,
    rowNum: number,
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
        setDetectedPlayers(null);
        return;
      }
      const buffer = await clubFile.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      if (cancelled) return;

      setWorkbook(wb);
      const names = wb.worksheets.map((ws) => ws.name);
      setSheetNames(names);
      const preferred = preferredSheetRef.current;
      setSelectedSheet(
        preferred && names.includes(preferred) ? preferred : (names[0] ?? ""),
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
    if (!hasNameHeader(currentHeaders)) return false;

    // Existing columns must match. There is no override that writes a new schema.
    if (hasDefinedFields) {
      const { missing, added } = diffHeaders(
        stripFixedHeaders(expectedHeaders),
        stripFixedHeaders(currentHeaders),
      );
      return missing.length === 0 && added.length === 0;
    }

    // First file in an empty tournament defines the columns.
    if (uploads.length === 0) return true;

    const base = baselineHeaders ?? [];
    const { missing, added } = diffHeaders(
      stripFixedHeaders(base),
      stripFixedHeaders(currentHeaders),
    );
    return missing.length === 0 && added.length === 0;
  }, [
    currentHeaders,
    hasDefinedFields,
    expectedHeaders,
    uploads.length,
    baselineHeaders,
  ]);

  useEffect(() => {
    if (!workbook || !selectedSheet || headerRow < 1 || dataRow < 1) {
      setDetectedPlayers(null);
      return;
    }
    setDetectedPlayers(
      countPlayersUntilEmptyName(workbook, selectedSheet, headerRow, dataRow),
    );
  }, [workbook, selectedSheet, headerRow, dataRow]);
  const selectedClub = clubName ? clubByName.get(clubName) : null;

  // UI guards
  const canAdd =
    !!clubFile &&
    !!selectedSheet &&
    headerRow >= 1 &&
    dataRow >= 1 &&
    dataRow >= headerRow + 1 &&
    !!clubName &&
    !!selectedClub?.abbreviation &&
    typeof teamCount === "number" &&
    teamCount >= 0 &&
    currentHeaders.length > 0 &&
    headersOk;

  // actions -------------------------------------------------------
  const handleAdd = () => {
    if (!canAdd) return;

    // first file: ensure name-ish header exists
    if (uploads.length === 0) {
      setBaselineHeaders(currentHeaders);
    }

    const selectedClub = clubByName.get(clubName!);
    const abbrev = selectedClub?.abbreviation?.trim();
    if (!abbrev || typeof teamCount !== "number") return;

    setUploads((u) => [
      ...u,
      {
        file: clubFile!,
        clubName: clubName!,
        clubAbbrev: abbrev,
        sheet: selectedSheet,
        headerRow,
        dataRow,
        teamCount,
        playerCount: detectedPlayers ?? undefined,
      },
    ]);

    // Keep sheet, header row, and data row for the next club.
    preferredSheetRef.current = selectedSheet;
    setClubFile(null);
    setClubName(null);
    setTeamCount("");
    setSheetNames([]);
    setWorkbook(null);
    setCurrentHeaders([]);
    setDetectedPlayers(null);
  };

  const handleFileSelected = (file: File | null) => {
    fileResetRef.current?.();
    if (!file) return;

    const key = normalizeFileName(file.name);
    const alreadyAdded = uploads.some(
      (upload) => normalizeFileName(upload.file.name) === key,
    );
    const alreadyImported = readImportedFileNames().includes(key);
    if (alreadyAdded || alreadyImported) {
      setDuplicateKind(alreadyAdded ? "added" : "imported");
      setDuplicateFile(file);
      return;
    }
    setClubFile(file);
  };

  return (
    <>
      <Modal
        opened={duplicateFile != null}
        onClose={() => {
          setDuplicateFile(null);
          setDuplicateKind(null);
        }}
        title={t("duplicate_excel_title", "Same file name detected")}
        centered
        size="sm"
      >
        <Stack gap="lg">
          <Text size="sm" lh={1.6}>
            {duplicateKind === "added"
              ? t(
                  "duplicate_excel_added",
                  "A file with the same name is already in this import.",
                )
              : t(
                  "duplicate_excel_imported",
                  "A file with the same name has already been imported for this tournament.",
                )}
          </Text>
          <Paper withBorder radius="md" p="sm">
            <Text size="sm" fw={600} lh={1.5} style={{ wordBreak: "break-word" }}>
              {duplicateFile?.name}
            </Text>
          </Paper>
          <Text size="sm" lh={1.6}>
            {t("duplicate_excel_continue", "Continue anyway?")}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                setDuplicateFile(null);
                setDuplicateKind(null);
              }}
            >
              {t("cancel_button", "Cancel")}
            </Button>
            <Button
              color="orange"
              onClick={() => {
                if (duplicateFile) setClubFile(duplicateFile);
                setDuplicateFile(null);
                setDuplicateKind(null);
              }}
            >
              {t("continue_button", "Continue")}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <ClubModal
        club={null}
        swrClubsResponse={swrClubs}
        opened={clubModalOpen}
        setOpened={setClubModalOpen}
      />
      <Stack gap="md" p="md">
        {/* 1) File Upload */}
        <FileButton
          resetRef={fileResetRef}
          onChange={handleFileSelected}
          accept=".xlsx"
        >
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
              "Which sheet contains the participants' info?",
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
              "Enter the row that contains the table headers (Ex. Name, Rank, etc.)",
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
                "Select the club the participants belong to",
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
                "Select club (or add new if not listed)",
              )}
              searchable
              nothingFoundMessage={t("no_clubs_found", "No clubs found")}
              value={clubName}
              onChange={(val) => {
                if (val === "__add__") setClubModalOpen(true);
                else {
                  setClubName(val);
                }
              }}
              w="100%"
            />
          )}

          <NumberInput
            label={t("team_count", "How many teams is this club sending?")}
            required
            value={teamCount}
            onChange={(v) => {
              if (v === "" || v == null) {
                setTeamCount("");
                return;
              }
              if (typeof v === "number") setTeamCount(Math.max(0, v));
            }}
            disabled={!clubName}
            allowNegative={false}
            allowDecimal={false}
            min={0}
            placeholder={t("team_count_placeholder", "Enter a number")}
            w="100%"
          />

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
                {dataRow >= 1 && detectedPlayers !== null && (
                  <Badge
                    variant="light"
                    color={detectedPlayers === 0 ? "red" : "green"}
                  >
                    {t("detected_players", "Detected players")}:{" "}
                    {detectedPlayers}
                  </Badge>
                )}
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
                    'You must include at least one Name field (e.g. "Name", "First Name", "Last Name").',
                  )}
                </Text>
              )}

              {/* Guidance depends on whether fields already exist */}
              {!hasDefinedFields ? (
                <Text size="xs" c="dimmed">
                  {t(
                    "headers_template_note",
                    "These headers will be used as the template for all subsequent files.",
                  )}
                </Text>
              ) : (
                (() => {
                  // Compare detected vs expected (from existing player fields)
                  const { missing, added } = diffHeaders(
                    stripFixedHeaders(expectedHeaders),
                    stripFixedHeaders(currentHeaders),
                  );

                  // If everything matches, show success note
                  if (missing.length === 0 && added.length === 0) {
                    return (
                      <Text size="sm" c="teal">
                        {t(
                          "headers_match_expected",
                          "Detected headers match the expected player fields for this tournament.",
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
                          "Headers don’t match the expected player fields for this tournament.",
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
                          "Expected headers come from this tournament’s player fields. This file stays blocked until they match. Change the fields while there are no players, or fix the spreadsheet.",
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
                    <Text size="xs" c="dimmed">
                      {t("players_count_label", "Players")}:{" "}
                      {u.playerCount ?? "—"} | {t("teams_count_label", "Teams")}
                      : {u.teamCount}
                    </Text>
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
          onClick={async () => {
            const cats = swrCats.data?.data ?? [];
            const defaultCatId =
              cats.find(
                (c: TeamCategoryInterface) =>
                  c.name.toLowerCase() === "mixed",
              )?.id ?? cats[0]?.id;
            if (defaultCatId == null) {
              showNotification({
                color: "red",
                title: t("error", "Error"),
                message: t(
                  "team_categories_required",
                  "Add team categories for this tournament first.",
                ),
              });
              return;
            }
            const imported = await onImportAll(uploads);
            if (!imported) return;

            for (const u of uploads) {
              const clubName = u.clubName || u.clubAbbrev || "";
              for (let i = 0; i < u.teamCount; i++) {
                const name = teamName(u.clubAbbrev, i);
                await createTeam(
                  tournamentData.id,
                  name,
                  [],
                  [resolveClubIdByName(clubs, clubName, 2)],
                  defaultCatId,
                );
              }
            }

            rememberImportedFileNames(uploads.map((upload) => upload.file.name));
          }}
        >
          {t("import_all", "Import All Clubs")}
        </Button>
      </Stack>
    </>
  );
}
