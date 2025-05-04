import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Button,
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
} from "@tabler/icons-react";
import { useTranslation } from "next-i18next";

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


export type FieldType = "text" | "number" | "dropdown";
export type FieldGroup = "Required" | "Common" | "Others" | "Custom";

export interface FieldDefinition {
  key: string;
  label: string;
  include: boolean;
  type: FieldType;
  options: string[];
  group: FieldGroup;
}

interface ExcelCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (
    fieldsBySheet: Record<string, FieldDefinition[]>,
    orderBySheet: Record<string, string[]>
  ) => void;
}

const defaultFieldOptions: Record<string, string[]> = {
  rank: ["1D", "2D", "3D", "5D", "6D"],
};

const defaultFieldsBySheet: Record<string, FieldDefinition[]> = {
  Participants: [
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
  ],
  Judges: [
    { key: 'name', label: 'Name', include: true, type: 'text', options: [], group: 'Required' },
    { key: 'rank',   label: 'Rank',   include: true, type: 'dropdown', options: ['1D','2D','3D','5D','6D'],   group: 'Required' },
    { key: 'email',   label: 'Email',   include: true, type: 'text', options: [],   group: 'Others' },
  ],
};

export default function ExcelCreateModal({
  opened,
  onClose,
  onSave,
}: ExcelCreateModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  // all available sheet names in desired fixed order
  const sheetOptions = Object.keys(defaultFieldsBySheet);

  // wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [excelTitle, setExcelTitle] = useState("");
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  const toggleSheet = (sheet: string) =>
    setSelectedSheets((prev) =>
      prev.includes(sheet)
        ? prev.filter((s) => s !== sheet)
        : [...prev, sheet]
    );

  // per-sheet fields & order state
  const [fieldsBySheet, setFieldsBySheet] = useState<Record<string, FieldDefinition[]>>({});
  const [orderBySheet, setOrderBySheet] = useState<Record<string, string[]>>({});

  // whenever selectedSheets changes, seed or remove its defaults
  useEffect(() => {
    const newFields = { ...fieldsBySheet };
    const newOrder = { ...orderBySheet };

    selectedSheets.forEach((sheet) => {
      if (!newFields[sheet]) {
        const defs = defaultFieldsBySheet[sheet] || [];
        newFields[sheet] = defs.map((f) => ({ ...f }));
        newOrder[sheet] = defs.filter((f) => f.include).map((f) => f.key);
      }
    });

    // remove any sheets that were unchecked
    Object.keys(newFields).forEach((sheet) => {
      if (!selectedSheets.includes(sheet)) {
        delete newFields[sheet];
        delete newOrder[sheet];
      }
    });

    setFieldsBySheet(newFields);
    setOrderBySheet(newOrder);
  }, [selectedSheets]);

  // ensure Participants always first, then Judges
  const orderedSheets = sheetOptions.filter((s) => selectedSheets.includes(s));

  // field-group rendering order
  const groupOrder: FieldGroup[] = ["Required", "Common", "Custom", "Others"];

  // new-field / new-option inputs
  const [newOptionText, setNewOptionText] = useState<Record<string, Record<string, string>>>({});
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");

  // handlers
  const toggleInclude = (sheet: string, key: string) => {
    setFieldsBySheet((all) => ({
      ...all,
      [sheet]: all[sheet].map((f) =>
        f.key === key ? { ...f, include: !f.include } : f
      ),
    }));
    setOrderBySheet((ord) => ({
      ...ord,
      [sheet]: ord[sheet].includes(key)
        ? ord[sheet].filter((k) => k !== key)
        : [...ord[sheet], key],
    }));
  };

  const updateType = (sheet: string, key: string, type: FieldType) => {
    setFieldsBySheet((all) => ({
      ...all,
      [sheet]: all[sheet].map((f) =>
        f.key === key
          ? { ...f, type, options: type === "dropdown" ? defaultFieldOptions[key] ?? [] : [] }
          : f
      ),
    }));
  };

  const addOption = (sheet: string, key: string, option: string) => {
    if (!option) return;
    setFieldsBySheet((all) => ({
      ...all,
      [sheet]: all[sheet].map((f) =>
        f.key === key ? { ...f, options: [...f.options, option] } : f
      ),
    }));
    setNewOptionText((prev) => ({
      ...prev,
      [sheet]: { ...(prev[sheet] || {}), [key]: "" },
    }));
  };

  const removeOption = (sheet: string, key: string, idx: number) => {
    setFieldsBySheet((all) => ({
      ...all,
      [sheet]: all[sheet].map((f) =>
        f.key === key
          ? { ...f, options: f.options.filter((_, i) => i !== idx) }
          : f
      ),
    }));
  };

  const handleAddField = (sheet: string) => {
    const label = newFieldLabel.trim();
    const key = label.toLowerCase().replace(/\s+/g, "_");
    if (!label || fieldsBySheet[sheet].some((f) => f.key === key)) return;

    const newField: FieldDefinition = {
      key,
      label,
      include: true,
      type: newFieldType,
      options: newFieldType === "dropdown" ? [] : [],
      group: "Custom",
    };

    setFieldsBySheet((all) => ({
      ...all,
      [sheet]: [...all[sheet], newField],
    }));
    setOrderBySheet((ord) => ({
      ...ord,
      [sheet]: [...ord[sheet], key],
    }));
    setNewFieldLabel("");
  };

// helper to convert 1‑based index to Excel column letter
function toColName(i: number): string {
  let s = "";
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

const generateWorkbook = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "Tournament App";
  wb.created  = new Date();

  // 1) hidden lists sheet
  const lists = wb.addWorksheet("_lists");
  lists.state = "veryHidden";
  let listCol = 1;

  // 2) for each sheet…
  for (const sheetName of orderedSheets) {
    const ws = wb.addWorksheet(sheetName);
    const keys = orderBySheet[sheetName] || [];

    // set headers
    ws.columns = keys.map((key) => {
      const fd = fieldsBySheet[sheetName]!.find((f) => f.key === key)!;
      return { header: fd.label, key: fd.key, width: 20 };
    });

    // build our hidden lists + named ranges
    for (const key of keys) {
      const fd = fieldsBySheet[sheetName]!.find((f) => f.key === key)!;
      if (fd.type === "dropdown" && fd.options.length) {
        const colLetter = toColName(listCol);
        // write each option down rows 1…N
        fd.options.forEach((opt, i) => {
          lists.getCell(i + 1, listCol).value = opt;
        });
        // name it e.g. Participants_rank_list
        const name = `${sheetName}_${key}_list`;
        const rangeRef = `'_lists'!$${colLetter}$1:$${colLetter}$${fd.options.length}`;
        wb.definedNames.add(name, rangeRef);
        listCol++;
      }
    }

    // add your empty table if you still want one
    ws.addTable({
      name: `${sheetName}Table`,
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      columns: ws.columns.map((c) => ({ name: c.header as string })),
      rows: [],
    });

    // 3) now apply validations
    keys.forEach((key, idx) => {
      const fd = fieldsBySheet[sheetName]!.find((f) => f.key === key)!;
      if (fd.type === "dropdown" && fd.options.length) {
        const letter = toColName(idx + 1);
        // @ts-ignore – this exists at runtime
        ws.dataValidations.add(
          `${letter}2:${letter}1000`,
          {
            type: "list",
            allowBlank: true,
            showErrorMessage: true,
            // inline the comma‑list here
            formulae: [`"${fd.options.join(",")}"`],
          }
        );
      }
    });
  }

  // 4) download
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `${excelTitle || "template"}.xlsx`);
};


  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("configure_fields", "Configure Export Fields")}
      size="lg"
    >
      <Text size="sm" color="dimmed" mb="md">
        {t(
          "configure_fields_note",
          "Select the column headers that will be used in the generated Excel sheet."
        )}
      </Text>

      <Stepper active={activeStep} onStepClick={setActiveStep} size="sm">
        {/* step 1: general info */}
        <Stepper.Step label="General">
          <TextInput
            label={t("excel_title", "Excel Title")}
            placeholder={t("excel_title_placeholder", "Enter sheet title")}
            value={excelTitle}
            onChange={(e) => setExcelTitle(e.currentTarget.value)}
            mb="md"
          />
          <Text fw={500} mb="xs">
            {t("sheets_selection")}
          </Text>
          {sheetOptions.map((s) => (
            <Checkbox
              key={s}
              label={s}
              checked={selectedSheets.includes(s)}
              onChange={() => toggleSheet(s)}
              mb="xs"
            />
          ))}
        </Stepper.Step>

        {/* one step per selected sheet */}
        {selectedSheets.map((sheet) => (
          <Stepper.Step key={sheet} label={sheet}>
            {/* Add Custom Field */}
            <Paper withBorder p="md" mb="md">
              <Text fw={500} mb="sm">
                {t("add_new_field", "Add New Field")}
              </Text>
              <Flex gap="sm" align="flex-end">
                <TextInput
                  placeholder={t("label", "Label")}
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.currentTarget.value)}
                  style={{ flex: 2 }}
                />
                <Select
                  placeholder={t("type", "Type")}
                  data={[
                    { value: "text", label: "Text" },
                    { value: "number", label: "Number" },
                    { value: "dropdown", label: "Dropdown" },
                  ]}
                  value={newFieldType}
                  onChange={(v) => v && setNewFieldType(v as FieldType)}
                  style={{ flex: 1 }}
                />
                <Button onClick={() => handleAddField(sheet)} leftSection={<IconPlus size={14} />}>
                  {t("add_field", "Add Field")}
                </Button>
              </Flex>
            </Paper>

            {/* Render Groups */}
            {groupOrder.map((grp) => {
              // guard against undefined
              const groupFields = (fieldsBySheet[sheet] ?? []).filter((f) => f.group === grp);
              if (groupFields.length === 0) return null;
              return (
                <Paper key={grp} withBorder p="md" mb="md">
                  <Text fw={600} mb="sm">{grp}</Text>
                  {groupFields.map((field) => (
                    <Box key={field.key} mb="md">
                      <Flex align="center" justify="space-between">
                        <Group align="center" gap="md">
                          <Checkbox
                            checked={field.include}
                            disabled={field.group === "Required"}
                            onChange={() => toggleInclude(sheet, field.key)}
                            label={field.label}
                          />
                          <Select
                            value={field.type}
                            onChange={(v) => v && updateType(sheet, field.key, v as FieldType)}
                            data={[
                              { value: "text", label: "Text" },
                              { value: "number", label: "Number" },
                              { value: "dropdown", label: "Dropdown" },
                            ]}
                          />
                        </Group>
                      </Flex>

                      {field.include && field.type === "dropdown" && (
                        <Box ml="xl" mt="sm">
                          <Text size="sm" mb="xs">Options:</Text>
                          <Group gap="xs" mb="xs">
                            {field.options.map((opt, idx) => (
                              <Group
                                key={idx}
                                align="center"
                                style={{
                                  backgroundColor: "#f1f3f5",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                }}
                              >
                                <Text size="xs" mr={2}>{opt}</Text>
                                <ActionIcon size="xs" onClick={() => removeOption(sheet, field.key, idx)}>
                                  <IconX size={14} />
                                </ActionIcon>
                              </Group>
                            ))}
                          </Group>
                          <Group align="flex-end" gap="xs">
                            <TextInput
                              placeholder={t("add_option", "Add option")}
                              value={newOptionText[sheet]?.[field.key] || ""}
                              onChange={(e) =>
                                setNewOptionText((prev) => ({
                                  ...prev,
                                  [sheet]: {
                                    ...(prev[sheet] || {}),
                                    [field.key]: e.currentTarget.value,
                                  },
                                }))
                              }
                              style={{ flex: 1 }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addOption(sheet, field.key, newOptionText[sheet]?.[field.key] || "");
                                }
                              }}
                            />
                            <Button
                              size="xs"
                              onClick={() =>
                                addOption(sheet, field.key, newOptionText[sheet]?.[field.key] || "")
                              }
                            >
                              <IconPlus size={14} />
                            </Button>
                          </Group>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Paper>
              );
            })}
          </Stepper.Step>
        ))}

        {/* final preview step */}
        <Stepper.Step label="Preview">
          <Text fw={500} mb="sm">{t("preview", "Preview")}</Text>
          {orderedSheets.map((sheet) => (
            <Box key={sheet} mb="md">
              <Text fw={600}>{sheet}</Text>
              <Text size="sm" color="dimmed">
                {t("fields", "Fields")}: {(orderBySheet[sheet] ?? []).join(", ")}
              </Text>
            </Box>
          ))}
        </Stepper.Step>
      </Stepper>

      {/* wizard nav */}
      <Group justify="space-between" mt="md">
        <Button
          variant="default"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          {t("previous", "Previous")}
        </Button>
        <Button
          onClick={async () => {
            const lastStep = orderedSheets.length + 1;
            if (activeStep < lastStep) {
              setActiveStep((s) => s + 1);
            } else {
              await generateWorkbook();
              onClose();
              // onSave(fieldsBySheet, orderBySheet);
            }
          }}
        >
          {activeStep === orderedSheets.length + 1
            ? t("export_template", "Export Template")
            : t("next", "Next")}
        </Button>
      </Group>
      

      {/* <Group justify="flex-end" mt="md" gap="md">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          leftSection={<IconDownload size={16} />}
          variant="outline"
          onClick={() => onSave(fields, selectedOrder)}
        >
          {t("export_template", "Export Template")}
        </Button>
      </Group> */}
    </Modal>
  );
}
