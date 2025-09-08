import { useState } from "react";
import {
  Modal,
  Stack,
  Checkbox,
  Group,
  Button,
  Text,
} from "@mantine/core";
import { useTranslation } from "next-i18next";

type Format = "booklet" | "posterCollapsed" | "posterExpanded";

export function BracketDownloadModal({
  opened,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: (formats: Format[]) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Record<Format, boolean>>({
    booklet: true,
    posterCollapsed: false,
    posterExpanded: false,
  });

  const toggle = (k: Format) =>
    setSelected((s) => ({ ...s, [k]: !s[k] }));

  const valid = Object.values(selected).some(Boolean);

  return (
    <Modal opened={opened} onClose={onClose} title={t("download", "Download")} centered>
      <Stack gap="md">
        <Text>
          {t("download_select_formats", "Select one or more formats to download:")}
        </Text>
        <Stack gap={6}>
          <Checkbox
            label={t("booklet", "Booklet")}
            checked={selected.booklet}
            onChange={() => toggle("booklet")}
          />
          <Checkbox
            label={t("poster_collapsed", "Poster (Collapsed)")}
            checked={selected.posterCollapsed}
            onChange={() => toggle("posterCollapsed")}
          />
          <Checkbox
            label={t("poster_expanded", "Poster (Expanded)")}
            checked={selected.posterExpanded}
            onChange={() => toggle("posterExpanded")}
          />
        </Stack>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              onConfirm(
                (Object.keys(selected) as Format[]).filter((k) => selected[k])
              )
            }
          >
            {t("download")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
