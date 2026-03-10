import React, { forwardRef, useMemo } from "react";
import { Group, Box, Title } from "@mantine/core";
import { CollapsedLeft, CollapsedRight, Expanded } from "tournament-brackets-ui";
import { BracketWithPlayers, BracketWithTeams } from "../../interfaces/bracket";
import {
  toUIPlayers,
  toUIPlayersWithClubAbbrev,
  toUITeamNames,
} from "../../services/bracket";
import {
  DEFAULT_BOOKLET,
  DEFAULT_POSTER,
  type FormatStyles,
} from "../utils/brackets_editor/shared";

type Format = "booklet" | "poster";

function formatStylesForFormat(format: Format): FormatStyles {
  return format === "booklet" ? DEFAULT_BOOKLET : DEFAULT_POSTER;
}

function teamIDStyleFromFormat(formatStyles: FormatStyles) {
  const s = formatStyles.playerId;
  return {
    teamIDFontFamily: s.fontFamily,
    teamIDColor: s.color,
    teamIDFontSize: s.fontSize,
  };
}

type BracketsExportCanvasProps = {
  divisionName: string;
  format: Format;
  /** For individuals divisions */
  brackets?: BracketWithPlayers[];
  /** When provided (e.g. for individuals booklet), club names are shown as abbreviations. */
  clubAbbrevByName?: Map<string, string>;
  /** For teams divisions */
  bracketsTeams?: BracketWithTeams[];
  /** For division B: use player code only */
  useCodeOnly?: boolean;
  /** Hardcoded player_id -> display code for Division B */
  playerIdToDisplayCode?: Record<number, string>;
};

const teamSize = (n: number) =>
  n as 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16;

const PAGE_MARGIN = 48;

function groupTitleText(
  index: number,
  index2?: number,
  title?: string | null,
): string {
  let t = `Group ${index}`;
  if (index2 != null) t += ` & ${index2}`;
  if (title) t += ` — ${title}`;
  return t;
}

const titleContainerStyle: React.CSSProperties = {
  marginBottom: PAGE_MARGIN,
  alignSelf: "flex-start",
  textAlign: "left",
};

/** Booklet/poster page: equal padding top and left so title sits at top with same gap as left. */
const pageContainerStyle: React.CSSProperties = {
  paddingTop: PAGE_MARGIN,
  paddingLeft: PAGE_MARGIN,
  paddingRight: PAGE_MARGIN,
  paddingBottom: 0,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "flex-start",
};

/** Content width for export (page width minus horizontal padding). Ensures bracket has explicit size for capture. */
const EXPORT_CONTENT_WIDTH = 1200 - 2 * PAGE_MARGIN;

/** Wrapper for the bracket only: separate from titles, centered horizontally, with room to render. */
const bracketContainerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 400,
  width: EXPORT_CONTENT_WIDTH,
  minWidth: EXPORT_CONTENT_WIDTH,
  marginBottom: PAGE_MARGIN,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  boxSizing: "border-box",
};

export const BracketsExportCanvas = forwardRef<
  HTMLDivElement,
  BracketsExportCanvasProps
>(({ divisionName, format, brackets, clubAbbrevByName, bracketsTeams, useCodeOnly, playerIdToDisplayCode }, ref) => {
  const isTeams = bracketsTeams != null;
  const formatStyles = useMemo(
    () => formatStylesForFormat(format),
    [format],
  );
  const teamStyle = useMemo(
    () => teamIDStyleFromFormat(formatStyles),
    [formatStyles],
  );
  const individualsTextStyles = useMemo(
    () => ({
      playerId: formatStyles.playerId,
      playerText: formatStyles.playerText,
    }),
    [formatStyles],
  );

  if (isTeams) {
    const sorted = [...bracketsTeams].sort((a, b) => a.index - b.index);
    const pairs: Array<{ left: BracketWithTeams; right?: BracketWithTeams }> = [];
    for (let i = 0; i < sorted.length; i += 2) {
      pairs.push({ left: sorted[i], right: sorted[i + 1] });
    }
    const isDivisionG = divisionName === "Division G";
    /** Division G needs a wider fixed width so the bracket pair isn't clipped; max-content fails off-screen. */
    const teamsBookletBracketStyle: React.CSSProperties =
      format === "booklet" && isDivisionG
        ? {
            ...bracketContainerStyle,
            width: 1500,
            minWidth: 1500,
            overflow: "visible",
          }
        : bracketContainerStyle;
    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 1200,
          background: "white",
        }}
      >
        {format === "booklet" ? (
          pairs.map(({ left, right }) => (
            <div
              key={left.id}
              data-export-page
              data-division-name={divisionName}
              data-group-title={groupTitleText(
                left.index,
                right?.index,
                left.title,
              )}
              style={{
                width: 1200,
                minHeight: "100vh",
                background: "white",
                ...pageContainerStyle,
              }}
            >
              <header style={{ ...titleContainerStyle, flexShrink: 0 }}>
                <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                  {divisionName}
                </Title>
                <Title order={3} style={{ fontSize: 18 }}>
                  {groupTitleText(left.index, right?.index, left.title)}
                </Title>
              </header>
              <div data-export-bracket style={teamsBookletBracketStyle}>
                <Group align="center" gap="lg" wrap="nowrap">
                  <Box style={isDivisionG ? { flexShrink: 0 } : undefined}>
                    <CollapsedLeft.Teams
                      size={teamSize(left.num_players)}
                      teams={toUITeamNames(left)}
                      teamIDFontFamily={teamStyle.teamIDFontFamily}
                      teamIDColor={teamStyle.teamIDColor}
                      teamIDFontSize={teamStyle.teamIDFontSize}
                    />
                  </Box>
                  {right && (
                    <Box style={isDivisionG ? { flexShrink: 0 } : undefined}>
                      <CollapsedRight.Teams
                        size={teamSize(right.num_players)}
                        teams={toUITeamNames(right)}
                        teamIDFontFamily={teamStyle.teamIDFontFamily}
                        teamIDColor={teamStyle.teamIDColor}
                        teamIDFontSize={teamStyle.teamIDFontSize}
                      />
                    </Box>
                  )}
                </Group>
              </div>
            </div>
          ))
        ) : (
          sorted.map((b) => (
            <div
              key={b.id}
              data-export-page
              data-division-name={divisionName}
              data-group-title={groupTitleText(b.index, undefined, b.title)}
              style={{
                width: "max-content",
                minWidth: 1200,
                background: "white",
                ...pageContainerStyle,
              }}
            >
              <header style={{ ...titleContainerStyle, flexShrink: 0 }}>
                <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                  {divisionName}
                </Title>
                <Title order={3} style={{ fontSize: 18 }}>
                  {groupTitleText(b.index, undefined, b.title)}
                </Title>
              </header>
              <div
                data-export-bracket
                style={{
                  width: "100%",
                  marginBottom: PAGE_MARGIN,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Expanded.Teams
                  size={teamSize(b.num_players)}
                  teams={toUITeamNames(b)}
                  fontFamily={teamStyle.teamIDFontFamily}
                  teamIDColor={teamStyle.teamIDColor}
                  teamIDFontSize={teamStyle.teamIDFontSize}
                />
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  const sorted = [...(brackets ?? [])].sort((a, b) => a.index - b.index);
  const pairs: Array<{ left: BracketWithPlayers; right?: BracketWithPlayers }> =
    [];
  for (let i = 0; i < sorted.length; i += 2) {
    pairs.push({ left: sorted[i], right: sorted[i + 1] });
  }

  const toPlayers = (b: BracketWithPlayers) =>
    clubAbbrevByName
      ? toUIPlayersWithClubAbbrev(b, clubAbbrevByName, useCodeOnly, playerIdToDisplayCode)
      : toUIPlayers(b, useCodeOnly, playerIdToDisplayCode);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 1200,
        background: "white",
      }}
    >
      {format === "booklet" ? (
        pairs.map(({ left, right }) => (
          <div
            key={left.id}
            data-export-page
            data-division-name={divisionName}
            data-group-title={groupTitleText(
              left.index,
              right?.index,
              left.title,
            )}
            style={{
              width: 1200,
              minHeight: "100vh",
              background: "white",
              ...pageContainerStyle,
            }}
          >
            <header style={{ ...titleContainerStyle, flexShrink: 0 }}>
              <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                {divisionName}
              </Title>
              <Title order={3} style={{ fontSize: 18 }}>
                {groupTitleText(left.index, right?.index, left.title)}
              </Title>
            </header>
            <div data-export-bracket style={bracketContainerStyle}>
              <Group align="center" gap="lg" wrap="nowrap">
                <Box>
                  <CollapsedLeft.Individuals
                    size={left.num_players}
                    players={toPlayers(left)}
                    textStyles={individualsTextStyles}
                  />
                </Box>
                {right && (
                  <Box>
                    <CollapsedRight.Individuals
                      size={right.num_players}
                      players={toPlayers(right)}
                      textStyles={individualsTextStyles}
                    />
                  </Box>
                )}
              </Group>
            </div>
          </div>
        ))
      ) : (
        sorted.map((b) => (
          <div
            key={b.id}
            data-export-page
            data-division-name={divisionName}
            data-group-title={groupTitleText(b.index, undefined, b.title)}
            style={{
              width: "max-content",
              minWidth: 1200,
              background: "white",
              ...pageContainerStyle,
            }}
          >
            <header style={{ ...titleContainerStyle, flexShrink: 0 }}>
              <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                {divisionName}
              </Title>
              <Title order={3} style={{ fontSize: 18 }}>
                {groupTitleText(b.index, undefined, b.title)}
              </Title>
            </header>
            <div
              data-export-bracket
              style={{
                width: "100%",
                marginBottom: PAGE_MARGIN,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Expanded.Individuals
                size={b.num_players}
                players={toPlayers(b)}
                textStyles={individualsTextStyles}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
});
BracketsExportCanvas.displayName = "BracketsExportCanvas";
