import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Button,
  Checkbox,
  FileButton,
  Select,
  Group,
  Text,
  ActionIcon,
  Paper,
  Stack,
  Loader,
  NumberInput,
  Badge,
  Title,
  Divider,
  Modal,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import ExcelJS from "exceljs";

import { getClubs, getPlayerFields } from "../../services/adapter";
import ClubModal from "./club_modal";
import { Club } from "../../interfaces/club";
import { getTournamentIdFromRouter } from "../utils/util";
import type { FieldInsertable } from "../../interfaces/player_fields";
import ModalFooter from "./modal_footer";

export interface PlayersUpload {
  file: File;
  clubName: string;
  sheet: string;
  headerRow: number;
  dataRow: number;
  playerCount?: number;
  /** Headers chosen on first import to define tournament columns. */
  selectedLabels?: string[];
}

interface PlayersImportModalProps {
  onImportAll: (uploads: PlayersUpload[]) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  /** When false, previously imported file names are ignored (e.g. empty roster). */
  hasPlayers?: boolean;
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
  const nameCol =
    headerToCol["name"] ??
    headerToCol["full name"] ??
    headerToCol["fullname"];
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
  hasPlayers = true,
}: PlayersImportModalProps) {
  const { t } = useTranslation();

  const swrClubs = getClubs();
  const clubs: Club[] = swrClubs.data?.data ?? [];
  const isLoadingClubs = swrClubs.isLoading;
  const isErrorClubs = !!swrClubs.error;

  const { tournamentData } = getTournamentIdFromRouter();
  const swrPlayerFields = getPlayerFields(tournamentData.id);
  const playerFields: FieldInsertable[] = swrPlayerFields.data?.fields ?? [];
  const hasDefinedFields = playerFields.length > 0;

  const requiredImportHeaders = useMemo(
    () =>
      playerFields
        .filter((f) => f.import_required !== false)
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
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const [uploads, setUploads] = useState<PlayersUpload[]>([]);
  const [clubModalOpen, setClubModalOpen] = useState(false);
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
      headerRow !== 1 ||
      dataRow !== 1;
    onDirtyChange?.(dirty);
  }, [
    uploads.length,
    clubFile,
    clubName,
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

  // Empty roster: allow re-importing the same filenames without the warning.
  useEffect(() => {
    if (!hasPlayers) localStorage.removeItem(importedFilesKey);
  }, [hasPlayers, importedFilesKey]);

  // helpers -------------------------------------------------------
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const nameCandidates = [
    "name",
    "full name",
    "fullname",
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

  const selectableHeaders = useMemo(
    () => stripFixedHeaders(currentHeaders),
    [currentHeaders],
  );

  // First import: default-select all data columns when headers change.
  useEffect(() => {
    if (hasDefinedFields || uploads.length > 0) return;
    setSelectedLabels(selectableHeaders);
  }, [selectableHeaders, hasDefinedFields, uploads.length]);

  const headersOk = useMemo(() => {
    if (!currentHeaders.length) return false;
    if (!hasNameHeader(currentHeaders)) return false;

    // Later imports: only import-required fields must be present; extras are OK.
    if (hasDefinedFields) {
      const { missing } = diffHeaders(
        stripFixedHeaders(requiredImportHeaders),
        stripFixedHeaders(currentHeaders),
      );
      return missing.length === 0;
    }

    // First file in an empty tournament defines the columns via the picker.
    if (uploads.length === 0) return true;

    // Later files in the same first-import batch must include the chosen columns.
    const base = baselineHeaders ?? [];
    const { missing } = diffHeaders(
      stripFixedHeaders(base),
      stripFixedHeaders(currentHeaders),
    );
    return missing.length === 0;
  }, [
    currentHeaders,
    hasDefinedFields,
    requiredImportHeaders,
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

    const labelsForUpload =
      uploads.length === 0
        ? selectedLabels
        : (baselineHeaders ?? selectedLabels);

    // first file: chosen columns become the batch baseline
    if (uploads.length === 0) {
      setBaselineHeaders(labelsForUpload);
    }

    setUploads((u) => [
      ...u,
      {
        file: clubFile!,
        clubName: clubName!,
        sheet: selectedSheet,
        headerRow,
        dataRow,
        playerCount: detectedPlayers ?? undefined,
        selectedLabels: labelsForUpload,
      },
    ]);

    // Keep sheet, header row, and data row for the next club.
    preferredSheetRef.current = selectedSheet;
    setClubFile(null);
    setClubName(null);
    setSheetNames([]);
    setWorkbook(null);
    setCurrentHeaders([]);
    setSelectedLabels([]);
    setDetectedPlayers(null);
  };

  const handleFileSelected = (file: File | null) => {
    fileResetRef.current?.();
    if (!file) return;

    const key = normalizeFileName(file.name);
    const alreadyAdded = uploads.some(
      (upload) => normalizeFileName(upload.file.name) === key,
    );
    const alreadyImported =
      hasPlayers && readImportedFileNames().includes(key);
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
        closeOnClickOutside={false}
        size="sm"
      >
        <Stack gap="lg">
          <Alert
            variant="light"
            color="orange"
            icon={<IconAlertCircle size={16} />}
          >
            {duplicateKind === "added"
              ? t(
                  "duplicate_excel_added",
                  "A file with the same name is already in this import.",
                )
              : t(
                  "duplicate_excel_imported",
                  "A file with the same name has already been imported for this tournament.",
                )}
          </Alert>
          <Paper withBorder radius="md" p="sm">
            <Text size="sm" fw={600} lh={1.5} style={{ wordBreak: "break-word" }}>
              {duplicateFile?.name}
            </Text>
          </Paper>
          <Text size="sm" lh={1.6}>
            {t("duplicate_excel_continue", "Continue anyway?")}
          </Text>
          <ModalFooter
            onCancel={() => {
              setDuplicateFile(null);
              setDuplicateKind(null);
            }}
            primaryLabel={t("continue_button", "Continue")}
            primaryColor="orange"
            onPrimary={() => {
              if (duplicateFile) setClubFile(duplicateFile);
              setDuplicateFile(null);
              setDuplicateKind(null);
            }}
          />
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

              {!hasNameHeader(currentHeaders) && (
                <Alert
                  variant="light"
                  color="red"
                  icon={<IconAlertCircle size={16} />}
                >
                  {t(
                    "missing_name_header_msg",
                    'You must include at least one Name field (e.g. "Name", "Full Name", "First Name", "Last Name").',
                  )}
                </Alert>
              )}

              {/* First import: pick which Excel columns become tournament fields */}
              {!hasDefinedFields && uploads.length === 0 ? (
                <Stack gap="xs">
                  <Alert
                    variant="light"
                    color="blue"
                    icon={<IconInfoCircle size={16} />}
                  >
                    {t(
                      "headers_picker_note",
                      "Choose which spreadsheet columns to keep as player fields. Name and club are always included. Later files must include the columns you select here; extra columns are ignored.",
                    )}
                  </Alert>
                  {selectableHeaders.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {t(
                        "no_extra_excel_headers",
                        "No extra columns detected beyond name/club.",
                      )}
                    </Text>
                  ) : (
                    <Stack gap={6}>
                      <Group gap="xs">
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          onClick={() => setSelectedLabels(selectableHeaders)}
                        >
                          {t("select_all", "Select all")}
                        </Button>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          onClick={() => setSelectedLabels([])}
                        >
                          {t("select_none", "Select none")}
                        </Button>
                      </Group>
                      {selectableHeaders.map((header) => (
                        <Checkbox
                          key={header}
                          label={header}
                          checked={selectedLabels.includes(header)}
                          onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            setSelectedLabels((current) =>
                              checked
                                ? [...current, header]
                                : current.filter((h) => h !== header),
                            );
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              ) : (
                (() => {
                  const required = hasDefinedFields
                    ? stripFixedHeaders(requiredImportHeaders)
                    : stripFixedHeaders(baselineHeaders ?? []);
                  const { missing, added } = diffHeaders(
                    required,
                    stripFixedHeaders(currentHeaders),
                  );

                  if (missing.length === 0 && added.length === 0) {
                    return (
                      <Alert
                        variant="light"
                        color="teal"
                        icon={<IconCircleCheck size={16} />}
                      >
                        {t(
                          "headers_match_required",
                          "Detected headers include all required player fields.",
                        )}
                      </Alert>
                    );
                  }

                  if (missing.length === 0 && added.length > 0) {
                    return (
                      <Alert
                        variant="light"
                        color="blue"
                        icon={<IconInfoCircle size={16} />}
                      >
                        <Stack gap={4}>
                          <Text size="sm">
                            {t(
                              "headers_extra_ok",
                              "Required columns are present. Extra columns will be ignored.",
                            )}
                          </Text>
                          <Text size="xs">
                            <strong>
                              {t("new_headers", "Contains new headers:")}
                            </strong>{" "}
                            {added.join(", ")}
                          </Text>
                        </Stack>
                      </Alert>
                    );
                  }

                  return (
                    <Alert
                      variant="light"
                      color="red"
                      icon={<IconAlertCircle size={16} />}
                    >
                      <Stack gap={4}>
                        <Text size="sm">
                          {t(
                            "headers_missing_required",
                            "This file is missing required player fields.",
                          )}
                        </Text>
                        <Text size="xs">
                          <strong>
                            {t("missing_headers", "Missing headers:")}
                          </strong>{" "}
                          {missing.join(", ")}
                        </Text>
                        {added.length > 0 && (
                          <Text size="xs">
                            <strong>
                              {t("new_headers", "Contains new headers:")}
                            </strong>{" "}
                            {added.join(", ")}
                          </Text>
                        )}
                      </Stack>
                    </Alert>
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
                      {u.playerCount ?? "—"}
                    </Text>
                  </Stack>
                  <ActionIcon
                    onClick={() =>
                      setUploads((list) => {
                        const next = list.filter((_, i) => i !== idx);
                        if (next.length === 0) setBaselineHeaders(null);
                        return next;
                      })
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
        <ModalFooter
          hideCancel
          primaryLabel={t("import_all", "Import All Clubs")}
          primaryDisabled={uploads.length === 0}
          onPrimary={async () => {
            const imported = await onImportAll(uploads);
            if (!imported) return;
            rememberImportedFileNames(uploads.map((upload) => upload.file.name));
          }}
        />
      </Stack>
    </>
  );
}
