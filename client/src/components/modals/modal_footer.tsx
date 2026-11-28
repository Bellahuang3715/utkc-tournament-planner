import { Button, Group } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";
import React from "react";

import { cancelAction, saveAction } from "../buttons/action_styles";

/** Shared footer for organizer modals: optional left slot, Cancel + primary on the right. */
export default function ModalFooter({
  onCancel,
  cancelLabel,
  primaryLabel,
  onPrimary,
  primaryType = "button",
  primaryLoading,
  primaryDisabled,
  primaryColor,
  primaryAction,
  leftSection,
  hideCancel = false,
}: {
  onCancel?: () => void;
  cancelLabel?: string;
  primaryLabel: string;
  onPrimary?: () => void;
  primaryType?: "submit" | "button";
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  primaryColor?: string;
  primaryAction?: "save";
  leftSection?: React.ReactNode;
  hideCancel?: boolean;
}) {
  const { t } = useTranslation();
  const primaryStyle = primaryAction === "save" ? saveAction : undefined;

  return (
    <Group
      justify={leftSection ? "space-between" : "flex-end"}
      mt="lg"
      wrap="wrap"
      gap="sm"
    >
      {leftSection ? <Group gap="sm">{leftSection}</Group> : null}
      <Group gap="sm" justify="flex-end">
        {!hideCancel && onCancel ? (
          <Button {...cancelAction} onClick={onCancel}>
            {cancelLabel ?? t("cancel", "Cancel")}
          </Button>
        ) : null}
        <Button
          type={primaryType}
          onClick={primaryType === "button" ? onPrimary : undefined}
          loading={primaryLoading}
          disabled={primaryDisabled}
          color={primaryColor ?? primaryStyle?.color}
          variant={primaryStyle?.variant}
        >
          {primaryLabel}
        </Button>
      </Group>
    </Group>
  );
}
