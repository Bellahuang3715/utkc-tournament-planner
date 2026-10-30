import { ActionIcon, Box, Button, ColorSwatch, Group, Menu, Modal, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Court } from '../../interfaces/court';
import type {
  SchedulePlacement,
  TimetableConfig,
} from '../../interfaces/schedule_timetable';
import { stringToColour } from '../../services/lookups';
import {
  PX_PER_MIN,
  SNAP_GRID_MINS,
  addMinutes,
  clampBlockToWindow,
  dayWindowEnd,
  dayWindowStart,
  formatTimeLabelForAxis,
  hasCourtCollision,
  halfHourMarksBetween,
  minutesBetween,
  snapDurationMins,
  snapToNearestMinutes,
} from '../../utils/schedule_timetable';

const TIME_GUTTER = 76;
const COURT_MIN_WIDTH = 148;
/** Room so the first and last time labels are not clipped by the grid edge. */
const AXIS_PAD = 16;

const COLOR_HEX: Record<string, string> = {
  pink: '#e64980',
  violet: '#7950f2',
  green: '#40c057',
  blue: '#228be6',
  red: '#fa5252',
  grape: '#be4bdb',
  indigo: '#4c6ef5',
  cyan: '#15aabf',
  orange: '#fd7e14',
  yellow: '#fab005',
  teal: '#12b886',
  gray: '#868e96',
};

export function colorForPlacement(p: SchedulePlacement): string {
  if (p.color) return p.color;
  if (p.kind === 'division' && p.divisionId != null) {
    return COLOR_HEX[stringToColour(String(p.divisionId))] ?? COLOR_HEX.blue;
  }
  return COLOR_HEX.gray;
}

export function colorForDivision(divisionId: number): string {
  return COLOR_HEX[stringToColour(String(divisionId))] ?? COLOR_HEX.blue;
}

/** Payload carried while dragging a new block from the sidebar. */
export type PaletteDragPayload =
  | {
      source: 'palette';
      kind: 'division';
      label: string;
      durationMins: number;
      divisionId: number;
      bracketId: number;
      divisionName: string;
      bracketName: string;
      color: string;
    }
  | {
      source: 'palette';
      kind: 'custom';
      label: string;
      durationMins: number;
      color: string;
    };

type MoveDrag = {
  mode: 'move';
  placementId: string;
  grabOffsetMins: number;
};

type ResizeDrag = {
  mode: 'resize';
  placementId: string;
  originStartIso: string;
};

type CreateDrag = {
  mode: 'create';
  courtId: number;
  originMins: number;
};

type ActiveDrag = MoveDrag | ResizeDrag | CreateDrag | null;

type Preview = {
  courtId: number;
  start: Date;
  durationMins: number;
  label: string;
  color: string;
  valid: boolean;
} | null;

export type CourtTimetableProps = {
  courts: Court[];
  placements: SchedulePlacement[];
  config: TimetableConfig;
  scheduleDate: Date;
  /** Hide drag, resize, and court-editing controls. */
  readOnly?: boolean;
  onPlacementsChange?: (next: SchedulePlacement[] | ((prev: SchedulePlacement[]) => SchedulePlacement[])) => void;
  onRemovePlacement?: (id: string) => void;
  /** External palette drag (set by sidebar on pointer down). */
  paletteDrag?: PaletteDragPayload | null;
  onPaletteDragEnd?: () => void;
  onRenameCourt?: (court: Court) => void;
  onDeleteCourt?: (court: Court) => void;
  onMoveCourt?: (courtId: number, direction: -1 | 1) => void;
};

function buildNewPlacement(
  payload: PaletteDragPayload,
  courtId: number,
  start: Date,
  id: string
): SchedulePlacement {
  if (payload.kind === 'division') {
    return {
      id,
      courtId,
      startTime: start.toISOString(),
      kind: 'division',
      label: payload.label,
      durationMins: payload.durationMins,
      divisionId: payload.divisionId,
      bracketId: payload.bracketId,
      divisionName: payload.divisionName,
      bracketName: payload.bracketName,
    };
  }
  return {
    id,
    courtId,
    startTime: start.toISOString(),
    kind: 'custom',
    label: payload.label,
    durationMins: payload.durationMins,
  };
}

export default function CourtTimetable({
  courts,
  placements,
  config,
  scheduleDate,
  readOnly = false,
  onPlacementsChange = () => {},
  onRemovePlacement = () => {},
  paletteDrag = null,
  onPaletteDragEnd = () => {},
  onRenameCourt,
  onDeleteCourt,
  onMoveCourt,
}: CourtTimetableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);
  const courtColRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const placementsRef = useRef(placements);
  placementsRef.current = placements;

  const [editing, setEditing] = useState<SchedulePlacement | null>(null);
  const [editStart, setEditStart] = useState('09:00');
  const [editEnd, setEditEnd] = useState('10:00');
  const [editColor, setEditColor] = useState(COLOR_HEX.blue);
  const [editError, setEditError] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const previewRef = useRef<Preview>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const updatePreview = useCallback((next: Preview) => {
    previewRef.current = next;
    setPreview(next);
  }, []);

  const windowStart = useMemo(
    () => dayWindowStart(scheduleDate, config.startTime),
    [scheduleDate, config.startTime]
  );
  const windowEnd = useMemo(
    () => dayWindowEnd(scheduleDate, config.endTime),
    [scheduleDate, config.endTime]
  );
  const totalMins = Math.max(30, minutesBetween(windowStart, windowEnd));
  const contentHeight = Number.isFinite(totalMins) ? totalMins * PX_PER_MIN : 30 * PX_PER_MIN;
  const gridHeight = contentHeight + AXIS_PAD * 2;

  const hourMarks = useMemo(
    () => halfHourMarksBetween(scheduleDate, config.startTime, config.endTime),
    [scheduleDate, config.startTime, config.endTime]
  );

  /** Include the configured end time so the axis ends cleanly (halfHourMarks stops before end). */
  const axisMarks = useMemo(() => {
    const marks = [...hourMarks];
    const endMs = windowEnd.getTime();
    if (!marks.some((m) => m.getTime() === endMs)) {
      marks.push(new Date(windowEnd));
    }
    return marks;
  }, [hourMarks, windowEnd]);

  const placementsByCourt = useMemo(() => {
    const map = new Map<number, SchedulePlacement[]>();
    for (const c of courts) map.set(c.id, []);
    for (const p of placements) {
      const list = map.get(p.courtId);
      if (list) list.push(p);
    }
    return map;
  }, [courts, placements]);

  const yToMins = useCallback(
    (clientY: number): number | null => {
      const body = gridBodyRef.current;
      if (!body) return null;
      const rect = body.getBoundingClientRect();
      const yInGrid = clientY - rect.top;
      const mins = (yInGrid - AXIS_PAD) / PX_PER_MIN;
      return Math.min(Math.max(mins, 0), totalMins);
    },
    [totalMins]
  );

  const clientToCourtId = useCallback(
    (clientX: number): number | null => {
      for (const [id, el] of courtColRefs.current.entries()) {
        const r = el.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right) return id;
      }
      return null;
    },
    []
  );

  const resolveDrop = useCallback(
    (
      clientX: number,
      clientY: number,
      durationMins: number,
      grabOffsetMins: number,
      excludeId?: string
    ): { courtId: number; start: Date; valid: boolean } | null => {
      const courtId = clientToCourtId(clientX);
      const minsFromTop = yToMins(clientY);
      if (courtId == null || minsFromTop == null) return null;

      let raw = addMinutes(windowStart, minsFromTop - grabOffsetMins);
      raw = snapToNearestMinutes(raw, SNAP_GRID_MINS);
      raw = clampBlockToWindow(raw, durationMins, windowStart, windowEnd);

      const valid = !hasCourtCollision(
        placementsRef.current,
        { courtId, startTime: raw.toISOString(), durationMins },
        excludeId
      );
      return { courtId, start: raw, valid };
    },
    [clientToCourtId, yToMins, windowStart, windowEnd]
  );

  // Palette drag over grid
  useEffect(() => {
    if (readOnly || !paletteDrag) {
      setGhost(null);
      updatePreview(null);
      return;
    }

    const onMove = (e: PointerEvent) => {
      setGhost({ x: e.clientX, y: e.clientY });
      const drop = resolveDrop(e.clientX, e.clientY, paletteDrag.durationMins, 0);
      if (!drop) {
        updatePreview(null);
        return;
      }
      updatePreview({
        courtId: drop.courtId,
        start: drop.start,
        durationMins: paletteDrag.durationMins,
        label: paletteDrag.label,
        color: paletteDrag.color,
        valid: drop.valid,
      });
    };

    const onUp = (e: PointerEvent) => {
      const drop = resolveDrop(e.clientX, e.clientY, paletteDrag.durationMins, 0);
      if (drop?.valid) {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `p-${Date.now()}`;
        const placement = buildNewPlacement(paletteDrag, drop.courtId, drop.start, id);
        onPlacementsChange((prev) => {
          if (placement.kind === 'division' && placement.divisionId != null) {
            const shared = prev.find(
              (p) => p.kind === 'division' && p.divisionId === placement.divisionId && p.color
            );
            if (shared?.color) placement.color = shared.color;
          }
          return [...prev, placement];
        });
      }
      updatePreview(null);
      setGhost(null);
      onPaletteDragEnd();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [readOnly, paletteDrag, resolveDrop, onPlacementsChange, onPaletteDragEnd, updatePreview]);

  // Move / resize / empty-create drag
  useEffect(() => {
    if (readOnly || !activeDrag) return;

    const onMove = (e: PointerEvent) => {
      const placementsNow = placementsRef.current;
      if (activeDrag.mode === 'move') {
        const p = placementsNow.find((x) => x.id === activeDrag.placementId);
        if (!p) return;
        setGhost({ x: e.clientX, y: e.clientY });
        const drop = resolveDrop(
          e.clientX,
          e.clientY,
          p.durationMins,
          activeDrag.grabOffsetMins,
          p.id
        );
        if (!drop) {
          updatePreview(null);
          return;
        }
        updatePreview({
          courtId: drop.courtId,
          start: drop.start,
          durationMins: p.durationMins,
          label: p.label,
          color: colorForPlacement(p),
          valid: drop.valid,
        });
      } else if (activeDrag.mode === 'resize') {
        const p = placementsNow.find((x) => x.id === activeDrag.placementId);
        if (!p) return;
        const minsFromTop = yToMins(e.clientY);
        if (minsFromTop == null) return;
        const origin = new Date(activeDrag.originStartIso);
        const originOffset = minutesBetween(windowStart, origin);
        let nextDur = snapDurationMins(minsFromTop - originOffset, SNAP_GRID_MINS);
        const maxDur = minutesBetween(origin, windowEnd);
        nextDur = Math.min(
          nextDur,
          Math.max(SNAP_GRID_MINS, Math.floor(maxDur / SNAP_GRID_MINS) * SNAP_GRID_MINS)
        );
        const valid = !hasCourtCollision(
          placementsNow,
          { courtId: p.courtId, startTime: origin.toISOString(), durationMins: nextDur },
          p.id
        );
        updatePreview({
          courtId: p.courtId,
          start: origin,
          durationMins: nextDur,
          label: p.label,
          color: colorForPlacement(p),
          valid,
        });
      } else if (activeDrag.mode === 'create') {
        const minsFromTop = yToMins(e.clientY);
        if (minsFromTop == null) return;
        const a = Math.min(activeDrag.originMins, minsFromTop);
        const b = Math.max(activeDrag.originMins, minsFromTop);
        let start = snapToNearestMinutes(addMinutes(windowStart, a), SNAP_GRID_MINS);
        let end = snapToNearestMinutes(addMinutes(windowStart, b), SNAP_GRID_MINS);
        if (end.getTime() <= start.getTime()) {
          end = addMinutes(start, SNAP_GRID_MINS);
        }
        const durationMins = snapDurationMins(minutesBetween(start, end), SNAP_GRID_MINS);
        start = clampBlockToWindow(start, durationMins, windowStart, windowEnd);
        const valid = !hasCourtCollision(placementsNow, {
          courtId: activeDrag.courtId,
          startTime: start.toISOString(),
          durationMins,
        });
        updatePreview({
          courtId: activeDrag.courtId,
          start,
          durationMins,
          label: 'Break / Buffer',
          color: COLOR_HEX.gray,
          valid,
        });
      }
    };

    const onUp = () => {
      const finalPreview = previewRef.current;
      if (finalPreview?.valid) {
        if (activeDrag.mode === 'move') {
          onPlacementsChange((prev) =>
            prev.map((p) =>
              p.id === activeDrag.placementId
                ? {
                    ...p,
                    courtId: finalPreview.courtId,
                    startTime: finalPreview.start.toISOString(),
                    durationMins: finalPreview.durationMins,
                  }
                : p
            )
          );
        } else if (activeDrag.mode === 'resize') {
          onPlacementsChange((prev) =>
            prev.map((p) =>
              p.id === activeDrag.placementId
                ? { ...p, durationMins: finalPreview.durationMins }
                : p
            )
          );
        } else if (activeDrag.mode === 'create') {
          const id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `p-${Date.now()}`;
          onPlacementsChange((prev) => [
            ...prev,
            {
              id,
              courtId: finalPreview.courtId,
              startTime: finalPreview.start.toISOString(),
              kind: 'custom',
              label: 'Break / Buffer',
              durationMins: finalPreview.durationMins,
            },
          ]);
        }
      }
      setActiveDrag(null);
      updatePreview(null);
      setGhost(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [
    readOnly,
    activeDrag,
    resolveDrop,
    yToMins,
    windowStart,
    windowEnd,
    onPlacementsChange,
    updatePreview,
  ]);

  const startMove = (placement: SchedulePlacement, clientY: number) => {
    const topMins = minutesBetween(windowStart, new Date(placement.startTime));
    const pointerMins = yToMins(clientY) ?? topMins;
    setActiveDrag({
      mode: 'move',
      placementId: placement.id,
      grabOffsetMins: pointerMins - topMins,
    });
  };

  const openEditor = (placement: SchedulePlacement) => {
    const start = new Date(placement.startTime);
    const end = addMinutes(start, placement.durationMins);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditStart(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    setEditEnd(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
    setEditColor(colorForPlacement(placement));
    setEditError(null);
    setEditing(placement);
  };

  const applyEditor = () => {
    if (!editing) return;
    const parse = (value: string): Date | null => {
      const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const hours = Number(match[1]);
      const mins = Number(match[2]);
      if (hours > 23 || mins > 59) return null;
      const d = new Date(scheduleDate);
      d.setHours(hours, mins, 0, 0);
      return d;
    };
    const rawStart = parse(editStart);
    const rawEnd = parse(editEnd);
    if (!rawStart || !rawEnd) {
      setEditError('Enter a valid start and end time.');
      return;
    }
    let start = snapToNearestMinutes(rawStart, SNAP_GRID_MINS);
    const end = snapToNearestMinutes(rawEnd, SNAP_GRID_MINS);
    let durationMins = minutesBetween(start, end);
    if (durationMins < SNAP_GRID_MINS) {
      setEditError('End time must be after the start time.');
      return;
    }
    durationMins = snapDurationMins(durationMins, SNAP_GRID_MINS);
    start = clampBlockToWindow(start, durationMins, windowStart, windowEnd);
    if (
      hasCourtCollision(
        placementsRef.current,
        {
          id: editing.id,
          courtId: editing.courtId,
          startTime: start.toISOString(),
          durationMins,
        },
        editing.id
      )
    ) {
      setEditError('That time overlaps another block on this court.');
      return;
    }
    const nextStart = start.toISOString();
    const divisionId = editing.divisionId;
    const isDivision = editing.kind === 'division' && divisionId != null;
    onPlacementsChange((prev) =>
      prev.map((p) => {
        const sameDivision =
          isDivision && p.kind === 'division' && p.divisionId === divisionId;
        if (p.id === editing.id) {
          return { ...p, startTime: nextStart, durationMins, color: editColor };
        }
        if (sameDivision) return { ...p, color: editColor };
        return p;
      })
    );
    setEditing(null);
  };

  const blockStyle = (start: Date, durationMins: number) => {
    const top = AXIS_PAD + minutesBetween(windowStart, start) * PX_PER_MIN;
    const height = Math.max(durationMins * PX_PER_MIN, 18);
    return { top, height };
  };

  return (
    <Box
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--mantine-color-body)',
        position: 'relative',
        userSelect: activeDrag || paletteDrag ? 'none' : undefined,
      }}
    >
      {/* Header row */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: `${TIME_GUTTER}px repeat(${courts.length}, minmax(${COURT_MIN_WIDTH}px, 1fr))`,
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-default-hover)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <Box style={{ borderRight: '1px solid var(--mantine-color-default-border)' }} />
        {courts.map((c, index) => (
          <Box
            key={c.id}
            px={6}
            py={6}
            style={{
              borderRight: '1px solid var(--mantine-color-default-border)',
              minWidth: 0,
            }}
          >
            {readOnly ? (
              <Text size="sm" fw={700} truncate ta="center" py={4}>
                {c.name}
              </Text>
            ) : (
            <Group gap={2} wrap="nowrap" justify="space-between" align="center">
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                disabled={index === 0 || !onMoveCourt}
                aria-label="Move court left"
                onClick={() => onMoveCourt?.(c.id, -1)}
              >
                <IconChevronLeft size={14} />
              </ActionIcon>
              <Text size="sm" fw={700} truncate style={{ flex: 1, textAlign: 'center' }}>
                {c.name}
              </Text>
              <Group gap={0} wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  disabled={index === courts.length - 1 || !onMoveCourt}
                  aria-label="Move court right"
                  onClick={() => onMoveCourt?.(c.id, 1)}
                >
                  <IconChevronRight size={14} />
                </ActionIcon>
                <Menu withinPortal position="bottom-end" shadow="sm">
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" color="gray" aria-label="Court actions">
                      <IconDots size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPencil size={14} />}
                      onClick={() => onRenameCourt?.(c)}
                    >
                      Rename
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => onDeleteCourt?.(c)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
            )}
          </Box>
        ))}
      </Box>

      <Box
        ref={scrollRef}
        style={{
          maxHeight: 560,
          overflow: 'auto',
        }}
      >
        <Box
          ref={gridBodyRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `${TIME_GUTTER}px repeat(${courts.length}, minmax(${COURT_MIN_WIDTH}px, 1fr))`,
            gridTemplateRows: `${gridHeight}px`,
            width: '100%',
            height: gridHeight,
            overflow: 'hidden',
          }}
        >
          {/* Time gutter */}
          <Box
            style={{
              position: 'relative',
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              borderRight: '1px solid var(--mantine-color-default-border)',
              background: 'var(--mantine-color-body)',
            }}
          >
            {axisMarks.map((mark) => {
              const top = AXIS_PAD + minutesBetween(windowStart, mark) * PX_PER_MIN;
              const isEnd = mark.getTime() === windowEnd.getTime();
              return (
                <Text
                  key={mark.getTime()}
                  size="xs"
                  c="dimmed"
                  style={{
                    position: 'absolute',
                    top: isEnd ? top - 12 : top - 8,
                    right: 8,
                    lineHeight: 1,
                  }}
                >
                  {formatTimeLabelForAxis(mark)}
                </Text>
              );
            })}
          </Box>

          {/* Court columns */}
          {courts.map((court) => (
            <Box
              key={court.id}
              ref={(el) => {
                if (el) courtColRefs.current.set(court.id, el);
                else courtColRefs.current.delete(court.id);
              }}
              style={{
                position: 'relative',
                minHeight: 0,
                height: '100%',
                overflow: 'hidden',
                borderRight: '1px solid var(--mantine-color-default-border)',
                backgroundImage:
                  'linear-gradient(to bottom, transparent calc(100% - 1px), var(--mantine-color-default-border) calc(100% - 1px))',
                backgroundSize: `100% ${30 * PX_PER_MIN}px`,
                backgroundPosition: `0 ${AXIS_PAD}px`,
                backgroundRepeat: 'repeat-y',
                cursor: readOnly ? 'default' : paletteDrag ? 'copy' : 'crosshair',
              }}
              onPointerDown={(e) => {
                if (readOnly || paletteDrag) return;
                if ((e.target as HTMLElement).closest('[data-schedule-block]')) return;
                const mins = yToMins(e.clientY);
                if (mins == null) return;
                e.preventDefault();
                setActiveDrag({
                  mode: 'create',
                  courtId: court.id,
                  originMins: mins,
                });
              }}
            >
              {/* Hour lines overlay */}
              {axisMarks.map((mark) => {
                const top = AXIS_PAD + minutesBetween(windowStart, mark) * PX_PER_MIN;
                const isHour = mark.getMinutes() === 0;
                const isEnd = mark.getTime() === windowEnd.getTime();
                return (
                  <Box
                    key={mark.getTime()}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top,
                      height: 0,
                      borderTop: `1px solid ${
                        isEnd
                          ? 'var(--mantine-color-dark-3)'
                          : isHour
                            ? 'var(--mantine-color-default-border)'
                            : 'color-mix(in srgb, var(--mantine-color-default-border) 55%, transparent)'
                      }`,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}

              {(placementsByCourt.get(court.id) ?? []).map((p) => {
                const isDragging =
                  activeDrag?.mode === 'move' && activeDrag.placementId === p.id;
                const isResizing =
                  activeDrag?.mode === 'resize' && activeDrag.placementId === p.id;
                const showPreviewInstead =
                  (isDragging || isResizing) && preview?.courtId === court.id;
                if (showPreviewInstead) return null;

                const start = new Date(p.startTime);
                const { top, height } = blockStyle(start, p.durationMins);
                const color = colorForPlacement(p);

                return (
                  <Box
                    key={p.id}
                    data-schedule-block
                    style={{
                      position: 'absolute',
                      left: 4,
                      right: 4,
                      top,
                      height,
                      borderRadius: 6,
                      background: color,
                      color: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                      cursor: readOnly ? 'default' : 'grab',
                      zIndex: 2,
                      opacity: isDragging ? 0.35 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onPointerDown={(e) => {
                      if (readOnly) return;
                      if ((e.target as HTMLElement).dataset.resizeHandle) return;
                      if ((e.target as HTMLElement).closest('button')) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const originX = e.clientX;
                      const originY = e.clientY;
                      let moved = false;
                      const onMove = (ev: PointerEvent) => {
                        if (moved) return;
                        const dx = ev.clientX - originX;
                        const dy = ev.clientY - originY;
                        if (Math.hypot(dx, dy) > 4) {
                          moved = true;
                          startMove(p, ev.clientY);
                        }
                      };
                      const onUp = () => {
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        if (!moved) openEditor(p);
                      };
                      window.addEventListener('pointermove', onMove);
                      window.addEventListener('pointerup', onUp);
                    }}
                  >
                    <Box
                      px={6}
                      pt={4}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                        <Text size="xs" fw={700} lineClamp={2} style={{ lineHeight: 1.2 }}>
                          {p.label}
                        </Text>
                        {!readOnly && (
                        <button
                          type="button"
                          title="Remove"
                          onPointerDown={(ev) => ev.stopPropagation()}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onRemovePlacement(p.id);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1,
                            opacity: 0.9,
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                        )}
                      </Box>
                      <Text size="xs" style={{ opacity: 0.9 }}>
                        {p.durationMins} mins
                      </Text>
                    </Box>
                    {!readOnly && (
                    <Box
                      data-resize-handle
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveDrag({
                          mode: 'resize',
                          placementId: p.id,
                          originStartIso: p.startTime,
                        });
                      }}
                      style={{
                        height: 10,
                        cursor: 'ns-resize',
                        background: 'rgba(0,0,0,0.18)',
                        flexShrink: 0,
                      }}
                    />
                    )}
                  </Box>
                );
              })}

              {/* Drop / move / create preview in this column */}
              {preview && preview.courtId === court.id && (
                <Box
                  style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    ...blockStyle(preview.start, preview.durationMins),
                    borderRadius: 6,
                    background: preview.color,
                    opacity: preview.valid ? 0.75 : 0.35,
                    outline: preview.valid ? '2px solid #fff' : '2px solid #fa5252',
                    color: '#fff',
                    zIndex: 4,
                    pointerEvents: 'none',
                    padding: '4px 6px',
                  }}
                >
                  <Text size="xs" fw={700} lineClamp={2}>
                    {preview.label}
                  </Text>
                  <Text size="xs">{preview.durationMins} mins</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Floating ghost while dragging from palette */}
      {ghost && paletteDrag && (
        <Box
          style={{
            position: 'fixed',
            left: ghost.x + 12,
            top: ghost.y + 12,
            zIndex: 1000,
            pointerEvents: 'none',
            padding: '8px 10px',
            borderRadius: 8,
            background: paletteDrag.color,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            maxWidth: 200,
          }}
        >
          <Text size="xs" fw={700} lineClamp={2}>
            {paletteDrag.label}
          </Text>
          <Text size="xs">{paletteDrag.durationMins} mins</Text>
        </Box>
      )}

      <Modal
        opened={editing != null}
        onClose={() => setEditing(null)}
        title={editing?.label ?? 'Edit block'}
      >
        <Stack gap="sm">
          <TextInput
            label="Start"
            type="time"
            value={editStart}
            onChange={(e) => setEditStart(e.currentTarget.value)}
          />
          <TextInput
            label="End"
            type="time"
            value={editEnd}
            onChange={(e) => setEditEnd(e.currentTarget.value)}
          />
          <div>
            <Text size="sm" fw={500} mb={6}>
              Color
            </Text>
            <SimpleGrid cols={6} spacing={8}>
              {Object.values(COLOR_HEX).map((hex) => (
                <ColorSwatch
                  key={hex}
                  color={hex}
                  component="button"
                  type="button"
                  onClick={() => setEditColor(hex)}
                  style={{
                    cursor: 'pointer',
                    outline: editColor.toLowerCase() === hex.toLowerCase() ? '2px solid #000' : undefined,
                    outlineOffset: 2,
                  }}
                />
              ))}
            </SimpleGrid>
            <TextInput
              mt="sm"
              label="Custom hex"
              value={editColor}
              onChange={(e) => setEditColor(e.currentTarget.value)}
            />
            {editing?.kind === 'division' && (
              <Text size="xs" c="dimmed" mt={6}>
                This color applies to every block in this division.
              </Text>
            )}
          </div>
          {editError && (
            <Text size="sm" c="red">
              {editError}
            </Text>
          )}
          <Button onClick={applyEditor}>Save</Button>
        </Stack>
      </Modal>
    </Box>
  );
}
