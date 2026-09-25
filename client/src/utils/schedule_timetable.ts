import type { TimetableConfig, TimeSlot } from '../interfaces/schedule_timetable';

const STORAGE_KEY_PREFIX = 'schedule_timetable_';
const CONFIG_KEY_SUFFIX = '_config';

/** Internal placement/drag grid step (drops snap to these marks). */
export const SNAP_GRID_MINS = 10;

/** Vertical scale for the custom court timetable. */
export const PX_PER_MIN = 1.6;

export function getTimetableStorageKey(tournamentId: number): string {
  return `${STORAGE_KEY_PREFIX}${tournamentId}`;
}

export function getTimetableConfigKey(tournamentId: number): string {
  return `${STORAGE_KEY_PREFIX}${tournamentId}${CONFIG_KEY_SUFFIX}`;
}

/** Round a local time to the nearest `snapMins` boundary (e.g. 9:33 → 9:30 for 10 min). */
export function snapToNearestMinutes(date: Date, snapMins: number): Date {
  const ms = snapMins * 60 * 1000;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

/** Snap duration up/down to a positive multiple of snapMins. */
export function snapDurationMins(durationMins: number, snapMins: number = SNAP_GRID_MINS): number {
  return Math.max(snapMins, Math.round(durationMins / snapMins) * snapMins);
}

/** Single-elimination matches in a group: 9 players → 8 matches. */
export function eliminationMatchCount(count: number): number {
  return Math.max(0, Math.floor(count) - 1);
}

/**
 * Schedule block length: (match duration + margin) × elimination matches,
 * snapped to the timetable grid.
 */
export function estimateBlockMins(
  durationMins: number,
  marginMins: number,
  count: number,
): number {
  const matches = eliminationMatchCount(count);
  if (matches === 0) return 0;
  const raw = Math.max(0, durationMins + marginMins) * matches;
  return snapDurationMins(raw, SNAP_GRID_MINS);
}

/** Day window start as a Date on `scheduleDate` for `HH:mm`. */
export function dayWindowStart(scheduleDate: Date, startTimeHhMm: string): Date {
  const [h, m] = startTimeHhMm.split(':').map(Number);
  const d = new Date(scheduleDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export function dayWindowEnd(scheduleDate: Date, endTimeHhMm: string): Date {
  const [h, m] = endTimeHhMm.split(':').map(Number);
  const d = new Date(scheduleDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export function minutesBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 60000;
}

export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60 * 1000);
}

export type TimedBlock = {
  id?: string;
  courtId: number;
  startTime: string;
  durationMins: number;
};

/** True if two intervals on the same court overlap (touching edges OK). */
export function intervalsOverlap(
  aStart: Date,
  aMins: number,
  bStart: Date,
  bMins: number
): boolean {
  const a0 = aStart.getTime();
  const a1 = a0 + aMins * 60 * 1000;
  const b0 = bStart.getTime();
  const b1 = b0 + bMins * 60 * 1000;
  return a0 < b1 && b0 < a1;
}

/** True when applying these durations (start times unchanged) overlaps another block. */
export function placementDurationsOverlap(
  placements: TimedBlock[],
  durationById: ReadonlyMap<string, number>,
): boolean {
  const proposed = placements.map((p) => {
    if (!p.id) return p;
    const durationMins = durationById.get(p.id);
    return durationMins == null ? p : { ...p, durationMins };
  });
  for (const p of proposed) {
    if (!p.id || !durationById.has(p.id)) continue;
    if (hasCourtCollision(proposed, p, p.id)) return true;
  }
  return false;
}

/**
 * Set durations for the given placement ids. When `pushLater` is set, slide
 * each following block on the same court forward until nothing overlaps.
 * Start times stay put unless a block would overlap the one before it.
 */
export function applyPlacementDurations<T extends TimedBlock & { id: string }>(
  placements: T[],
  durationById: ReadonlyMap<string, number>,
  pushLater: boolean,
): T[] {
  const next = placements.map((p) => {
    const durationMins = durationById.get(p.id);
    return durationMins == null ? p : { ...p, durationMins };
  });
  if (!pushLater) return next;

  const byCourt = new Map<number, T[]>();
  for (const p of next) {
    const list = byCourt.get(p.courtId) ?? [];
    list.push({ ...p });
    byCourt.set(p.courtId, list);
  }

  const startById = new Map<string, string>();
  for (const list of byCourt.values()) {
    list.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
        a.id.localeCompare(b.id),
    );
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const prevEnd = addMinutes(new Date(prev.startTime), prev.durationMins);
      const cur = list[i];
      if (new Date(cur.startTime).getTime() < prevEnd.getTime()) {
        cur.startTime = prevEnd.toISOString();
        startById.set(cur.id, cur.startTime);
      }
    }
  }

  if (startById.size === 0) return next;
  return next.map((p) => {
    const startTime = startById.get(p.id);
    return startTime ? { ...p, startTime } : p;
  });
}

/** Hard-reject overlap check for a proposed placement. */
export function hasCourtCollision(
  placements: TimedBlock[],
  candidate: TimedBlock,
  excludeId?: string
): boolean {
  const start = new Date(candidate.startTime);
  for (const p of placements) {
    if (excludeId && p.id === excludeId) continue;
    if (p.courtId !== candidate.courtId) continue;
    if (intervalsOverlap(start, candidate.durationMins, new Date(p.startTime), p.durationMins)) {
      return true;
    }
  }
  return false;
}

/** Clamp a start so the whole block stays inside [windowStart, windowEnd]. */
export function clampBlockToWindow(
  start: Date,
  durationMins: number,
  windowStart: Date,
  windowEnd: Date
): Date {
  const endCap = windowEnd.getTime() - durationMins * 60 * 1000;
  const t = Math.min(Math.max(start.getTime(), windowStart.getTime()), endCap);
  return new Date(t);
}

/** All :00 and :30 marks from config start (exclusive of end) up to end time. */
export function halfHourMarksBetween(
  date: Date,
  startTimeStr: string,
  endTimeStr: string
): Date[] {
  const [sh, sm] = startTimeStr.split(':').map(Number);
  const [eh, em] = endTimeStr.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const out: Date[] = [];
  let m = startMinutes % 30 === 0 ? startMinutes : Math.ceil(startMinutes / 30) * 30;
  while (m < endMinutes) {
    const d = new Date(date);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    out.push(d);
    m += 30;
  }
  return out;
}

/**
 * Half-hour ticks by default; half-hour marks strictly inside a block’s [snappedStart, snappedEnd]
 * are removed; snapped starts/ends (10 min) are added — e.g. 9:00, 9:30, 10:00, 10:30 after a 33 min block at 9.
 */
export function mergeLeftColumnBoundaries(
  date: Date,
  config: TimetableConfig,
  placements: Array<{ startTime: string; durationMins: number }>,
  snapMins: number
): Date[] {
  const half = halfHourMarksBetween(date, config.startTime, config.endTime);
  const halfTimes = half.map((d) => d.getTime());
  const halfSet = new Set(halfTimes);

  const placementBounds: { s: number; e: number }[] = [];
  for (const p of placements) {
    const start = new Date(p.startTime);
    const sSnap = snapToNearestMinutes(start, snapMins).getTime();
    const endRaw = new Date(new Date(p.startTime).getTime() + p.durationMins * 60 * 1000);
    const eSnap = snapToNearestMinutes(endRaw, snapMins).getTime();
    placementBounds.push({ s: sSnap, e: eSnap });
  }

  for (const t of halfTimes) {
    for (const { s, e } of placementBounds) {
      if (s < t && t < e) halfSet.delete(t);
    }
  }

  const merged = new Set<number>([...halfSet]);
  for (const { s, e } of placementBounds) {
    merged.add(s);
    merged.add(e);
  }
  return Array.from(merged)
    .sort((a, b) => a - b)
    .map((ms) => new Date(ms));
}

/** Left-axis label, 12-hour clock with AM/PM (e.g. 9:00 AM, 2:30 PM). */
export function formatTimeLabelForAxis(d: Date): string {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate time slots from config for a given date.
 * Each row is one interval; the left column label is that row’s clock start time
 * (e.g. with a 10‑min interval: 9:00, 9:10, … — spacing set by `intervalMins`).
 */
export function buildTimeSlots(
  config: TimetableConfig,
  date: Date
): TimeSlot[] {
  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const slots: TimeSlot[] = [];
  let minutes = startMinutes;
  let index = 0;
  while (minutes < endMinutes) {
    const d = new Date(date);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const h = d.getHours();
    const m = d.getMinutes();
    const label =
      m === 0
        ? `${h}:00`
        : `${h}:${m.toString().padStart(2, '0')}`;
    slots.push({ index, label, startTime: new Date(d) });
    minutes += config.intervalMins;
    index += 1;
  }
  return slots;
}

/** Dense snap grid for drag/drop (see {@link SNAP_GRID_MINS}); left column uses {@link mergeLeftColumnBoundaries}. */
export function buildSnapGridSlots(config: TimetableConfig, date: Date): TimeSlot[] {
  return buildTimeSlots({ ...config, intervalMins: SNAP_GRID_MINS }, date);
}

/** Number of slots a placement spans based on duration and interval */
export function placementSpanSlots(durationMins: number, intervalMins: number): number {
  return Math.max(1, Math.ceil(durationMins / intervalMins));
}

/**
 * Map a placement start time to the nearest slot index for this grid.
 * Uses rounding to the nearest `intervalMins` step from the first slot.
 */
export function getSlotIndexForTime(
  slots: Array<{ startTime: Date }>,
  startTimeIso: string,
  intervalMins: number
): number {
  if (slots.length === 0) return 0;
  const t = new Date(startTimeIso).getTime();
  const base = slots[0].startTime.getTime();
  const last = slots[slots.length - 1].startTime.getTime();
  const stepMs = intervalMins * 60 * 1000;
  const snapped = Math.round((t - base) / stepMs) * stepMs + base;
  const snappedClamped = Math.min(Math.max(snapped, base), last);
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const diff = Math.abs(slots[i].startTime.getTime() - snappedClamped);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}
