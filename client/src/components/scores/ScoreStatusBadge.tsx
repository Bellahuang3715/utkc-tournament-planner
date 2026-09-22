import { Badge } from "@mantine/core";
import { useTranslation } from "next-i18next/pages";

import {
  SCORE_STATUS_COLOR,
  SCORE_STATUS_LABEL,
  type ScoreStatus,
} from "../../utils/score_status";

type Props = {
  status: ScoreStatus;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

export default function ScoreStatusBadge({ status, size = "sm" }: Props) {
  const { t } = useTranslation();
  const labelDefault = SCORE_STATUS_LABEL[status];
  const label = t(`score_status_${status}`, labelDefault);

  return (
    <Badge color={SCORE_STATUS_COLOR[status]} variant="light" size={size}>
      {label}
    </Badge>
  );
}
