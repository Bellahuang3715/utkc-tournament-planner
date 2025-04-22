import { createAxios, handleRequestError } from './adapter';

export async function createPlayer(tournament_id: number, name: string, active: boolean) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/players`, { name, active });
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function deletePlayer(tournament_id: number, player_id: number) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.delete(`tournaments/${tournament_id}/players/${player_id}`);
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function updatePlayer(
  tournament_id: number,
  player_id: number,
  name: string,
  active: boolean,
  team_id: string | null
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(`tournaments/${tournament_id}/players/${player_id}`, {
      name,
      active,
      team_id,
    });
  } catch (error: any) {
    handleRequestError(error);
  }
}
