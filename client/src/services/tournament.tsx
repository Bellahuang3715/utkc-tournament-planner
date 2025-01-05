import { getTournamentEndpointFromRouter } from '../components/utils/util';
import { createAxios, getTournamentByEndpointName, handleRequestError } from './adapter';

export async function createTournament(
  club_id: number,
  name: string,
  location: string,
  description: string,
  start_time: string,
  end_time: string,
  auto_assign_courts: boolean,
  duration_minutes: number,
  margin_minutes: number
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post('tournaments', {
      name,
      club_id,
      location,
      description,
      start_time,
      end_time,
      auto_assign_courts,
      duration_minutes,
      margin_minutes,
    });
  } catch (error: any) {
    handleRequestError(error);
    throw error;
  }
}

export async function deleteTournament(tournament_id: number) {
  const axiosInstance = await createAxios();
  return axiosInstance.delete(`tournaments/${tournament_id}`);
}

export async function updateTournament(
  tournament_id: number,
  name: string,
  dashboard_public: boolean,
  dashboard_endpoint: string,
  players_can_be_in_multiple_teams: boolean,
  auto_assign_courts: boolean,
  start_time: string,
  duration_minutes: number,
  margin_minutes: number
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(`tournaments/${tournament_id}`, {
      name,
      dashboard_public,
      dashboard_endpoint,
      players_can_be_in_multiple_teams,
      auto_assign_courts,
      start_time,
      duration_minutes,
      margin_minutes,
    });
  } catch (error: any) {
    handleRequestError(error);
    throw error;
  }
}

export function getTournamentResponseByEndpointName() {
  const endpointName = getTournamentEndpointFromRouter();
  const swrTournamentsResponse = getTournamentByEndpointName(endpointName);

  return swrTournamentsResponse.data?.data;
}
