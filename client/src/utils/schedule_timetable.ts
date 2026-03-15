import type { TimetableConfig, TimeSlot } from '../interfaces/schedule_timetable';

const STORAGE_KEY_PREFIX = 'schedule_timetable_';
const CONFIG_KEY_SUFFIX = '_config';

export function getTimetableStorageKey(tournamentId: number): string {
  return `${STORAGE_KEY_PREFIX}${tournamentId}`;
}

export function getTimetableConfigKey(tournamentId: number): string {
  return `${STORAGE_KEY_PREFIX}${tournamentId}${CONFIG_KEY_SUFFIX}`;
}

/** Generate time slots from config for a given date */
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

/** Number of slots a placement spans based on duration and interval */
export function placementSpanSlots(durationMins: number, intervalMins: number): number {
  return Math.max(1, Math.ceil(durationMins / intervalMins));
}

/** Find slot index for a given ISO start time and list of slots (with startTime) */
export function getSlotIndexForTime(
  slots: Array<{ startTime: Date }>,
  startTimeIso: string
): number {
  const t = new Date(startTimeIso).getTime();
  const exact = slots.findIndex((s) => s.startTime.getTime() === t);
  if (exact >= 0) return exact;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i].startTime.getTime() <= t) return i;
  }
  return 0;
}
