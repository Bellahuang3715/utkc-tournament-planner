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
import { showNotification } from "@mantine/notifications";
import { IconX, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
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

  async function handleSave() {
    // 1) Normalize keys for any first/last name fields:
    const normalizedFields = fields.map((f) => {
      const txt = `${f.key} ${f.label}`.toLowerCase();
      if (/\b(first\s*name|firstname)\b/.test(txt)) {
        return { ...f, key: "firstname" };
      }
      if (/\b(last\s*name|lastname)\b/.test(txt)) {
        return { ...f, key: "lastname" };
      }
      return f;
    });

    // 2) Check that at least one Name field (first or last or generic) is present:
    const hasNameField = normalizedFields.some((f) => {
      const txt = `${f.key} ${f.label}`.toLowerCase();
      return /\b(name|firstname|lastname)\b/.test(txt);
    });

    if (!hasNameField) {
      showNotification({
        title: t("error", "Error"),
        message: t(
          "template_missing_name",
          'You must include at least one Name field (e.g. "Name", "First Name", "Last Name").'
        ),
        color: "red",
      });
      return;
    }

    // 3) All good → send normalized fields up
    await updatePlayerFields(tournament_id, normalizedFields);
    onSave({ fields: normalizedFields });
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
          "Pick which columns to include and set each field’s type and options."
        )}
      </Text>
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
