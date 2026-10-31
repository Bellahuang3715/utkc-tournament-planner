import React, { useEffect, useState } from "react";
import {
  Checkbox,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import type { BracketExportFormat } from "../export/bracket_templates";
import ModalFooter from "./modal_footer";

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
      closeOnClickOutside={false}
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
        <ModalFooter
          onCancel={onClose}
          primaryLabel={t("download", "Download")}
          primaryDisabled={formats.length === 0 || busy}
          primaryLoading={busy}
          onPrimary={() => void handleExport()}
        />
      </Stack>
    </Modal>
  );
}
