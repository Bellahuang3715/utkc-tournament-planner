import { getTournamentEndpointFromRouter } from "../components/utils/util";
import {
  createAxios,
  getTournamentByEndpointName,
  handleRequestError,
} from "./adapter";

export async function createTournament(
  organizer: string,
  name: string,
  location: string,
  description: string,
  start_time: string,
  dashboard_public: boolean,
  players_can_be_in_multiple_teams: boolean,
  auto_assign_courts: boolean,
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post("tournaments", {
      organizer,
      name,
      location,
      description,
      start_time,
      dashboard_public,
      players_can_be_in_multiple_teams,
      auto_assign_courts,
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
