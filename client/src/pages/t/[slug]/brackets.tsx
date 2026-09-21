import { Accordion, Badge, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useMemo, useState } from 'react';

import ParticipantTournamentLayout, {
  useParticipantTournamentSlug,
} from '../../../components/participant/ParticipantTournamentLayout';
import {
  ParticipantEmpty,
  ParticipantLoading,
  ParticipantPageTitle,
} from '../../../components/participant/ParticipantUi';
import { responseIsValid } from '../../../components/utils/util';
import {
  getPublicDivisionBracketsWithPlayers,
  getPublicDivisionBracketsWithTeams,
  getPublicDivisions,
} from '../../../services/adapter';

export default function ParticipantBracketsPage() {
  const { slug, preview } = useParticipantTournamentSlug();
  const [divisionId, setDivisionId] = useState<number | null>(null);

  const swrDivisions = getPublicDivisions(slug || null, preview);
  const divisions = responseIsValid(swrDivisions)
    ? swrDivisions.data.data ?? []
    : [];

  const selected = divisions.find((d: any) => d.id === divisionId) ?? null;
  const isTeams = selected?.division_type === 'TEAMS';

  const swrPlayers = getPublicDivisionBracketsWithPlayers(
    slug || null,
    preview,
    !isTeams && divisionId != null ? divisionId : null
  );
  const swrTeams = getPublicDivisionBracketsWithTeams(
    slug || null,
    preview,
    isTeams && divisionId != null ? divisionId : null
  );

  const brackets = useMemo(() => {
    if (isTeams) {
      return responseIsValid(swrTeams) ? swrTeams.data.data ?? [] : [];
    }
    return responseIsValid(swrPlayers) ? swrPlayers.data.data ?? [] : [];
  }, [isTeams, swrPlayers, swrTeams]);

  const loadingDivisions = !swrDivisions.data && !swrDivisions.error;
  const loadingBrackets =
    divisionId != null &&
    ((isTeams && !swrTeams.data && !swrTeams.error) ||
      (!isTeams && !swrPlayers.data && !swrPlayers.error));

  return (
    <ParticipantTournamentLayout>
      <ParticipantPageTitle
        title="Brackets"
        subtitle="Pick a division to see groups and seeding."
      />

      {loadingDivisions && <ParticipantLoading />}

      {!loadingDivisions && divisions.length === 0 && (
        <ParticipantEmpty>No divisions published yet.</ParticipantEmpty>
      )}

      {divisionId == null && divisions.length > 0 && (
        <Stack gap="sm">
          {divisions.map((d: any) => (
            <UnstyledButton
              key={d.id}
              onClick={() => setDivisionId(d.id)}
              style={{
                display: 'block',
                width: '100%',
                borderRadius: 14,
                padding: '16px',
                border: '1px solid var(--mantine-color-default-border)',
                textAlign: 'left',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={700}>{d.name}</Text>
                  {d.prefix && (
                    <Text size="sm" c="dimmed">
                      Prefix {d.prefix}
                    </Text>
                  )}
                </div>
                <Badge variant="light">
                  {d.division_type === 'TEAMS' ? 'Teams' : 'Individuals'}
                </Badge>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      )}

      {selected && (
        <Stack gap="md">
          <UnstyledButton
            onClick={() => setDivisionId(null)}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text size="sm" c="blue">
              ← All divisions
            </Text>
          </UnstyledButton>
          <Text fw={700} size="lg">
            {selected.name}
          </Text>

          {loadingBrackets && <ParticipantLoading />}

          {!loadingBrackets && brackets.length === 0 && (
            <ParticipantEmpty>No brackets generated for this division yet.</ParticipantEmpty>
          )}

          {!loadingBrackets && brackets.length > 0 && (
            <Accordion variant="separated" radius="md" multiple>
              {brackets.map((b: any) => {
                const title = b.title?.trim()
                  ? b.title
                  : `Group ${b.index}`;
                const slots = isTeams ? b.teams ?? [] : b.players ?? [];
                return (
                  <Accordion.Item key={b.id} value={String(b.id)}>
                    <Accordion.Control>
                      <Text fw={600}>{title}</Text>
                      <Text size="xs" c="dimmed">
                        {slots.length} {isTeams ? 'teams' : 'players'}
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={8}>
                        {slots.length === 0 && (
                          <Text size="sm" c="dimmed">
                            Empty group
                          </Text>
                        )}
                        {[...slots]
                          .sort(
                            (a: any, bSlot: any) =>
                              (a.bracket_idx ?? 0) - (bSlot.bracket_idx ?? 0)
                          )
                          .map((slot: any, idx: number) => (
                            <Group
                              key={`${b.id}-${slot.player_id ?? slot.team_id ?? idx}`}
                              justify="space-between"
                              wrap="nowrap"
                              gap="sm"
                            >
                              <div style={{ minWidth: 0 }}>
                                <Text size="sm" fw={600} truncate>
                                  {slot.name ||
                                    slot.code ||
                                    (isTeams ? `Team ${slot.team_id}` : 'TBD')}
                                </Text>
                                {!isTeams && slot.club && (
                                  <Text size="xs" c="dimmed" truncate>
                                    {slot.club}
                                  </Text>
                                )}
                              </div>
                              {(slot.code || slot.participant_number) && (
                                <Badge variant="light" size="sm">
                                  {slot.code || slot.participant_number}
                                </Badge>
                              )}
                            </Group>
                          ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </Stack>
      )}
    </ParticipantTournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
