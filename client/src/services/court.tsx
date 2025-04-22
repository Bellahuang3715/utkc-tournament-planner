import { createAxios, handleRequestError } from './adapter';

export async function createCourt(tournament_id: number, name: string) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/courts`, { name });
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function deleteCourt(tournament_id: number, court_id: number) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.delete(`tournaments/${tournament_id}/courts/${court_id}`);
  } catch (error: any) {
    handleRequestError(error);
  }
}
