import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Checkbox,
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
import { IconX, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "next-i18next/pages";
import {
  PlayerFieldTypes,
  FieldInsertable,
} from "../../interfaces/player_fields";
import { updatePlayerFields } from "../../services/player_fields";
import { getPlayerFields } from "../../services/adapter";

export interface PlayerFieldsConfig {
  fields: FieldInsertable[];
}

interface PlayerFieldsConfigProps {
  tournament_id: number;
  opened: boolean;
  onClose: () => void;
  onSave: (config: PlayerFieldsConfig) => void;
}

export default function PlayerFieldsConfigModal({
  tournament_id,
  opened,
  onClose,
  onSave,
}: PlayerFieldsConfigProps) {
  const theme = useMantineTheme();
  const { t } = useTranslation();

  const [fields, setFields] = useState<FieldInsertable[]>([]);
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>(
    {}
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");

  const swrPlayerFieldsResponse = getPlayerFields(tournament_id);
  const playerFields: FieldInsertable[] =
    swrPlayerFieldsResponse.data?.fields ?? [];

  useEffect(() => {
    if (playerFields) {
      setFields(playerFields);
    }
  }, [playerFields]);

  const toggleInclude = (key: string) =>
    setFields((f) =>
      f.map((x) => (x.key === key ? { ...x, include: !x.include } : x))
    );

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
      f.map((x) => (x.key === key ? { ...x, options: [...x.options, opt] } : x))
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

  function addField() {
    const label = newFieldLabel.trim();
    if (!label) return;
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || "field";
    let key = base;
    let n = 2;
    while (fields.some((f) => f.key === key)) {
      key = `${base}_${n}`;
      n += 1;
    }
    setFields((current) => [
      ...current,
      {
        key,
        label,
        include: true,
        type: "TEXT",
        options: [],
        position: current.length,
      },
    ]);
    setNewFieldLabel("");
  }

  async function handleSave() {
    const saved = await updatePlayerFields(tournament_id, fields);
    if (saved == null) return;
    onSave({ fields });
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t("configure_template", "Manage Fields")}
    >
      {/* instruction */}
      <Text size="sm" color={theme.colors.blue[7]} mb="lg">
        {t(
          "configure_instr",
          "Name and club are always included. Add any other columns, then set each field’s type and options."
        )}
      </Text>
      <Flex mb="md" gap="xs">
        <TextInput
          placeholder={t("add_field_placeholder", "Add a field, such as Rank")}
          value={newFieldLabel}
          onChange={(e) => setNewFieldLabel(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addField();
            }
          }}
          style={{ flex: 1 }}
        />
        <Button variant="light" onClick={addField}>
          {t("add_field_button", "Add field")}
        </Button>
      </Flex>
      {fields.length === 0 && (
        <Text size="sm" c="dimmed" mb="md">
          {t(
            "no_extra_fields",
            "No extra columns yet. Add a field here, or import a spreadsheet and its headers will become the columns."
          )}
        </Text>
      )}
      {/* Header labels */}
      <Paper
        withBorder
        p="xs"
        mb="sm"
        style={{ backgroundColor: theme.colors.gray[0] }}
      >
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
                { value: "TEXT", label: t("type_text", "Text") },
                { value: "NUMBER", label: t("type_number", "Number") },
                { value: "DROPDOWN", label: t("type_dropdown", "Dropdown") },
                { value: "CHECKBOX", label: t("type_dropdown", "Checkbox") },
              ]}
              value={field.type}
              onChange={(v) =>
                v && updateType(field.key, v as PlayerFieldTypes)
              }
              disabled={!field.include}
              style={{ width: 120 }}
            />
          </Flex>
          {field.include && field.type === "DROPDOWN" && (
            <Paper withBorder p="sm" mt="xs">
              <Text size="sm" mb="xs">
                {t("filter_options", "Filter Options")}
              </Text>
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
                    <ActionIcon
                      size="xs"
                      onClick={() => removeOption(field.key, i)}
                    >
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
                  onClick={() =>
                    addOption(field.key, newOptionText[field.key] || "")
                  }
                >
                  <IconPlus size={12} />
                </Button>
              </Flex>
            </Paper>
          )}
        </Box>
      ))}

      <Group justify="space-between" mt="md">
        <Button variant="outline" onClick={onClose}>
          {t("cancel", "Cancel")}
        </Button>
        <Button onClick={handleSave}>{t("save", "Save")}</Button>
      </Group>
    </Modal>
  );
}
