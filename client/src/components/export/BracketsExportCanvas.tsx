import React, { forwardRef } from "react";
import { Stack, Group, Box, Title } from "@mantine/core";
import { CollapsedLeft, CollapsedRight, Expanded } from "tournament-brackets-ui";
import { BracketWithPlayers } from "../../interfaces/bracket";
import { toUIPlayers } from "../../services/bracket";

type Format = "booklet" | "poster";

export const BracketsExportCanvas = forwardRef<
  HTMLDivElement,
  {
    divisionName: string;
    format: Format;
    brackets: BracketWithPlayers[];
  }
>(({ divisionName, format, brackets }, ref) => {
  const sorted = [...brackets].sort((a, b) => a.index - b.index);

  const pairs: Array<{ left: BracketWithPlayers; right?: BracketWithPlayers }> = [];
  for (let i = 0; i < sorted.length; i += 2) pairs.push({ left: sorted[i], right: sorted[i + 1] });

  return (
    <div
      ref={ref}
      style={{
        // keep it off-screen but still renderable for canvas
        position: "fixed",
        left: -10000,
        top: 0,
        width: 1200,
        background: "white",
        padding: 24,
      }}
    >
      <Stack gap="md">
        <Title order={3}>{divisionName}</Title>

        {format === "booklet" ? (
          <Stack gap="lg">
            {pairs.map(({ left, right }) => (
              <Stack key={left.id} gap="xs">
                <Title order={5}>
                  Group {left.index}
                  {right ? ` & ${right.index}` : ""}{" "}
                  {left.title ? `— ${left.title}` : ""}
                </Title>

                <Group align="flex-start" gap="lg" wrap="nowrap">
                  <Box>
                    <CollapsedLeft.Individuals
                      size={left.num_players}
                      players={toUIPlayers(left)}
                    />
                  </Box>

                  {right && (
                    <Box>
                      <CollapsedRight.Individuals
                        size={right.num_players}
                        players={toUIPlayers(right)}
                      />
                    </Box>
                  )}
                </Group>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Stack gap="lg">
            {sorted.map((b) => (
              <Stack key={b.id} gap="xs">
                <Title order={5}>
                  Group {b.index} {b.title ? `— ${b.title}` : ""}
                </Title>
                <Expanded.Individuals
                  size={b.num_players}
                  players={toUIPlayers(b)}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </div>
  );
});
BracketsExportCanvas.displayName = "BracketsExportCanvas";