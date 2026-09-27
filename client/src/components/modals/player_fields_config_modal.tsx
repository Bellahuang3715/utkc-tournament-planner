import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Checkbox,
  Select,
  TextInput,
  Flex,
  Group,
  Stack,
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
  const [confirmLeave, setConfirmLeave] = useState(false);

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
    const trimmed = opt.trim();
    if (!trimmed) return;
    setFields((f) =>
      f.map((x) =>
        x.key === key ? { ...x, options: [...x.options, trimmed] } : x,
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

  const emptyDropdowns = fields.filter(
    (field) =>
      field.include &&
      field.type === "DROPDOWN" &&
      field.options.every((option) => option.trim() === ""),
  );

  const dirty =
    JSON.stringify(fields) !== JSON.stringify(playerFields) ||
    newFieldLabel.trim() !== "" ||
    Object.values(newOptionText).some((value) => value.trim() !== "");

  function discardAndClose() {
    setFields(playerFields);
    setNewFieldLabel("");
    setNewOptionText({});
    setConfirmLeave(false);
    onClose();
  }

  function requestClose() {
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    discardAndClose();
  }

  async function handleSave() {
    if (emptyDropdowns.length > 0) return;
    const toSave = fields.map((field) =>
      field.type === "CHECKBOX" ? { ...field, type: "TEXT" as const } : field,
    );
    const saved = await updatePlayerFields(tournament_id, toSave);
    if (saved == null) return;
    onSave({ fields: toSave });
    onClose();
  }

  return (
    <>
    <Modal
      opened={opened}
      onClose={requestClose}
      closeOnClickOutside={false}
      size="lg"
      title={t("configure_template", "Manage Fields")}
    >
      {/* instruction */}
      <Text size="sm" color={theme.colors.blue[7]} mb="lg">
        {t(
          "configure_instr",
          "Name and club are always included. Add any other columns, then choose how each one is filtered."
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
          <Text fw={600}>{t("filter_type", "Filter type")}</Text>
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
                { value: "TEXT", label: t("filter_text", "Text") },
                { value: "NUMBER", label: t("filter_range", "Range") },
                { value: "DROPDOWN", label: t("filter_dropdown", "Dropdown") },
              ]}
              value={field.type === "DROPDOWN" || field.type === "NUMBER" ? field.type : "TEXT"}
              onChange={(v) =>
                v && updateType(field.key, v as PlayerFieldTypes)
              }
              disabled={!field.include}
              style={{ width: 140 }}
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
              {field.options.every((option) => option.trim() === "") && (
                <Text size="sm" c="red" mt="xs">
                  {t(
                    "dropdown_options_required",
                    "Add at least one option for this dropdown.",
                  )}
                </Text>
              )}
            </Paper>
          )}
        </Box>
      ))}

      <Group justify="space-between" mt="md">
        <Button variant="outline" onClick={requestClose}>
          {t("cancel", "Cancel")}
        </Button>
        <Button onClick={handleSave} disabled={emptyDropdowns.length > 0}>
          {t("save", "Save")}
        </Button>
      </Group>
    </Modal>
    <Modal
      opened={confirmLeave}
      onClose={() => setConfirmLeave(false)}
      title={t("leave_fields_title", "Close without saving?")}
      centered
      size="sm"
    >
      <Stack gap="lg">
        <Text size="sm" lh={1.6}>
          {t(
            "leave_fields_message",
            "You have unsaved changes. If you leave, they will be lost.",
          )}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setConfirmLeave(false)}>
            {t("stay_button", "Stay")}
          </Button>
          <Button color="red" onClick={discardAndClose}>
            {t("leave_button", "Leave")}
          </Button>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}
