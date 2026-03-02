import {
  awaitRequestAndHandleError,
  createAxios,
  handleRequestError,
} from "./adapter";

export async function createTeam(
  tournament_id: number,
  name: string,
  active: boolean,
  player_ids: string[],
  club: string,
  category: string,
  positions?: Record<string, string>,
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/teams`, {
      code: name,
      name,
      club,
      category,
      active,
      player_ids: player_ids.map((id) => Number(id)),
      ...(positions && Object.keys(positions).length > 0 && { positions }),
    });
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function deleteTeam(tournament_id: number, team_id: number) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.delete(
      `tournaments/${tournament_id}/teams/${team_id}`,
    );
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function updateTeam(
  tournament_id: number,
  team_id: number,
  name: string,
  active: boolean,
  player_ids: string[],
  club: string,
  category: string,
  positions?: Record<string, string>,
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.put(`tournaments/${tournament_id}/teams/${team_id}`, {
      code: name,
      name,
      club,
      category,
      active,
      player_ids: player_ids.map((id) => Number(id)),
      ...(positions && Object.keys(positions).length > 0 && { positions }),
    }),
  );
}
