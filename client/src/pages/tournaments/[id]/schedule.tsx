import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SWRResponse } from 'swr';
import { v4 as uuidv4 } from 'uuid';

import { PageHeader } from '../../../components/layout/page_header';
import CourtModal from '../../../components/modals/create_court_modal';
import CourtTimetable, {
  PaletteDragPayload,
  colorForDivision,
} from '../../../components/schedule/CourtTimetable';
import { getTournamentIdFromRouter, responseIsValid } from '../../../components/utils/util';
import { Court } from '../../../interfaces/court';
import type {
  ScheduleBlock,
  ScheduleCustomBlock,
  SchedulePlacement,
  TimetableConfig,
} from '../../../interfaces/schedule_timetable';
import {
  getCourts,
  getScheduleTimetable,
  getTournamentById,
  requestSucceeded,
} from '../../../services/adapter';
import { deleteCourt, reorderCourts, updateCourt } from '../../../services/court';
import { fetchScheduleBlocks } from '../../../services/division';
import { stringToColour } from '../../../services/lookups';
import { saveScheduleTimetable } from '../../../services/schedule_timetable';
import {
  SNAP_GRID_MINS,
  eliminationMatchCount,
  getTimetableConfigKey,
  snapDurationMins,
} from '../../../utils/schedule_timetable';
import TournamentLayout from '../_tournament_layout';

const DEFAULT_CONFIG: TimetableConfig = {
  startTime: '09:00',
  endTime: '17:00',
  intervalMins: 5,
};

function loadConfig(tournamentId: number): TimetableConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(getTimetableConfigKey(tournamentId));
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as TimetableConfig;
    return {
      startTime: parsed.startTime ?? DEFAULT_CONFIG.startTime,
      endTime: parsed.endTime ?? DEFAULT_CONFIG.endTime,
      intervalMins: parsed.intervalMins ?? DEFAULT_CONFIG.intervalMins,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(tournamentId: number, config: TimetableConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getTimetableConfigKey(tournamentId), JSON.stringify(config));
}

type SavedSchedule = {
  placements: SchedulePlacement[];
  customBlocks: ScheduleCustomBlock[];
};

function parseSavedSchedule(data: any): SavedSchedule {
  const placements: SchedulePlacement[] = (data?.placements ?? []).map((p: any) => ({
    id: String(p.id ?? uuidv4()),
    courtId: Number(p.court_id ?? p.courtId),
    startTime: String(p.start_time ?? p.startTime),
    kind: p.kind === 'custom' ? 'custom' : 'division',
    divisionId: p.division_id ?? p.divisionId,
    bracketId: p.bracket_id ?? p.bracketId,
    label: String(p.label ?? 'Block'),
    durationMins: Number(p.duration_mins ?? p.durationMins ?? 0),
    color: p.color ?? null,
  }));
  const customBlocks: ScheduleCustomBlock[] = (data?.custom_blocks ?? data?.customBlocks ?? []).map(
    (b: any) => ({
      id: String(b.id ?? uuidv4()),
      label: String(b.label ?? 'Custom'),
      durationMins: Number(b.duration_mins ?? b.durationMins ?? 30),
    })
  );
  return { placements, customBlocks };
}

function scheduleFingerprint(schedule: SavedSchedule): string {
  return JSON.stringify(schedule);
}

function TimetableConfigForm({
  tournamentId,
  config,
  setConfig,
}: {
  tournamentId: number;
  config: TimetableConfig;
  setConfig: (c: TimetableConfig) => void;
}) {
  const update = useCallback(
    (updates: Partial<TimetableConfig>) => {
      const next = { ...config, ...updates };
      setConfig(next);
      saveConfig(tournamentId, next);
    },
    [config, tournamentId, setConfig]
  );

  return (
    <Card withBorder p="sm" mb="md">
      <Group gap="lg" wrap="wrap">
        <NumberInput
          label="Start (hour)"
          min={0}
          max={23}
          value={parseInt(config.startTime.split(':')[0], 10)}
          onChange={(v) => {
            const h = String(Number(v) ?? 0).padStart(2, '0');
            update({ startTime: `${h}:${config.startTime.split(':')[1]}` });
          }}
          w={80}
        />
        <NumberInput
          label="Start (min)"
          min={0}
          max={59}
          step={5}
          value={parseInt(config.startTime.split(':')[1], 10)}
          onChange={(v) => {
            const m = String(Number(v) ?? 0).padStart(2, '0');
            update({ startTime: `${config.startTime.split(':')[0]}:${m}` });
          }}
          w={80}
        />
        <NumberInput
          label="End (hour)"
          min={0}
          max={23}
          value={parseInt(config.endTime.split(':')[0], 10)}
          onChange={(v) => {
            const h = String(Number(v) ?? 0).padStart(2, '0');
            update({ endTime: `${h}:${config.endTime.split(':')[1]}` });
          }}
          w={80}
        />
        <NumberInput
          label="End (min)"
          min={0}
          max={59}
          step={5}
          value={parseInt(config.endTime.split(':')[1], 10)}
          onChange={(v) => {
            const m = String(Number(v) ?? 0).padStart(2, '0');
            update({ endTime: `${config.endTime.split(':')[0]}:${m}` });
          }}
          w={80}
        />
      </Group>
    </Card>
  );
}

function ScheduleBlockCard({
  block,
  onDragStart,
}: {
  block: ScheduleBlock;
  onDragStart: (payload: PaletteDragPayload) => void;
}) {
  const color = stringToColour(String(block.divisionId));
  const durationMins = snapDurationMins(block.estimatedMins, SNAP_GRID_MINS);
  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      style={{
        backgroundColor: `var(--mantine-color-${color}-1)`,
        borderColor: `var(--mantine-color-${color}-3)`,
        cursor: 'grab',
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        onDragStart({
          source: 'palette',
          kind: 'division',
          label: `${block.divisionName} – ${block.bracketName}`,
          durationMins,
          divisionId: block.divisionId,
          bracketId: block.bracketId,
          divisionName: block.divisionName,
          bracketName: block.bracketName,
          color: colorForDivision(block.divisionId),
        });
      }}
    >
      <Text size="sm" fw={600}>
        {block.divisionName} – {block.bracketName}
      </Text>
      <Text size="xs" c="dimmed">
        {durationMins} mins ({eliminationMatchCount(block.numPlayers)} matches)
      </Text>
    </Card>
  );
}

export default function SchedulePage() {
  const { t } = useTranslation();
  const { tournamentData } = getTournamentIdFromRouter();
  const swrCourts = getCourts(tournamentData.id);
  const swrTournament = getTournamentById(tournamentData.id);
  const swrSchedule = getScheduleTimetable(tournamentData.id);

  const courts: Court[] = responseIsValid(swrCourts) ? swrCourts.data?.data ?? [] : [];
  const tournamentStartTime = responseIsValid(swrTournament)
    ? swrTournament.data?.data?.start_time
    : null;

  const scheduleDate = useMemo(() => {
    if (tournamentStartTime) {
      const d = new Date(tournamentStartTime);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  }, [tournamentStartTime]);

  const [config, setConfigState] = useState<TimetableConfig>(() => loadConfig(tournamentData.id));
  const [placements, setPlacements] = useState<SchedulePlacement[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [customBlocks, setCustomBlocks] = useState<ScheduleCustomBlock[]>([]);
  const [customLabel, setCustomLabel] = useState('Break / Buffer');
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [savedSchedule, setSavedSchedule] = useState<SavedSchedule>({
    placements: [],
    customBlocks: [],
  });
  const [saving, setSaving] = useState(false);
  const [courtToRename, setCourtToRename] = useState<Court | null>(null);
  const [renameCourtName, setRenameCourtName] = useState('');
  const [paletteDrag, setPaletteDrag] = useState<PaletteDragPayload | null>(null);

  useEffect(() => {
    setConfigState(loadConfig(tournamentData.id));
    setConfigLoaded(true);
    setScheduleLoaded(false);
  }, [tournamentData.id]);

  useEffect(() => {
    if (scheduleLoaded || !responseIsValid(swrSchedule)) return;
    const next = parseSavedSchedule(swrSchedule.data?.data);
    setPlacements(next.placements);
    setCustomBlocks(next.customBlocks);
    setSavedSchedule(next);
    setScheduleLoaded(true);
  }, [scheduleLoaded, swrSchedule.data, swrSchedule]);

  useEffect(() => {
    if (!tournamentData.id) return;
    fetchScheduleBlocks(tournamentData.id)
      .then(setBlocks)
      .catch(() => setBlocks([]));
  }, [tournamentData.id]);

  const setConfig = useCallback(
    (c: TimetableConfig) => {
      setConfigState(c);
      if (configLoaded) saveConfig(tournamentData.id, c);
    },
    [tournamentData.id, configLoaded]
  );

  const dirty = useMemo(
    () =>
      scheduleFingerprint({ placements, customBlocks }) !== scheduleFingerprint(savedSchedule),
    [placements, customBlocks, savedSchedule]
  );

  const saveSchedule = useCallback(async () => {
    setSaving(true);
    try {
      const next = { placements, customBlocks };
      const result = await saveScheduleTimetable(tournamentData.id, next);
      if (result && requestSucceeded(result)) {
        setSavedSchedule(next);
        showNotification({
          color: 'green',
          title: 'Schedule saved',
          message: 'Time blocks were saved.',
        });
      }
    } finally {
      setSaving(false);
    }
  }, [customBlocks, placements, tournamentData.id]);

  const cancelScheduleEdits = useCallback(() => {
    setPlacements(savedSchedule.placements);
    setCustomBlocks(savedSchedule.customBlocks);
  }, [savedSchedule]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const removePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const moveCourt = useCallback(
    async (courtId: number, direction: -1 | 1) => {
      const index = courts.findIndex((c) => c.id === courtId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= courts.length) return;
      const next = [...courts];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      await reorderCourts(
        tournamentData.id,
        next.map((c) => c.id)
      );
      await swrCourts.mutate();
    },
    [courts, tournamentData.id, swrCourts]
  );

  if (!responseIsValid(swrCourts)) return null;

  const hasCourts = courts.length > 0;

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="lg">
        <PageHeader
          title={t('schedule_title', 'Schedule')}
          description={t(
            'schedule_page_subtitle',
            'Set the day and match length, then place each block on a court.',
          )}
        />
        <TimetableConfigForm
          tournamentId={tournamentData.id}
          config={config}
          setConfig={setConfig}
        />

        <Modal
          opened={courtToRename != null}
          onClose={() => {
            setCourtToRename(null);
            setRenameCourtName('');
          }}
          title={t('rename_court')}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!courtToRename) return;
              const name = renameCourtName.trim();
              if (!name) return;
              await updateCourt(tournamentData.id, courtToRename.id, name);
              await swrCourts.mutate();
              setCourtToRename(null);
              setRenameCourtName('');
            }}
          >
            <TextInput
              label={t('name_input_label')}
              placeholder={t('court_name_input_placeholder')}
              value={renameCourtName}
              onChange={(ev) => setRenameCourtName(ev.currentTarget.value)}
              autoFocus
            />
            <Button type="submit" fullWidth mt="md" color="green">
              {t('save_button')}
            </Button>
          </form>
        </Modal>

        <Group align="flex-start" wrap="nowrap" style={{ alignItems: 'stretch' }}>
          <Box style={{ flex: '1 1 auto', minWidth: 0 }}>
            {!hasCourts && (
              <Stack align="center" gap="md" py="xl">
                <Text size="sm" c="dimmed">
                  {t('no_courts_description')}
                </Text>
                <CourtModal
                  tournamentId={tournamentData.id}
                  swrCourtsResponse={swrCourts as SWRResponse}
                  buttonSize="lg"
                />
              </Stack>
            )}

            {hasCourts && (
              <>
                <Group mb="sm" justify="space-between" align="center">
                  <Text size="sm" c={dirty ? 'orange' : 'dimmed'}>
                    {dirty ? 'Unsaved time block changes' : 'Time blocks are saved'}
                  </Text>
                  <Group gap="xs">
                    <Button
                      variant="default"
                      size="xs"
                      disabled={!dirty || saving}
                      onClick={cancelScheduleEdits}
                    >
                      Cancel
                    </Button>
                    <Button size="xs" disabled={!dirty} loading={saving} onClick={() => void saveSchedule()}>
                      Save
                    </Button>
                    <CourtModal
                      tournamentId={tournamentData.id}
                      swrCourtsResponse={swrCourts as SWRResponse}
                      buttonSize="xs"
                    />
                  </Group>
                </Group>

                <CourtTimetable
                  courts={courts}
                  placements={placements}
                  config={config}
                  scheduleDate={scheduleDate}
                  onPlacementsChange={setPlacements}
                  onRemovePlacement={removePlacement}
                  paletteDrag={paletteDrag}
                  onPaletteDragEnd={() => setPaletteDrag(null)}
                  onRenameCourt={(court) => {
                    setCourtToRename(court);
                    setRenameCourtName(court.name);
                  }}
                  onDeleteCourt={async (court) => {
                    setPlacements((prev) => prev.filter((p) => p.courtId !== court.id));
                    await deleteCourt(tournamentData.id, court.id);
                    await swrCourts.mutate();
                  }}
                  onMoveCourt={moveCourt}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  Drag blocks from the sidebar onto a court. Click a block to set its start, end,
                  and color (division color applies to every block in that division). Use ← → in
                  the header to reorder courts. Drag edges to resize. Overlaps are blocked.
                </Text>
              </>
            )}
          </Box>

          <Box
            style={{
              width: 260,
              flexShrink: 0,
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 8,
              padding: 12,
              background: 'var(--mantine-color-default-subtle)',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <Text size="sm" fw={600} mb="xs">
              Division – Group
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Drag onto a court column
            </Text>
            <Stack gap="xs">
              <Card withBorder padding="sm" radius="md">
                <Text size="sm" fw={600} mb={6}>
                  Custom blocks
                </Text>
                <Group gap="xs" align="end" wrap="nowrap">
                  <TextInput
                    label="Label"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <NumberInput
                    label="Mins"
                    min={5}
                    step={5}
                    value={customDuration}
                    onChange={(v) => setCustomDuration(Number(v) ?? 30)}
                    w={90}
                  />
                </Group>
                <Button
                  mt="sm"
                  size="xs"
                  fullWidth
                  onClick={() => {
                    const b: ScheduleCustomBlock = {
                      id: uuidv4(),
                      label: customLabel.trim() ? customLabel.trim() : 'Custom',
                      durationMins: Math.max(5, customDuration || 30),
                    };
                    setCustomBlocks((prev) => [b, ...prev]);
                  }}
                >
                  Add custom block
                </Button>
              </Card>

              {customBlocks.map((b) => (
                <Card
                  key={b.id}
                  withBorder
                  padding="sm"
                  radius="md"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if ((e.target as HTMLElement).closest('button')) return;
                    e.preventDefault();
                    setPaletteDrag({
                      source: 'palette',
                      kind: 'custom',
                      label: b.label,
                      durationMins: snapDurationMins(b.durationMins, SNAP_GRID_MINS),
                      color: '#868e96',
                    });
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {b.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {b.durationMins} mins
                      </Text>
                    </div>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomBlocks((prev) => prev.filter((x) => x.id !== b.id));
                      }}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}

              {blocks
                .filter(
                  (block) =>
                    !placements.some(
                      (p) =>
                        p.kind === 'division' &&
                        p.divisionId === block.divisionId &&
                        p.bracketId === block.bracketId
                    )
                )
                .map((block) => (
                  <ScheduleBlockCard
                    key={`${block.divisionId}-${block.bracketId}`}
                    block={block}
                    onDragStart={setPaletteDrag}
                  />
                ))}

              {blocks.length === 0 && (
                <Text size="xs" c="dimmed">
                  No divisions or brackets yet. Add them in Divisions.
                </Text>
              )}
              {blocks.length > 0 &&
                blocks.every((block) =>
                  placements.some(
                    (p) =>
                      p.kind === 'division' &&
                      p.divisionId === block.divisionId &&
                      p.bracketId === block.bracketId
                  )
                ) && (
                  <Text size="xs" c="dimmed">
                    Every group is on the schedule. Remove a block to place it again.
                  </Text>
                )}
            </Stack>
          </Box>
        </Group>
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
