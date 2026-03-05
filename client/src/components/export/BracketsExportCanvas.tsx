import React, { forwardRef } from "react";
import { Group, Box, Title } from "@mantine/core";
import { CollapsedLeft, CollapsedRight, Expanded } from "tournament-brackets-ui";
import { BracketWithPlayers, BracketWithTeams } from "../../interfaces/bracket";
import {
  toUIPlayers,
  toUIPlayersWithClubAbbrev,
  toUITeamNames,
} from "../../services/bracket";

type Format = "booklet" | "poster";

type BracketsExportCanvasProps = {
  divisionName: string;
  format: Format;
  /** For individuals divisions */
  brackets?: BracketWithPlayers[];
  /** When provided (e.g. for individuals booklet), club names are shown as abbreviations. */
  clubAbbrevByName?: Map<string, string>;
  /** For teams divisions */
  bracketsTeams?: BracketWithTeams[];
};

const teamSize = (n: number) =>
  n as 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16;

export const BracketsExportCanvas = forwardRef<
  HTMLDivElement,
  BracketsExportCanvasProps
>(({ divisionName, format, brackets, clubAbbrevByName, bracketsTeams }, ref) => {
  const isTeams = bracketsTeams != null;

  if (isTeams) {
    const sorted = [...bracketsTeams].sort((a, b) => a.index - b.index);
    const pairs: Array<{ left: BracketWithTeams; right?: BracketWithTeams }> = [];
    for (let i = 0; i < sorted.length; i += 2) {
      pairs.push({ left: sorted[i], right: sorted[i + 1] });
    }
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
              style={{
                width: 1200,
                minHeight: "100vh",
                background: "white",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <header style={{ flexShrink: 0, marginBottom: 16 }}>
                <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                  {divisionName}
                </Title>
                <Title order={3} style={{ fontSize: 18 }}>
                  Group {left.index}
                  {right ? ` & ${right.index}` : ""}
                  {left.title ? ` — ${left.title}` : ""}
                </Title>
              </header>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 0,
                }}
              >
                <Group align="flex-start" gap="lg" wrap="nowrap">
                  <Box>
                    <CollapsedLeft.Teams
                      size={teamSize(left.num_players)}
                      teams={toUITeamNames(left)}
                    />
                  </Box>
                  {right && (
                    <Box>
                      <CollapsedRight.Teams
                        size={teamSize(right.num_players)}
                        teams={toUITeamNames(right)}
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
              style={{
                width: "max-content",
                minWidth: 1200,
                background: "white",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <header style={{ flexShrink: 0, marginBottom: 16 }}>
                <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                  {divisionName}
                </Title>
                <Title order={3} style={{ fontSize: 18 }}>
                  Group {b.index}
                  {b.title ? ` — ${b.title}` : ""}
                </Title>
              </header>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Expanded.Teams
                  size={teamSize(b.num_players)}
                  teams={toUITeamNames(b)}
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
      ? toUIPlayersWithClubAbbrev(b, clubAbbrevByName)
      : toUIPlayers(b);

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
            style={{
              width: 1200,
              minHeight: "100vh",
              background: "white",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <header style={{ flexShrink: 0, marginBottom: 16 }}>
              <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                {divisionName}
              </Title>
              <Title order={3} style={{ fontSize: 18 }}>
                Group {left.index}
                {right ? ` & ${right.index}` : ""}
                {left.title ? ` — ${left.title}` : ""}
              </Title>
            </header>
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 0,
              }}
            >
              <Group align="flex-start" gap="lg" wrap="nowrap">
                <Box>
                  <CollapsedLeft.Individuals
                    size={left.num_players}
                    players={toPlayers(left)}
                  />
                </Box>
                {right && (
                  <Box>
                    <CollapsedRight.Individuals
                      size={right.num_players}
                      players={toPlayers(right)}
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
            style={{
              width: "max-content",
              minWidth: 1200,
              background: "white",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <header style={{ flexShrink: 0, marginBottom: 16 }}>
              <Title order={1} style={{ fontSize: 28, marginBottom: 8 }}>
                {divisionName}
              </Title>
              <Title order={3} style={{ fontSize: 18 }}>
                Group {b.index}
                {b.title ? ` — ${b.title}` : ""}
              </Title>
            </header>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Expanded.Individuals
                size={b.num_players}
                players={toPlayers(b)}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
});
BracketsExportCanvas.displayName = "BracketsExportCanvas";
