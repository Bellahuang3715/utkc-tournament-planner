import React, { useState, useMemo } from "react";
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
  initialFields: FieldDefinition[];
  onSave: (fields: FieldDefinition[], order: string[]) => void;
}

const defaultFieldOptions: Record<string, string[]> = {
  rank: ["1D", "2D", "3D", "5D", "6D"],
};

export default function ExcelCreateModal({
  opened,
  onClose,
  initialFields,
  onSave,
}: ExcelCreateModalProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  // wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [excelTitle, setExcelTitle] = useState("");
  const sheetOptions = ["Participants", "Judges", "Volunteers"];
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  const toggleSheet = (s: string) =>
    setSelectedSheets((arr) =>
      arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]
    );

  // initialize: only Required fields selected
  const initFields = useMemo(
    () => initialFields.map((f) => ({ ...f, include: f.group === "Required" })),
    [initialFields]
  );
  const [fields, setFields] = useState<FieldDefinition[]>(initFields);
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>(
    {}
  );

  // track selected and their order
  const [selectedOrder, setSelectedOrder] = useState<string[]>(
    initFields.filter((f) => f.include).map((f) => f.key)
  );

  // new field form
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");

  const toggleInclude = (key: string) => {
    setFields((all) =>
      all.map((f) => (f.key === key ? { ...f, include: !f.include } : f))
    );
    setSelectedOrder((ord) =>
      ord.includes(key) ? ord.filter((k) => k !== key) : [...ord, key]
    );
  };

  const updateType = (key: string, type: FieldType) => {
    setFields((all) =>
      all.map((f) =>
        f.key === key
          ? {
              ...f,
              type,
              options:
                type === "dropdown" ? defaultFieldOptions[key] ?? [] : [],
            }
          : f
      )
    );
  };

  const addOption = (key: string, option: string) => {
    if (!option) return;
    setFields((all) =>
      all.map((f) =>
        f.key === key ? { ...f, options: [...f.options, option] } : f
      )
    );
    setNewOptionText((prev) => ({ ...prev, [key]: "" }));
  };

  const removeOption = (key: string, idx: number) => {
    setFields((all) =>
      all.map((f) =>
        f.key === key
          ? { ...f, options: f.options.filter((_, i) => i !== idx) }
          : f
      )
    );
  };

  const handleAddField = () => {
    const label = newFieldLabel.trim();
    const key = label.toLowerCase().replace(/\s+/g, "_");
    if (!label || fields.some((f) => f.key === key)) return;
    const newField: FieldDefinition = {
      key,
      label,
      include: true,
      type: newFieldType,
      options: newFieldType === "dropdown" ? [] : [],
      group: "Custom",
    };
    setFields((all) => [...all, newField]);
    setSelectedOrder((ord) => [...ord, key]);
    setNewFieldLabel("");
  };

  // group fields
  const grouped = useMemo(() => {
    const acc: Record<FieldGroup, FieldDefinition[]> = {
      Required: [],
      Common: [],
      Others: [],
      Custom: []
    };
    fields.forEach((f) => acc[f.group].push(f));
    return acc;
  }, [fields]);
  const groupOrder: FieldGroup[] = ["Required", "Common", "Custom", "Others"];

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
            label="Excel Title"
            placeholder="Enter sheet title"
            value={excelTitle}
            onChange={(e) => setExcelTitle(e.currentTarget.value)}
            mb="md"
          />
          <Text fw={500} mb="xs">Which sheets?</Text>
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
          <Button onClick={handleAddField} leftSection={<IconPlus size={14} />}>
            {t("add_field", "Add Field")}
          </Button>
        </Flex>
      </Paper>

      {/* Render Groups */}
      {groupOrder.map(
        (grp) =>
          grouped[grp].length > 0 && (
            <Paper key={grp} withBorder p="md" mb="md">
              <Text fw={600} mb="sm">
                {grp}
              </Text>
              {grouped[grp].map((field) => (
                <Box key={field.key} mb="md">
                  <Flex align="center" justify="space-between">
                    <Group align="center" gap="md">
                      <Checkbox
                        checked={field.include}
                        disabled={field.group === "Required"}
                        onChange={() => toggleInclude(field.key)}
                        label={field.label}
                      />
                      <Select
                        value={field.type}
                        onChange={(v) =>
                          v && updateType(field.key, v as FieldType)
                        }
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
                      <Text size="sm" mb="xs">
                        Options:
                      </Text>
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
                            <ActionIcon
                              size="xs"
                              onClick={() => removeOption(field.key, idx)}
                            >
                              <IconX size={14} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Group>
                      <Group align="flex-end" gap="xs">
                        <TextInput
                          placeholder="Add option"
                          value={newOptionText[field.key] || ""}
                          onChange={(e) =>
                            setNewOptionText((prev) => ({
                              ...prev,
                              [field.key]: e.currentTarget.value,
                            }))
                          }
                          style={{ flex: 1 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOption(field.key, newOptionText[field.key] || "");
                            }
                          }}
                        />
                        <Button
                          size="xs"
                          onClick={() =>
                            addOption(field.key, newOptionText[field.key] || "")
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
          )
      )}
          </Stepper.Step>
        ))}
    
        {/* final preview step */}
        <Stepper.Step label="Preview">
          {/* summary of excelTitle, selectedSheets, and chosen fields… */}
        </Stepper.Step>
      </Stepper>

      {/* wizard nav */}
      <Group justify="space-between" mt="md">
        <Button
          variant="default"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          Previous
        </Button>
        <Button
          onClick={() => {
            const last = selectedSheets.length + 1;
            if (activeStep < last) {
              setActiveStep((s) => s + 1);
            } else {
              // final: fire save (you may want to pass excelTitle & selectedSheets too)
              onSave(fields, selectedOrder);
            }
          }}
        >
          {activeStep === selectedSheets.length + 1 ? "Finish" : "Next"}
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
