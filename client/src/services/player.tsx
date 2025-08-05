import { createAxios, handleRequestError } from './adapter';
import { PlayerBody } from '../interfaces/player';

export async function createPlayer(tournament_id: number, body: PlayerBody) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/players`, body);
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
  data: PlayerBody,
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(`tournaments/${tournament_id}/players/${player_id}`, {
      data,
    });
  } catch (error: any) {
    handleRequestError(error);
  }
}
