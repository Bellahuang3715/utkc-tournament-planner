import { format, parseISO } from 'date-fns';

/** DateTimePicker may return a Date or "YYYY-MM-DD HH:mm:ss". */
export function toIsoFromPicker(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (!value) throw new Error("Missing date");
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
}

export function DateTime({ datetime }: { datetime: string }) {
  const date = parseISO(datetime);
  return <time dateTime={datetime}>{format(date, 'd LLLL yyyy HH:mm')}</time>;
}

export function Time({ datetime }: { datetime: string }) {
  const date = parseISO(datetime);
  return <time dateTime={datetime}>{format(date, 'HH:mm')}</time>;
}

export function formatTime(datetime: string) {
  return format(parseISO(datetime), 'HH:mm');
}
