import React, { useState, useEffect } from "react";
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
  useMantineTheme,
} from "@mantine/core";
import { IconX, IconUpload, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import ExcelJS from "exceljs";

export type FieldDefinition = {
  key: string;
  label: string;
  include: boolean;
  options: string[];
};

export interface TemplateConfig {
  sheetName: string;
  fields: FieldDefinition[];
}

interface TemplateConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (config: TemplateConfig) => void;
}

export default function TemplateConfigModal({ opened, onClose, onSave }: TemplateConfigModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!file) {
      setSheetNames([]);
      setSelectedSheet("");
      setFields([]);
      return;
    }
    (async () => {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const names = wb.worksheets.map((ws) => ws.name);
      setSheetNames(names);
      if (names.length === 1) {
        setSelectedSheet(names[0]);
      }
      const sheetToParse = selectedSheet || names[0] || "";
      if (sheetToParse) {
        const ws = wb.getWorksheet(sheetToParse);
        const raw = ws?.getRow(1).values ?? [];
        const vals = Array.isArray(raw) ? raw.slice(1) : [];
        const headers = (vals as any[]).filter((v) => v != null).map((v) => String(v));
        setFields(
          headers.map((label) => ({
            key: label.toLowerCase().replace(/\s+/g, "_"),
            label,
            include: true,
            options: [],
          }))
        );
      }
    })();
  }, [file, selectedSheet]);

  const toggleInclude = (key: string) =>
    setFields((f) =>
      f.map((x) => (x.key === key ? { ...x, include: !x.include } : x))
    );

  const addOption = (key: string, opt: string) => {
    if (!opt) return;
    setFields((f) =>
      f.map((x) => (x.key === key ? { ...x, options: [...x.options, opt] } : x))
    );
    setNewOptionText((p) => ({ ...p, [key]: "" }));
  };

  const removeOption = (key: string, idx: number) =>
    setFields((f) =>
      f.map((x) =>
        x.key === key ? { ...x, options: x.options.filter((_, i) => i !== idx) } : x
      )
    );

  const canNext = (): boolean => {
    if (activeStep === 0) {
      return !!file && selectedSheet !== "";
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
      onSave({ sheetName: selectedSheet, fields });
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t("configure_template", "Configure Template")}
    >
      <Stepper active={activeStep} onStepClick={setActiveStep} size="sm">
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
              {(props) => (
                <Button {...props}>{t("upload_template", "Upload Template .xlsx")}</Button>
              )}
            </FileButton>
          )}

          <Select
            label={t("select_sheet", "Select Sheet")}
            placeholder={t("select_sheet_placeholder", "Pick a sheet…")}
            data={sheetNames.map((n) => ({ value: n, label: n }))}
            required
            value={selectedSheet}
            onChange={(v) => v && setSelectedSheet(v)}
            mt="md"
            disabled={!file}
          />
        </Stepper.Step>

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
                        setNewOptionText((p) => ({
                          ...p,
                          [field.key]: e.currentTarget.value,
                        }))
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

        <Stepper.Step label={t("review", "Review")}> 
          <Text fw={500} mb="sm">
            {t("review_template", "Review Template")}
          </Text>
          <Text>
            {t("sheet_selected", "Sheet")}: {selectedSheet}
          </Text>
          <Text>
            {t("fields_selected", "Fields")}: {fields.filter((f) => f.include).map((f) => f.label).join(", ")}
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
          {activeStep === 2 ? t("save", "Save") : t("next", "Next")}
        </Button>
      </Group>
    </Modal>
  );
}
