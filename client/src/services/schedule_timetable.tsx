import { TournamentSchedulePayload } from '../interfaces/schedule_timetable';

import { createAxios, handleRequestError } from './adapter';

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
