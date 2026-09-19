import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next/pages';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SWRResponse } from 'swr';
import { v4 as uuidv4 } from 'uuid';

import CourtModal from '../../../components/modals/create_court_modal';
import { getTournamentIdFromRouter, responseIsValid } from '../../../components/utils/util';
import { Court } from '../../../interfaces/court';
import type {
  ScheduleBlock,
  ScheduleCustomBlock,
  SchedulePlacement,
  TimetableConfig,
} from '../../../interfaces/schedule_timetable';
import { getCourts, getScheduleTimetable, getTournamentById } from '../../../services/adapter';
import { deleteCourt, updateCourt } from '../../../services/court';
import { fetchScheduleBlocks } from '../../../services/division';
import { stringToColour } from '../../../services/lookups';
import { saveScheduleTimetable } from '../../../services/schedule_timetable';
import {
  buildSnapGridSlots,
  formatTimeLabelForAxis,
  getTimetableConfigKey,
  getSlotIndexForTime,
  mergeLeftColumnBoundaries,
  placementSpanSlots,
  SNAP_GRID_MINS,
  snapToNearestMinutes,
} from '../../../utils/schedule_timetable';
import TournamentLayout from '../_tournament_layout';

const DEFAULT_CONFIG: TimetableConfig = {
  startTime: '09:00',
  endTime: '17:00',
  intervalMins: 5,
};

/** Vertical scale: px per minute (~14px per 10‑min row; full 8h ≈ 670px tall). */
const PX_PER_MIN = 1.4;
const SLOT_HEIGHT_PX = PX_PER_MIN * SNAP_GRID_MINS;
const TIME_COL_WIDTH = 56;

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


/** Which placement (if any) starts at this court+slot */
function getPlacementAt(
  placements: SchedulePlacement[],
  courtId: number,
  slotIndex: number,
  slots: Array<{ index: number; startTime: Date }>
): SchedulePlacement | null {
  for (const p of placements) {
    if (p.courtId !== courtId) continue;
    const startSlot = getSlotIndexForTime(
      slots.map((s) => ({ startTime: s.startTime })),
      p.startTime,
      SNAP_GRID_MINS
    );
    const span = placementSpanSlots(p.durationMins, SNAP_GRID_MINS);
    if (startSlot <= slotIndex && slotIndex < startSlot + span) {
      return slotIndex === startSlot ? p : null; // only return at start
    }
  }
  return null;
}

/** Whether this court+slot is covered by any placement (so we don't allow drop) */
function isSlotCovered(
  placements: SchedulePlacement[],
  courtId: number,
  slotIndex: number,
  slots: { index: number; startTime: Date }[]
): boolean {
  for (const p of placements) {
    if (p.courtId !== courtId) continue;
    const startSlot = getSlotIndexForTime(
      slots.map((s) => ({ startTime: s.startTime })),
      p.startTime,
      SNAP_GRID_MINS
    );
    const span = placementSpanSlots(p.durationMins, SNAP_GRID_MINS);
    if (slotIndex >= startSlot && slotIndex < startSlot + span) return true;
  }
  return false;
}

/** Check if dropping at (courtId, slotStartTime) would overlap any existing placement */
function wouldOverlap(
  placements: SchedulePlacement[],
  courtId: number,
  slotStartTime: Date,
  durationMins: number,
  _intervalMins: number,
  excludePlacementId?: string
): boolean {
  const slotEnd = new Date(slotStartTime.getTime() + durationMins * 60 * 1000);
  for (const p of placements) {
    if (p.id === excludePlacementId || p.courtId !== courtId) continue;
    const pStart = new Date(p.startTime);
    const pEnd = new Date(pStart.getTime() + p.durationMins * 60 * 1000);
    if (slotStartTime.getTime() < pEnd.getTime() && slotEnd.getTime() > pStart.getTime())
      return true;
  }
  return false;
}

function getConfigEndTime(config: TimetableConfig, date: Date) {
  const [endH, endM] = config.endTime.split(':').map(Number);
  const d = new Date(date);
  d.setHours(endH, endM, 0, 0);
  return d;
}

function maxDurationMinsAllowed(args: {
  placements: SchedulePlacement[];
  placementId?: string;
  courtId: number;
  startTime: Date;
  endOfDay: Date;
}): number {
  const { placements, placementId, courtId, startTime, endOfDay } = args;
  let limit = endOfDay.getTime();
  for (const p of placements) {
    if (p.id === placementId || p.courtId !== courtId) continue;
    const pStart = new Date(p.startTime).getTime();
    if (pStart > startTime.getTime() && pStart < limit) limit = pStart;
  }
  return Math.max(0, Math.floor((limit - startTime.getTime()) / 60000));
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
  isDragging,
}: {
  block: ScheduleBlock;
  isDragging?: boolean;
}) {
  const color = stringToColour(String(block.divisionId));
  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      style={{
        opacity: isDragging ? 0.8 : 1,
        backgroundColor: `var(--mantine-color-${color}-1)`,
        borderColor: `var(--mantine-color-${color}-3)`,
      }}
    >
      <Text size="sm" fw={600}>
        {block.divisionName} – {block.bracketName}
      </Text>
      <Text size="xs" c="dimmed">
        {block.estimatedMins} mins ({block.numPlayers} players)
      </Text>
    </Card>
  );
}

function PlacedBlockCard({
  placement,
  onRemove,
  onResizeStart,
  isDragging,
}: {
  placement: SchedulePlacement;
  onRemove: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}) {
  const color =
    placement.kind === 'division' && placement.divisionId != null
      ? stringToColour(String(placement.divisionId))
      : 'gray';
  return (
    <Card
      withBorder
      padding="xs"
      radius="md"
      style={{
        opacity: isDragging ? 0.9 : 1,
        backgroundColor: `var(--mantine-color-${color}-1)`,
        borderColor: `var(--mantine-color-${color}-3)`,
        height: '100%',
        minHeight: 28,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="xs" fw={600} lineClamp={1}>
          {placement.label}
        </Text>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="red"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <IconTrash size={12} />
        </ActionIcon>
      </Group>
      <Text size="xs" c="dimmed">
        {placement.durationMins} mins
      </Text>
      <div
        onMouseDown={onResizeStart}
        style={{
          marginTop: 6,
          height: 10,
          cursor: 'ns-resize',
          borderTop: '1px dashed var(--mantine-color-default-border)',
          opacity: 0.8,
        }}
        title="Drag to resize"
      />
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
  /** Day anchor for the timetable grid (tournament start day, or today). */
  const scheduleDate = useMemo(() => {
    if (tournamentStartTime) {
      const d = new Date(tournamentStartTime);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return new Date();
  }, [tournamentStartTime]);

  const [config, setConfigState] = useState<TimetableConfig>(() =>
    loadConfig(tournamentData.id)
  );
  const [placements, setPlacements] = useState<SchedulePlacement[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [customBlocks, setCustomBlocks] = useState<ScheduleCustomBlock[]>([]);
  const [customLabel, setCustomLabel] = useState('Break / Buffer');
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [courtToRename, setCourtToRename] = useState<Court | null>(null);
  const [renameCourtName, setRenameCourtName] = useState('');
  const [resizing, setResizing] = useState<{
    placementId: string;
    startY: number;
    baseDuration: number;
  } | null>(null);

  useEffect(() => {
    setConfigState(loadConfig(tournamentData.id));
    setConfigLoaded(true);
    setScheduleLoaded(false);
  }, [tournamentData.id]);

  useEffect(() => {
    if (!responseIsValid(swrSchedule)) return;
    const data = swrSchedule.data?.data;
    const nextPlacements: SchedulePlacement[] = (data?.placements ?? []).map((p: any) => ({
      id: String(p.id ?? uuidv4()),
      courtId: Number(p.court_id ?? p.courtId),
      startTime: String(p.start_time ?? p.startTime),
      kind: p.kind === 'custom' ? 'custom' : 'division',
      divisionId: p.division_id ?? p.divisionId,
      bracketId: p.bracket_id ?? p.bracketId,
      label: String(p.label ?? 'Block'),
      durationMins: Number(p.duration_mins ?? p.durationMins ?? 0),
    }));
    const nextCustomBlocks: ScheduleCustomBlock[] = (data?.custom_blocks ?? data?.customBlocks ?? []).map(
      (b: any) => ({
        id: String(b.id ?? uuidv4()),
        label: String(b.label ?? 'Custom'),
        durationMins: Number(b.duration_mins ?? b.durationMins ?? 30),
      })
    );
    setPlacements(nextPlacements);
    setCustomBlocks(nextCustomBlocks);
    setScheduleLoaded(true);
  }, [swrSchedule.data, swrSchedule.isValidating]);

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

  useEffect(() => {
    if (!scheduleLoaded) return;
    const timer = window.setTimeout(() => {
      void saveScheduleTimetable(tournamentData.id, {
        placements,
        customBlocks,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [scheduleLoaded, tournamentData.id, placements, customBlocks]);

  const slots = useMemo(
    () => buildSnapGridSlots(config, scheduleDate),
    [config.startTime, config.endTime, scheduleDate.getTime()]
  );

  const mergedLeftTimes = useMemo(
    () => mergeLeftColumnBoundaries(scheduleDate, config, placements, SNAP_GRID_MINS),
    [scheduleDate, config.startTime, config.endTime, placements]
  );

  const scheduleStartTime = slots[0]?.startTime;
  const courtColumnHeight = slots.length * SLOT_HEIGHT_PX;

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const placement = placements.find((p) => p.id === resizing.placementId);
      if (!placement) return;
      const deltaY = e.clientY - resizing.startY;
      const deltaMins = Math.round(deltaY / PX_PER_MIN);
      const endOfDay = getConfigEndTime(config, scheduleDate);
      const startTime = new Date(placement.startTime);
      const maxAllowed = maxDurationMinsAllowed({
        placements,
        placementId: placement.id,
        courtId: placement.courtId,
        startTime,
        endOfDay,
      });
      const nextDuration = Math.min(
        Math.max(1, resizing.baseDuration + deltaMins),
        maxAllowed
      );
      setPlacements((prev) =>
        prev.map((p) => (p.id === placement.id ? { ...p, durationMins: nextDuration } : p))
      );
    };
    const onUp = () => setResizing(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, placements, scheduleDate, config]);

  const handleDragEnd = useCallback(
    (result: { destination: { droppableId: string; index: number } | null; source: { droppableId: string; index: number }; draggableId: string }) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;

      const destMatch = destination.droppableId.match(/^cell-(\d+)-(\d+)$/);
      if (!destMatch) return;
      const courtId = Number(destMatch[1]);
      const slotIndex = Number(destMatch[2]);
      const rawSlot = slots[slotIndex]?.startTime;
      if (!rawSlot) return;
      const slotStartTime = snapToNearestMinutes(new Date(rawSlot), SNAP_GRID_MINS);

      const isFromSidebar = draggableId.startsWith('block-');
      const isFromCustomSidebar = draggableId.startsWith('custom-');
      const isFromGrid = draggableId.startsWith('placement-');

      if (isFromSidebar) {
        const part = draggableId.replace('block-', '');
        const [divisionIdStr, bracketIdStr] = part.split('-');
        const divisionId = Number(divisionIdStr);
        const bracketId = Number(bracketIdStr);
        const block = blocks.find((b) => b.divisionId === divisionId && b.bracketId === bracketId);
        if (!block) return;
        if (wouldOverlap(placements, courtId, slotStartTime, block.estimatedMins, SNAP_GRID_MINS)) {
          return;
        }
        const startTimeIso = slotStartTime.toISOString();
        setPlacements((prev) => [
          ...prev,
          {
            id: uuidv4(),
            courtId,
            startTime: startTimeIso,
            kind: 'division',
            divisionId: block.divisionId,
            bracketId: block.bracketId,
            divisionName: block.divisionName,
            bracketName: block.bracketName,
            label: `${block.divisionName} – ${block.bracketName}`,
            durationMins: block.estimatedMins,
          },
        ]);
        return;
      }

      if (isFromCustomSidebar) {
        const customId = draggableId.replace('custom-', '');
        const block = customBlocks.find((b) => b.id === customId);
        if (!block) return;
        if (wouldOverlap(placements, courtId, slotStartTime, block.durationMins, SNAP_GRID_MINS)) {
          return;
        }
        setPlacements((prev) => [
          ...prev,
          {
            id: uuidv4(),
            courtId,
            startTime: slotStartTime.toISOString(),
            kind: 'custom',
            label: block.label,
            durationMins: block.durationMins,
          },
        ]);
        return;
      }

      if (isFromGrid) {
        const placementId = draggableId.replace('placement-', '');
        const placement = placements.find((p) => p.id === placementId);
        if (!placement) return;
        if (wouldOverlap(placements, courtId, slotStartTime, placement.durationMins, SNAP_GRID_MINS, placement.id)) {
          return;
        }
        setPlacements((prev) =>
          prev.map((p) =>
            p.id === placementId
              ? { ...p, courtId, startTime: slotStartTime.toISOString() }
              : p
          )
        );
      }
    },
    [blocks, customBlocks, placements, slots]
  );

  const removePlacement = useCallback(
    (id: string) => {
      setPlacements((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  if (!responseIsValid(swrCourts)) return null;

  const slotRows = slots as { index: number; label: string; startTime: Date }[];

  const hasCourts = courts.length > 0;
  const startMs = scheduleStartTime?.getTime() ?? 0;

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="md">
        <Title order={3}>{t('planning_title')}</Title>
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

        <DragDropContext onDragEnd={handleDragEnd}>
        <Group align="flex-start" wrap="nowrap" style={{ alignItems: 'stretch' }}>
          {/* Timetable grid */}
          <Box style={{ flex: '1 1 auto', minWidth: 0, overflow: 'auto' }}>
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
            <Box
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${courts.length}, minmax(140px, 1fr))`,
                  gap: 0,
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Box
                  style={{
                    padding: '6px 8px',
                    borderRight: '1px solid var(--mantine-color-default-border)',
                    background: 'var(--mantine-color-default-hover)',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Time
                </Box>
                {courts.map((court) => (
                  <Box
                    key={court.id}
                    style={{
                      padding: '6px 8px',
                      borderRight: '1px solid var(--mantine-color-default-border)',
                      background: 'var(--mantine-color-default-hover)',
                      fontWeight: 600,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{court.name}</span>
                    <Menu withinPortal position="bottom-end" shadow="sm">
                      <Menu.Target>
                        <ActionIcon variant="transparent" size="sm" color="gray">
                          <IconDots size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconPencil size={14} />}
                          onClick={() => {
                            setCourtToRename(court);
                            setRenameCourtName(court.name);
                          }}
                        >
                          {t('rename_court')}
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={async () => {
                            await deleteCourt(tournamentData.id, court.id);
                            await swrCourts.mutate();
                          }}
                        >
                          {t('delete_court_button')}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Box>
                ))}
              </Box>

              <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
                <Box
                  style={{
                    width: TIME_COL_WIDTH,
                    flexShrink: 0,
                    position: 'relative',
                    height: courtColumnHeight,
                    borderRight: '1px solid var(--mantine-color-default-border)',
                    background: 'var(--mantine-color-body)',
                    paddingTop: 1,
                  }}
                >
                  {scheduleStartTime &&
                    mergedLeftTimes.map((t) => {
                      const topPx = ((t.getTime() - startMs) / 60000) * PX_PER_MIN;
                      return (
                        <Text
                          key={t.getTime()}
                          size="xs"
                          c="dimmed"
                          style={{
                            position: 'absolute',
                            left: 4,
                            top: topPx,
                            lineHeight: 1,
                            fontSize: 10,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                          }}
                        >
                          {formatTimeLabelForAxis(t)}
                        </Text>
                      );
                    })}
                </Box>

                {courts.map((court, cIdx) => (
                  <Box
                    key={court.id}
                    style={{
                      flex: '1 1 140px',
                      minWidth: 140,
                      position: 'relative',
                      height: courtColumnHeight,
                      borderRight:
                        cIdx < courts.length - 1
                          ? '1px solid var(--mantine-color-default-border)'
                          : undefined,
                      backgroundColor: 'var(--mantine-color-body)',
                      backgroundImage: `repeating-linear-gradient(
                        to bottom,
                        var(--mantine-color-default-border) 0,
                        var(--mantine-color-default-border) 1px,
                        transparent 1px,
                        transparent ${SLOT_HEIGHT_PX}px
                      )`,
                    }}
                  >
                    {slots.map((slot, rowIdx) => {
                      const covered = isSlotCovered(
                        placements,
                        court.id,
                        slot.index,
                        slotRows
                      );
                      const placementHere = getPlacementAt(
                        placements,
                        court.id,
                        slot.index,
                        slotRows
                      );
                      const visualHeightPx = placementHere
                        ? placementHere.durationMins * PX_PER_MIN
                        : SLOT_HEIGHT_PX;

                      if (placementHere) {
                        return (
                          <Box
                            key={`${court.id}-${slot.index}`}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: rowIdx * SLOT_HEIGHT_PX,
                              height: visualHeightPx,
                              padding: 1,
                              zIndex: 2,
                              boxSizing: 'border-box',
                            }}
                          >
                            <Droppable droppableId={`cell-${court.id}-${slot.index}`}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  style={{ height: '100%' }}
                                >
                                  <Draggable
                                    draggableId={`placement-${placementHere.id}`}
                                    index={0}
                                  >
                                    {(p, snapshot) => (
                                      <div
                                        ref={p.innerRef}
                                        {...p.draggableProps}
                                        {...p.dragHandleProps}
                                        style={{ height: '100%', ...p.draggableProps.style }}
                                      >
                                        <PlacedBlockCard
                                          placement={placementHere}
                                          onRemove={() => removePlacement(placementHere.id)}
                                          onResizeStart={(e) => {
                                            e.stopPropagation();
                                            setResizing({
                                              placementId: placementHere.id,
                                              startY: e.clientY,
                                              baseDuration: placementHere.durationMins,
                                            });
                                          }}
                                          isDragging={snapshot.isDragging}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </Box>
                        );
                      }

                      if (covered) {
                        return (
                          <Box
                            key={`${court.id}-${slot.index}`}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: rowIdx * SLOT_HEIGHT_PX,
                              height: SLOT_HEIGHT_PX,
                              background: 'var(--mantine-color-default-hover)',
                              zIndex: 0,
                            }}
                          />
                        );
                      }

                      return (
                        <Droppable
                          key={`${court.id}-${slot.index}`}
                          droppableId={`cell-${court.id}-${slot.index}`}
                        >
                          {(provided) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: rowIdx * SLOT_HEIGHT_PX,
                                height: SLOT_HEIGHT_PX,
                                minHeight: Math.max(4, SLOT_HEIGHT_PX - 1),
                                padding: 0,
                                zIndex: 1,
                                boxSizing: 'border-box',
                              }}
                            >
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Box>

            <Group mt="sm">
              <CourtModal
                tournamentId={tournamentData.id}
                swrCourtsResponse={swrCourts as SWRResponse}
                buttonSize="xs"
              />
            </Group>
            </>
            )}
          </Box>

          {/* Right sidebar: division-group blocks */}
          <Box
            style={{
              width: 260,
              flexShrink: 0,
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 8,
              padding: 12,
              background: 'var(--mantine-color-default-subtle)',
            }}
          >
            <Text size="sm" fw={600} mb="xs">
              Division – Group
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Drag onto the timetable
            </Text>
            <Droppable droppableId="sidebar-blocks">
              {(provided) => (
                <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
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
                  {customBlocks.map((b, idx) => (
                    <Draggable key={b.id} draggableId={`custom-${b.id}`} index={idx}>
                      {(p) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                          <Card withBorder padding="sm" radius="md">
                            <Text size="sm" fw={600} lineClamp={1}>
                              {b.label}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {b.durationMins} mins
                            </Text>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {blocks.map((block, idx) => (
                    <Draggable
                      key={`${block.divisionId}-${block.bracketId}`}
                      draggableId={`block-${block.divisionId}-${block.bracketId}`}
                      index={customBlocks.length + idx}
                    >
                      {(p, snapshot) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                          <ScheduleBlockCard block={block} isDragging={snapshot.isDragging} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
            {blocks.length === 0 && (
              <Text size="xs" c="dimmed">
                No divisions or brackets yet. Add them in Divisions.
              </Text>
            )}
          </Box>
        </Group>
        </DragDropContext>
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
