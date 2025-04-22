import { awaitRequestAndHandleError, createAxios, handleRequestError } from './adapter';

export async function createTeam(
  tournament_id: number,
  name: string,
  active: boolean,
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/teams`, {
      name,
      active,
    });
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function createTeams(tournament_id: number, names: string, active: boolean) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/teams_multi`, { names, active });
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function deleteTeam(tournament_id: number, team_id: number) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.delete(`tournaments/${tournament_id}/teams/${team_id}`);
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function updateTeam(
  tournament_id: number,
  team_id: number,
  name: string,
  active: boolean,
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.put(`tournaments/${tournament_id}/teams/${team_id}`, {
      name,
      active,
    })
  );
}
