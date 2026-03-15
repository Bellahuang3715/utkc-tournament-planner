/** Timetable configuration: start/end time and interval for the schedule grid */
export interface TimetableConfig {
  startTime: string; // "HH:mm"
  endTime: string;
  intervalMins: number;
}

/** A division–group (bracket) block shown in the sidebar; user drags these onto the grid */
export interface ScheduleBlock {
  kind: 'division';
  divisionId: number;
  bracketId: number;
  divisionName: string;
  bracketName: string;
  numPlayers: number;
  minsPerPlayer: number;
  estimatedMins: number;
}

/** A block placed on the timetable (court + start time) */
export interface SchedulePlacement {
  id: string;
  courtId: number;
  startTime: string; // ISO datetime
  kind: 'division' | 'custom';
  divisionId?: number;
  bracketId?: number;
  divisionName?: string;
  bracketName?: string;
  label: string;
  durationMins: number; // rendered height; for division placement equals estimatedMins
}

export interface TimeSlot {
  index: number;
  label: string;
  startTime: Date;
}
