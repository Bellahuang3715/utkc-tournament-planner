import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  FileButton,
  Checkbox,
  Stepper,
  Select,
  NumberInput,
  TextInput,
  Flex,
  Group,
  Text,
  ActionIcon,
  Box,
  Paper,
  useMantineTheme,
} from "@mantine/core";
import { IconX, IconUpload, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { PlayerFieldTypes, FieldInsertable } from "../../interfaces/player_fields";
import { updatePlayerFields } from "../../services/player_fields";

import ExcelJS from "exceljs";

export interface TemplateConfig {
  sheetName: string;
  headerRow: number;
  fields: FieldInsertable[];
}

interface TemplateConfigModalProps {
  tournament_id: number;
  opened: boolean;
  onClose: () => void;
  onSave: (config: TemplateConfig) => void;
}

export default function TemplateConfigModal({ tournament_id, opened, onClose, onSave }: TemplateConfigModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [fields, setFields] = useState<FieldInsertable[]>([]);
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  // whenever `file` changes, read all tabs
  useEffect(() => {
    if (!file) {
      setSheetNames([]);
      setSelectedSheet("");
      return;
    }
    (async () => {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
  
      const names = wb.worksheets.map((ws) => ws.name);
      setSheetNames(names);
  
      // auto‑pick the first tab if none chosen yet
      if (!selectedSheet && names.length > 0) {
        setSelectedSheet(names[0]);
      }
    })();
  }, [file]);

  // whenever file, selectedSheet or headerRow changes, re‑parse fields & detect dropdowns 2 rows down
  useEffect(() => {
    if (!file || !selectedSheet) {
      setFields([]);
      return;
    }
    (async () => {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
  
      const ws = wb.getWorksheet(selectedSheet);
      if (!ws) {
        setFields([]);
        return;
      }
  
      // Read the raw header row array (indices = actual column numbers)
      const rawHeader = ws.getRow(headerRow).values as any[];
      const parsedFields: FieldInsertable[] = [];
  
      for (let colIndex = 1; colIndex < rawHeader.length; colIndex++) {
        const rawVal = rawHeader[colIndex];
        if (rawVal == null) continue;            // skip empty columns
        const label = String(rawVal);
        let type: PlayerFieldTypes = "TEXT";
        let options: string[] = [];
  
        // peek two rows down for a dropdown validation
        const dvCell = ws.getCell(headerRow + 2, colIndex);
        const dv = dvCell.dataValidation;
        if (dv?.type === "list" && Array.isArray(dv.formulae) && dv.formulae.length) {
          type = "DROPDOWN";
          const formula = dv.formulae[0];
  
          // inline list: "A,B,C"
          if (formula.startsWith('"') && formula.endsWith('"')) {
            options = formula.slice(1, -1).split(",");
          } else {
            // named‐range
            const named = (wb.definedNames as any).get(formula);
            if (named?.ranges?.length) {
              const [sheetRef, range] = named.ranges[0].split("!");
              const listSheet = wb.getWorksheet(sheetRef.replace(/'/g, ""));
              if (listSheet) {
                const [start, end] = range.replace(/\$/g, "").split(":");
                const colLetter = start.match(/[A-Z]+/)![0];
                const startRow = +start.match(/\d+/)![0];
                const endRow = +end.match(/\d+/)![0];
                for (let r = startRow; r <= endRow; r++) {
                  const v = listSheet.getCell(colLetter + r).value;
                  if (v != null) options.push(String(v));
                }
              }
            }
          }
        }
  
        parsedFields.push({
          key: label.toLowerCase().replace(/\s+/g, "_"),
          label,
          include: true,
          type,
          options,
          position: colIndex - 1, // 0-based index
        });
      }
  
      setFields(parsedFields);
    })();
  }, [file, selectedSheet, headerRow]);

  const toggleInclude = (key: string) =>
    setFields((f) => f.map((x) => (x.key === key ? { ...x, include: !x.include } : x)));
  const updateType = (key: string, type: PlayerFieldTypes) =>
    setFields((f) =>
      f.map((x) =>
        x.key === key
          ? { ...x, type, options: type === "DROPDOWN" ? x.options : [] }
          : x
      )
    );
  const addOption = (key: string, opt: string) => {
    if (!opt) return;
    setFields((f) =>
      f.map((x) =>
        x.key === key ? { ...x, options: [...x.options, opt] } : x
      )
    );
    setNewOptionText((p) => ({ ...p, [key]: "" }));
  };
  const removeOption = (key: string, idx: number) =>
    setFields((f) =>
      f.map((x) =>
        x.key === key
          ? { ...x, options: x.options.filter((_, i) => i !== idx) }
          : x
      )
    );

  const canNext = (): boolean => {
    if (activeStep === 0) {
      return !!file && selectedSheet.trim() !== "";
    }
    if (activeStep === 1) {
      return fields.some((f) => f.include);
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep < 2) {
      setActiveStep((s) => s + 1);
    } else {
      onSave({ sheetName: selectedSheet, headerRow, fields });
      onClose();
    }
  };

  async function handleSave() {
    console.log("Saving fields:", fields);
    await updatePlayerFields(tournament_id, fields);
    onSave({ sheetName: selectedSheet, headerRow, fields });
    onClose();
  }
  
  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    const next = Array.from(fields);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setFields(next);
  }
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t("configure_template", "Configure Template")}
    >
      <Stepper active={activeStep} onStepClick={setActiveStep} size="sm">
        <Stepper.Step label={t("general", "General")}> 
          {/* instruction */}
          <Text size="sm" color={theme.colors.blue[7]} mb="lg">
          {t("general_instr", "Upload your blank template, select the sheet and header row.")}
          </Text>
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
              {(props) => (
                <Button {...props}>{t("upload_template", "Upload Template .xlsx")}</Button>
              )}
            </FileButton>
          )}

          <Select
            label={t("select_sheet", "Which sheet contains the participants' info?")}
            placeholder={t("select_sheet_placeholder", "Select a sheet…")}
            data={sheetNames.map((n) => ({ value: n, label: n }))}
            required
            value={selectedSheet}
            onChange={(v) => v && setSelectedSheet(v)}
            mt="md"
            disabled={!file}
          />

          <NumberInput
            label={t("header_row", "Enter the row that contains the table headers (Ex. Name, Rank, etc.)")}
            min={1}
            required
            value={headerRow}
            onChange={(value) => {
                if (typeof value === 'number') {
                  setHeaderRow(value);
                }
              }}
            mt="md"
            disabled={!file}
          />
        </Stepper.Step>

        <Stepper.Step label={t("configure_fields", "Configure Fields")}>
          {/* instruction */}
          <Text size="sm" color={theme.colors.blue[7]} mb="lg">
          {t("configure_instr", "Pick which columns to include and set each field’s type and options.")}
          </Text>
          {/* Header labels */}
          <Paper withBorder p="xs" mb="sm" style={{ backgroundColor: theme.colors.gray[0] }}>
            <Flex justify="space-between">
              <Text fw={600}>{t("field_name", "Field Name")}</Text>
              <Text fw={600}>{t("field_type", "Field Type")}</Text>
            </Flex>
          </Paper>
          {fields.map((field) => (
            <Box key={field.key} mb="md">
              <Flex justify="space-between" align="center">
                <Checkbox
                  label={field.label}
                  checked={field.include}
                  onChange={() => toggleInclude(field.key)}
                />
                <Select
                  data={[
                    { value: "text", label: t("type_text", "Text") },
                    { value: "number", label: t("type_number", "Number") },
                    { value: "dropdown", label: t("type_dropdown", "Dropdown") },
                  ]}
                  value={field.type}
                  onChange={(v) => v && updateType(field.key, v as PlayerFieldTypes)}
                  disabled={!field.include}
                  style={{ width: 120 }}
                />
              </Flex>
              {field.include && field.type === "DROPDOWN" && (
                <Paper withBorder p="sm" mt="xs">
                  <Text size="sm" mb="xs">{t("filter_options", "Filter Options")}</Text>
                  <Group gap="xs" mb="xs">
                    {field.options.map((opt, i) => (
                      <Group 
                        key={i}
                        align="center"
                        style={{
                            backgroundColor: "#f1f3f5",
                            padding: "4px 8px",
                            borderRadius: 4,
                        }}
                      >
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
                    <Button size="xs" ml="xs" onClick={() => addOption(field.key, newOptionText[field.key] || "")}
                    >
                      <IconPlus size={12} />
                    </Button>
                  </Flex>
                </Paper>
              )}
            </Box>
          ))}
        </Stepper.Step>

        <Stepper.Step label={t("review", "Review")}>
          <Text size="sm" color={theme.colors.blue[7]} mb="lg">
          {t("review_instr", "Confirm your fields and options; these cannot be changed later.")}
          </Text>
{/* 
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="fields">
              {(droppable) => (
                <div
                  ref={droppable.innerRef}
                  {...droppable.droppableProps}
                  style={{ maxHeight: 400, overflowY: "auto" }}
                >
                  {fields.filter((f) => f.include).map((field, idx) => (
                    <Draggable key={field.key} draggableId={field.key} index={idx}>
                      {(draggable) => (
                        <Paper
                          withBorder
                          p="sm"
                          mb="xs"
                          ref={draggable.innerRef}
                          {...draggable.draggableProps}
                          {...draggable.dragHandleProps}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            ...draggable.draggableProps.style,
                          }}
                        >
                          <Text mr="md" fw={700}>
                            {idx + 1}.
                          </Text>

                          <Box style={{ flex: 1 }}>
                            <Text fw={600}>{field.label}</Text>
                            {field.type === "dropdown" && field.options.length > 0 ? (
                              <Text size="sm" color="dimmed">
                                {t("options", "Options")}: {field.options.join(", ")}
                              </Text>
                            ) : (
                              <Text size="sm" color="dimmed">
                                {t("type", "Type")}:{" "}
                                {t(`type_${field.type}`, field.type.charAt(0).toUpperCase() + field.type.slice(1))}
                              </Text>
                            )}
                          </Box>
                        </Paper>
                      )}
                    </Draggable>
                  ))}
                  {droppable.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext> */}



          {/* final review - fields only */}
          <Text fw={500} mb="sm">
            {t("review_warning", "Please double-check these fields and options — they cannot be changed later and will be used to parse all club sheets.")}
          </Text>
          <Paper withBorder p="md" mb="md">
            {fields.filter((f) => f.include).map((field) => (
              <Box key={field.key} mb="md">
                <Text fw={600}>{field.label}</Text>
                {field.type === "DROPDOWN" && field.options.length > 0 ? (
                  <Text size="sm" color="dimmed">
                    {t("options", "Options")}:{" "}{field.options.join(", ")}
                  </Text>
                ) : (
                  <Text size="sm" color="dimmed">
                    {t("type", "Type")}:{" "}{t(`type_${field.type}`, field.type.charAt(0).toUpperCase() + field.type.slice(1))}
                  </Text>
                )}
              </Box>
            ))}
          </Paper>
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
        <Button disabled={!canNext()} onClick={activeStep < 2 ? handleNext : handleSave}>
          {activeStep === 2 ? t("save", "Save") : t("next", "Next")}
        </Button>
      </Group>
    </Modal>
  );
}
