import { createAxios, handleRequestError } from './adapter';
import type { DivisionCreateValues, DivisionFormValues, DivisionPlayer, DivisionTeam } from '../interfaces/division';
import type { ScheduleBlock } from '../interfaces/schedule_timetable';

export async function createDivision(values: DivisionCreateValues) {
  try {
    const axios = await createAxios();
    return await axios.post('divisions', values);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function updateDivision(division_id: number, values: DivisionFormValues) {
  try {
    const axios = await createAxios();
    return await axios.put(`divisions/${division_id}`, values);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function deleteDivision(division_id: number) {
  try {
    const axios = await createAxios();
    return await axios.delete(`divisions/${division_id}`);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function addPlayersToDivision(division_id: number, player_ids: Array<number | string>, bias_player_ids?: Array<number | string>) {
  try {
    const axios = await createAxios();
    return await axios.post(`divisions/${division_id}/players`, {
      player_ids: player_ids.map((x) => Number(x)),
      bias_player_ids: (bias_player_ids ?? []).map(Number),
    });
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function fetchDivisionPlayers(division_id: number) {
  try {
    const axios = await createAxios();
    return await axios.get<{ players: DivisionPlayer[] }>(
      `divisions/${division_id}/players`
    );
  } catch (err: any) {
    handleRequestError(err);
    throw err; // <-- IMPORTANT: keep return type consistent
  }
}

export async function addTeamsToDivision(
  division_id: number,
  team_ids: number[],
  bias_team_ids?: number[]
) {
  try {
    const axios = await createAxios();
    return await axios.post(`divisions/${division_id}/teams`, {
      team_ids,
      bias_team_ids: bias_team_ids ?? [],
    });
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function fetchDivisionTeams(division_id: number) {
  try {
    const axios = await createAxios();
    return await axios.get<{ teams: DivisionTeam[] }>(
      `divisions/${division_id}/teams`
    );
  } catch (err: any) {
    handleRequestError(err);
    throw err;
  }
}

/** Fetch all division–bracket blocks for the schedule timetable (divisions + brackets, no players/teams). */
export async function fetchScheduleBlocks(tournamentId: number): Promise<ScheduleBlock[]> {
  const axiosInstance = await createAxios();
  const divRes = await axiosInstance.get<{ data: Array<{ id: number; name: string; duration_mins: number }> }>(
    `tournaments/${tournamentId}/divisions`
  );
  const divisions = divRes.data?.data ?? [];
  const blocks: ScheduleBlock[] = [];
  await Promise.all(
    divisions.map(async (div) => {
      const bracketRes = await axiosInstance.get<{
        data: Array<{ id: number; index: number; title?: string | null; num_players: number }>;
      }>(`divisions/${div.id}/brackets`);
      const brackets = bracketRes.data?.data ?? [];
      brackets.forEach((b) => {
        const numPlayers = Number(b.num_players ?? 0);
        const minsPerPlayer = Number(div.duration_mins ?? 0);
        const estimatedMins = Math.max(0, minsPerPlayer) * Math.max(0, numPlayers);
        blocks.push({
          kind: 'division',
          divisionId: div.id,
          bracketId: b.id,
          divisionName: div.name,
          bracketName: b.title?.trim() ? b.title : `Group ${b.index}`,
          numPlayers,
          minsPerPlayer,
          estimatedMins,
        });
      });
    })
  );
  return blocks;
}
