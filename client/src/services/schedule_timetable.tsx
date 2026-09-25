import {
  ScheduleCustomBlock,
  SchedulePlacement,
  TournamentSchedulePayload,
} from '../interfaces/schedule_timetable';

import { createAxios, handleRequestError } from './adapter';

export function parseScheduleTimetable(data: any): TournamentSchedulePayload {
  const placements: SchedulePlacement[] = (data?.placements ?? []).map((p: any) => ({
    id: String(p.id ?? ''),
    courtId: Number(p.court_id ?? p.courtId),
    startTime: String(p.start_time ?? p.startTime),
    kind: p.kind === 'custom' ? 'custom' : 'division',
    divisionId: p.division_id ?? p.divisionId ?? undefined,
    bracketId: p.bracket_id ?? p.bracketId ?? undefined,
    label: String(p.label ?? 'Block'),
    durationMins: Number(p.duration_mins ?? p.durationMins ?? 0),
    color: p.color ?? null,
  }));
  const customBlocks: ScheduleCustomBlock[] = (data?.custom_blocks ?? data?.customBlocks ?? []).map(
    (b: any) => ({
      id: String(b.id ?? ''),
      label: String(b.label ?? 'Custom'),
      durationMins: Number(b.duration_mins ?? b.durationMins ?? 30),
    }),
  );
  return { placements, customBlocks };
}

export async function fetchScheduleTimetable(
  tournament_id: number,
): Promise<TournamentSchedulePayload | null> {
  try {
    const axiosInstance = await createAxios();
    const res = await axiosInstance.get(`tournaments/${tournament_id}/schedule_timetable`);
    return parseScheduleTimetable(res.data?.data);
  } catch (error: any) {
    handleRequestError(error);
    return null;
  }
}

function toApiPayload(payload: TournamentSchedulePayload) {
  return {
    placements: payload.placements.map((p) => ({
      id: p.id,
      court_id: p.courtId,
      start_time: p.startTime,
      duration_mins: p.durationMins,
      kind: p.kind,
      label: p.label,
      division_id: p.divisionId ?? null,
      bracket_id: p.bracketId ?? null,
      color: p.color ?? null,
    })),
    custom_blocks: payload.customBlocks.map((b) => ({
      id: b.id,
      label: b.label,
      duration_mins: b.durationMins,
    })),
  };
}

export async function saveScheduleTimetable(
  tournament_id: number,
  payload: TournamentSchedulePayload
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(
      `tournaments/${tournament_id}/schedule_timetable`,
      toApiPayload(payload)
    );
  } catch (error: any) {
    handleRequestError(error);
  }
}
