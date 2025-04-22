import { showNotification } from '@mantine/notifications';

import {
  MatchBodyInterface,
  MatchCreateBodyInterface,
  MatchRescheduleInterface,
} from '../interfaces/match';
import { createAxios, handleRequestError } from './adapter';

export async function createMatch(tournament_id: number, match: MatchCreateBodyInterface) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/matches`, match);
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function deleteMatch(tournament_id: number, match_id: number) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.delete(`tournaments/${tournament_id}/matches/${match_id}`);
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function updateMatch(
  tournament_id: number,
  match_id: number,
  match: MatchBodyInterface
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.put(`tournaments/${tournament_id}/matches/${match_id}`, match);
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function rescheduleMatch(
  tournament_id: number,
  match_id: number,
  match: MatchRescheduleInterface
) {
  try {
    const axiosInstance = await createAxios();  // Wait for axios instance to be created
    const response = await axiosInstance.post(
      `tournaments/${tournament_id}/matches/${match_id}/reschedule`, 
      match
    );

    if (response != null && response.status === 200) {
      showNotification({
        color: 'green',
        title: 'Successfully rescheduled match',
        message: '',
      });
    }
  } catch (error: any) {
    handleRequestError(error);
  }
}

export async function scheduleMatches(tournament_id: number) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(`tournaments/${tournament_id}/schedule_matches`);
  } catch (error: any) {
    handleRequestError(error);
  }
}
