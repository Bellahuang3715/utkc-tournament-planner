import {
  TextInput,
  Paper,
  Stack,
  Group,
  Title,
  SegmentedControl,
  Select,
  NumberInput,
  ColorInput,
} from "@mantine/core";

// ---- Types & constants (shared with individuals + teams) ----
export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold?: boolean;
};

export type StyleTarget = "playerId" | "playerText" | "bracketTitle";

export type FormatStyles = Record<StyleTarget, TextStyle>;

export const defaultTitleStyle: TextStyle = {
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  color: "#000000",
};

export const FONT_CHOICES = [
  "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  "Roboto, Helvetica, Arial, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
];

export const DEFAULT_BOOKLET: FormatStyles = {
  playerId: { fontFamily: FONT_CHOICES[0], fontSize: 11, color: "#000000" },
  playerText: { fontFamily: FONT_CHOICES[0], fontSize: 11, color: "#333333" },
  bracketTitle: { fontFamily: FONT_CHOICES[0], fontSize: 12, color: "#111111" },
};

export const DEFAULT_POSTER: FormatStyles = {
  playerId: { fontFamily: FONT_CHOICES[1], fontSize: 16, color: "#111111" },
  playerText: { fontFamily: FONT_CHOICES[1], fontSize: 14, color: "#222222" },
  bracketTitle: { fontFamily: FONT_CHOICES[1], fontSize: 18, color: "#111111" },
};

export const STYLE_TARGETS: Array<{ label: string; value: StyleTarget }> = [
  { label: "Player ID", value: "playerId" },
  { label: "Player name/club", value: "playerText" },
  { label: "Bracket title", value: "bracketTitle" },
];

// ---- Shared UI components ----

export function BracketTitleEditor({
  value,
  onChange,
  placeholder,
  titleStyle,
}: {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  placeholder?: string;
  titleStyle: TextStyle;
}) {
  return (
    <TextInput
      label="Title"
      placeholder={placeholder ?? "Add title (optional)"}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.currentTarget.value;
        onChange(v.trim() === "" ? null : v);
      }}
      styles={{
        input: {
          fontFamily: titleStyle.fontFamily,
          fontSize: `${titleStyle.fontSize}pt`,
          color: titleStyle.color,
        },
        label: {
          fontFamily: titleStyle.fontFamily,
          color: titleStyle.color,
        },
      }}
    />
  );
}

export function StyleEditor({
  styles,
  onChange,
  target,
  setTarget,
  fontChoices,
}: {
  styles: FormatStyles;
  onChange: (next: FormatStyles) => void;
  target: StyleTarget;
  setTarget: (t: StyleTarget) => void;
  fontChoices: string[];
}) {
  const s = styles[target];

  return (
    <Paper withBorder p="sm" radius="sm">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Title order={6}>Style</Title>
          <SegmentedControl
            value={target}
            onChange={(v) => setTarget(v as StyleTarget)}
            data={STYLE_TARGETS}
          />
        </Group>

        <Group wrap="wrap" gap="sm" align="end">
          <Select
            label="Font family"
            data={fontChoices}
            value={s.fontFamily}
            onChange={(v) => {
              if (!v) return;
              onChange({
                ...styles,
                [target]: { ...s, fontFamily: v },
              });
            }}
            w={320}
          />

          <NumberInput
            label="Font size (pt)"
            min={6}
            max={72}
            value={s.fontSize}
            onChange={(v) => {
              if (typeof v !== "number") return;
              onChange({
                ...styles,
                [target]: { ...s, fontSize: v },
              });
            }}
            w={140}
          />

          <ColorInput
            label="Font color"
            value={s.color}
            onChange={(v) => {
              onChange({
                ...styles,
                [target]: { ...s, color: v },
              });
            }}
            w={180}
          />
        </Group>
      </Stack>
    </Paper>
  );
}
