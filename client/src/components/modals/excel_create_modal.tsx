import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Button,
  FileButton,
  Checkbox,
  Stepper,
  Select,
  TextInput,
  Flex,
  Group,
  Text,
  ActionIcon,
  Box,
  Paper,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import {
  IconPlus,
  IconX,
  IconDownload,
  IconUpload
} from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import ExcelJS from 'exceljs';

export type FieldType = "text" | "number" | "dropdown";
export type FieldGroup = "Required" | "Common" | "Others" | "Custom";

export type FieldDefinition = {
  key: string;
  label: string;
  include: boolean;
  options: string[];
};

interface ExcelImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImport: (payload: {
    file: File;
    clubName: string;
    clubAbbr: string;
    selectedSheet: string;
    fields: FieldDefinition[];
  }) => void;
}

const sheetOptions = ["Participants", "Judges"];

const defaultFieldOptions: Record<string, string[]> = {
  rank: ["1D", "2D", "3D", "5D", "6D"],
};

// const defaultFieldsBySheet: Record<string, FieldDefinition[]> = {
//   Participants: [
//     { key: 'name', label: 'Name', include: true,  type: 'text',     options: [], group: 'Required' },
//     { key: 'rank', label: 'Rank', include: true,  type: 'dropdown', options: ['1D','2D','3D','5D','6D'], group: 'Required' },
//     // modify this to pull divisions options from DB
//     // or indicate no divisions have been defined yet
//     { key: 'division', label: 'Division', include: true,  type: 'dropdown', options: ['A','B','C','D','E'], group: 'Common' },
//     { key: 'lunch', label: 'Lunch', include: true,  type: 'dropdown', options: ['Regular','Vegetarian'], group: 'Common' },
//     { key: 'cost', label: 'Cost', include: true,  type: 'dropdown', options: [], group: 'Common' },
//     { key: 'age', label: 'Age', include: true,  type: 'number', options: [], group: 'Others' },
//     { key: 'gender', label: 'Gender', include: true,  type: 'dropdown', options: ['Male', 'Female'], group: 'Others' },
//     { key: 'bogu', label: 'Bogu', include: true,  type: 'dropdown', options: ['Bogu', 'Non-Bogu'], group: 'Others' },
//     { key: 'paid', label: 'Paid', include: true,  type: 'dropdown', options: ['Yes', 'No'], group: 'Others' },
//     { key: 'after-party', label: 'After Party', include: true,  type: 'dropdown', options: ['Yes', 'No'], group: 'Others' },
//     { key: 'status', label: 'Status', include: true,  type: 'dropdown', options: ['Active', 'Inactive'], group: 'Others' },
//     { key: 'notes', label: 'Notes', include: true,  type: 'text', options: [], group: 'Others' },
//   ],
//   Judges: [
//     { key: 'name', label: 'Name', include: true, type: 'text', options: [], group: 'Required' },
//     { key: 'rank',   label: 'Rank',   include: true, type: 'dropdown', options: ['1D','2D','3D','5D','6D'],   group: 'Required' },
//     { key: 'email',   label: 'Email',   include: true, type: 'text', options: [],   group: 'Others' },
//   ],
// };

export default function ExcelImportModal({ opened, onClose, onImport }: ExcelImportModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const [activeStep, setActiveStep] = useState(0);

  // --- General ---
  const [file, setFile] = useState<File | null>(null);
  const [clubName, setClubName] = useState("");
  const [clubAbbr, setClubAbbr] = useState("");

  // --- Sheet selection ---
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");

  // --- Field config for the selected sheet ---
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  // parse workbook on file or sheet change
  useEffect(() => {
    if (!file) return;
    (async () => {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const names = wb.worksheets.map((ws) => ws.name);
      setSheetNames(names);
      // select first by default if only one
      if (names.length === 1) setSelectedSheet(names[0]);
      // parse headers for selected sheet
      const parse = (name: string) => {
        const ws = wb.getWorksheet(name);
        if (!ws) return [];
        const raw = ws.getRow(1).values ?? [];
        const vals = Array.isArray(raw) ? raw.slice(1) : [];
        const headers = (vals as any[]).filter((v) => v != null).map((v) => String(v));
        return headers.map((label) => ({
          key: label.toLowerCase().replace(/\s+/g, "_"),
          label,
          include: true,
          options: [],
        }));
      };
      setFields(parse(selectedSheet || names[0]));
    })();
  }, [file, selectedSheet]);

  const canNext = () => {
    if (activeStep === 0) {
      return !!file && clubName.trim() !== "" && clubAbbr.trim() !== "" && selectedSheet !== "";
    }
    return true;
  };

  const toggleInclude = (key: string) =>
    setFields((f) => f.map((x) => (x.key === key ? { ...x, include: !x.include } : x)));
  const addOption = (key: string, opt: string) => {
    if (!opt) return;
    setFields((f) => f.map((x) => (x.key === key ? { ...x, options: [...x.options, opt] } : x)));
    setNewOptionText((p) => ({ ...p, [key]: "" }));
  };
  const removeOption = (key: string, idx: number) =>
    setFields((f) => f.map((x) => (x.key === key ? { ...x, options: x.options.filter((_, i) => i !== idx) } : x)));

  const handleNext = () => {
    const last = 2; // steps: 0=General,1=Configure,2=Review
    if (activeStep < last) {
      setActiveStep((s) => s + 1);
    } else if (file) {
      onImport({ file, clubName: clubName.trim(), clubAbbr: clubAbbr.trim(), selectedSheet, fields });
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t("import_sheet", "Import Filled Sheet")}
    >
      <Stepper active={activeStep} onStepClick={setActiveStep} size="sm">
        {/* General step */}
        <Stepper.Step label={t("general", "General")}>
          {file ? (
            <Group align="center" gap="sm" mb="md">
              <IconUpload size={20} />
              <Text>{file.name}</Text>
              <ActionIcon onClick={() => setFile(null)}>
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <FileButton onChange={setFile} accept=".xlsx">
              {(props) => <Button {...props}>{t("upload_file", "Upload .xlsx File")}</Button>}
            </FileButton>
          )}

          <Select
            label={t("participants_sheet", "Participants Sheet")}
            placeholder={t("select_sheet_placeholder", "Select sheet...")}
            data={sheetNames.map((n) => ({ value: n, label: n }))}
            required
            value={selectedSheet}
            onChange={(v) => v && setSelectedSheet(v)}
            mt="md"
            disabled={!file}
          />

          <TextInput
            label={t("club_name", "Club Name")}
            required
            value={clubName}
            onChange={(e) => setClubName(e.currentTarget.value)}
            mt="md"
          />
          <TextInput
            label={t("club_abbr", "Club Abbreviation")}
            required
            value={clubAbbr}
            onChange={(e) => setClubAbbr(e.currentTarget.value)}
            mt="md"
          />
        </Stepper.Step>

        {/* 2: Configure fields */}
        <Stepper.Step label={t("configure_fields", "Configure Fields")}>
          {fields.map((field) => (
            <Box key={field.key} mb="md">
              <Flex justify="space-between" align="center">
                <Checkbox
                  label={field.label}
                  checked={field.include}
                  onChange={() => toggleInclude(field.key)}
                />
              </Flex>
              {field.include && (
                <Paper withBorder p="sm" mt="xs">
                  <Text size="sm" mb="xs">
                    {t("filter_options", "Filter Options (if any)")}
                  </Text>
                  <Group gap="xs" mb="xs">
                    {field.options.map((opt, i) => (
                      <Group key={i} align="center">
                        <Text size="xs">{opt}</Text>
                        <ActionIcon size="xs" onClick={() => removeOption(field.key, i)}>
                          <IconX size={12} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Group>
                  <Flex>
                    <TextInput
                      placeholder={t("add_option", "Add option")}
                      value={newOptionText[field.key] || ""}
                      onChange={(e) =>
                        setNewOptionText((p) => ({ ...p, [field.key]: e.currentTarget.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption(field.key, newOptionText[field.key] || "");
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="xs"
                      ml="xs"
                      onClick={() => addOption(field.key, newOptionText[field.key] || "")}
                    >
                      <IconPlus size={12} />
                    </Button>
                  </Flex>
                </Paper>
              )}
            </Box>
          ))}
        </Stepper.Step>

        {/* 3: Review */}
        <Stepper.Step label={t("review", "Review")}>
          <Text fw={500} mb="sm">
            {t("review_import", "Review")}
          </Text>
          <Text>
            {t("file")}: {file?.name}
          </Text>
          <Text>
            {t("club")}: {clubName} ({clubAbbr})
          </Text>
          <Text>
            {t("sheet")}: {selectedSheet}
          </Text>
          <Text>
            {t("fields_to_import", "Fields")}:{" "}
            {fields.filter((f) => f.include).map((f) => f.label).join(", ")}
          </Text>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="md">
        <Button
          variant="default"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          {t("previous", "Previous")}
        </Button>
        <Button disabled={!canNext()} onClick={handleNext}>
          {activeStep === 2 ? t("import", "Import") : t("next", "Next")}
        </Button>
      </Group>
    </Modal>
  );
}
