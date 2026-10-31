import { Badge, Text } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";

import {
  SCORE_STATUS_COLOR,
  SCORE_STATUS_LABEL,
  type ScoreStatus,
} from "../../utils/score_status";

type Props = {
  status: ScoreStatus;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Quiet label only — no fill or border (participant score cards). */
  plain?: boolean;
};

export default function ScoreStatusBadge({
  status,
  size = "sm",
  plain = false,
}: Props) {
  const { t } = useTranslation();
  const labelDefault = SCORE_STATUS_LABEL[status];
  const label = t(`score_status_${status}`, labelDefault);

  if (plain) {
    return (
      <Text
        size={size === "xs" ? "xs" : "sm"}
        c="dimmed"
        fw={600}
        style={{ whiteSpace: "nowrap", flexShrink: 0 }}
      >
        {label}
      </Text>
    );
  }

  return (
    <Badge color={SCORE_STATUS_COLOR[status]} variant="light" size={size}>
      {label}
    </Badge>
  );
}
