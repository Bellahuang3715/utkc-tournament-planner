import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import type { BracketExportFormat } from "../export/bracket_player_templates";

export default function BracketExportModal({
  opened,
  divisionName,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  divisionName: string;
  onClose: () => void;
  onConfirm: (formats: BracketExportFormat[]) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [formats, setFormats] = useState<BracketExportFormat[]>([
    "expanded",
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (opened) {
      setFormats(["expanded"]);
      setBusy(false);
    }
  }, [opened]);

  const handleExport = async () => {
    if (formats.length === 0 || busy) return;
    setBusy(true);
    try {
      await onConfirm(formats);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("export_brackets_title", "Export brackets")}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t(
            "export_brackets_prompt",
            "Choose what to export for {{name}}.",
            { name: divisionName },
          )}
        </Text>
        <Checkbox.Group
          value={formats}
          onChange={(value) =>
            setFormats(value as BracketExportFormat[])
          }
          label={t("export_format", "Format")}
        >
          <Stack gap="xs" mt="xs">
            <Checkbox
              value="expanded"
              label={t("export_expanded", "Expanded brackets")}
              description={t(
                "export_expanded_desc",
                "Full-size bracket sheet per group",
              )}
            />
            <Checkbox
              value="collapsed"
              label={t("export_collapsed", "Collapsed brackets")}
              description={t(
                "export_collapsed_desc",
                "Compact Left/Right sheets (odd groups → Left, even → Right)",
              )}
            />
          </Stack>
        </Checkbox.Group>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} disabled={busy}>
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={() => void handleExport()}
            disabled={formats.length === 0}
            loading={busy}
          >
            {t("download", "Download")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
