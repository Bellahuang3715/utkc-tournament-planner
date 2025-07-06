import { showNotification } from '@mantine/notifications';
import type Axios from 'axios';
import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { useRouter } from 'next/router';
import useSWR, { SWRResponse } from 'swr';

import { getBaseURL, Pagination } from '../components/utils/util';
import { SchedulerSettings } from '../interfaces/match';
import { RoundInterface } from '../interfaces/round';
import { getAuth } from 'firebase/auth';

// TODO: This is a workaround for the fact that axios is not properly typed.
const axios: typeof Axios = require('axios').default;

export function handleRequestError(response: AxiosError) {
  if (response.code === 'ERR_NETWORK') {
    showNotification({
      color: 'red',
      title: 'An error occurred',
      message: 'Internal server error',
      autoClose: 10000,
    });
    return;
  }

  // @ts-ignore
  if (response.response != null && response.response.data.detail != null) {
    // If the detail contains an array, there is likely a pydantic validation error occurring.
    // @ts-ignore
    const { detail } = response.response.data;
    let message: string;

    if (Array.isArray(detail)) {
      const firstError = detail[0];
      message = `${firstError.loc.slice(1).join(' - ')}: ${firstError.msg}`;
    } else {
      message = detail.toString();
    }

    showNotification({
      color: 'red',
      title: 'An error occurred',
      message,
      autoClose: 10000,
    });
  }
}

export function requestSucceeded(result: AxiosResponse | AxiosError) {
  // @ts-ignore
  return result.name !== 'AxiosError';
}

export function getBaseApiUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL != null
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : 'http://localhost:8400';
}

export function createAxios() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }

  return user.getIdToken().then((access_token) => {
    return axios.create({
      baseURL: getBaseApiUrl(),
      headers: {
        Authorization: `Bearer ${access_token}`, // Use Firebase ID token
        Accept: 'application/json',
      },
    });
  });
}

export async function awaitRequestAndHandleError(
  requestFunction: (instance: AxiosInstance) => Promise<AxiosResponse>
): Promise<AxiosError | AxiosResponse> {
  let response = null;
  try {
    const instance = await createAxios();
    response = await requestFunction(instance);
  } catch (exc: any) {
    if (exc.name === 'AxiosError') {
      handleRequestError(exc);
      return exc;
    }
    throw exc;
  }
  return response;
}

function getTimeState() {
  // Used to force a refresh on SWRResponse, even when the response stays the same.
  // For example, when the page layout depends on time, but the response contains
  // timestamps that don't change, this is necessary.
  return { time: new Date() };
}

const fetcher = async (url: string) => {
  const axiosInstance = await createAxios();
  return axiosInstance.get(url).then((res: { data: any }) => res.data);
}

const fetcherWithTimestamp = async (url: string) => {
  const axiosInstance = await createAxios();
  return axiosInstance
    .get(url)
    .then((res: { data: any }) => ({ ...res.data, ...getTimeState() }));
};

export function getClubs(): SWRResponse {
  return useSWR('clubs', fetcher);
}

export function getTournamentByEndpointName(tournament_endpoint_name: string): SWRResponse {
  return useSWR(`tournaments?endpoint_name=${tournament_endpoint_name}`, fetcher);
}

export function getTournamentById(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}`, fetcher);
}

export function getTournaments(): SWRResponse {
  return useSWR('tournaments', fetcher);
}

export function getPlayerFields(tournament_id: number): SWRResponse {
  const key = `tournaments/${tournament_id}/player_fields`;
  return useSWR(key, fetcher);
}

export function getPlayers(tournament_id: number, not_in_team: boolean = false): SWRResponse {
  return useSWR(
    `tournaments/${tournament_id}/players?not_in_team=${not_in_team}`,
    fetcher
  );
}

export function getTeams(tournament_id: number | null): SWRResponse {
  return useSWR(
    tournament_id == null ? null : `tournaments/${tournament_id}/teams`,
    fetcher
  );
}

export function getTeamsLive(tournament_id: number | null): SWRResponse {
  return useSWR(tournament_id == null ? null : `tournaments/${tournament_id}/teams`, fetcher, {
    refreshInterval: 5_000,
  });
}

export function getAvailableStageItemInputs(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/available_inputs`, fetcher);
}

export function getStages(
  tournament_id: number | null,
  no_draft_rounds: boolean = false
): SWRResponse {
  return useSWR(
    tournament_id == null || tournament_id === -1
      ? null
      : `tournaments/${tournament_id}/stages?no_draft_rounds=${no_draft_rounds}`,
    fetcher
  );
}

export function getStagesLive(tournament_id: number | null): SWRResponse {
  return useSWR(
    tournament_id == null ? null : `tournaments/${tournament_id}/stages?no_draft_rounds=true`,
    fetcherWithTimestamp,
    {
      refreshInterval: 5_000,
    }
  );
}

export function getRankings(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/rankings`, fetcher);
}

export function getRankingsPerStageItem(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/next_stage_rankings`, fetcher);
}

export function getCourts(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/courts`, fetcher);
}

export function getCourtsLive(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/courts`, fetcher, {
    refreshInterval: 60_000,
  });
}

export function getUpcomingMatches(
  tournament_id: number,
  stage_item_id: number,
  draftRound: RoundInterface | null,
  schedulerSettings: SchedulerSettings
): SWRResponse {
  return useSWR(
    stage_item_id == null || draftRound == null
      ? null
      : `tournaments/${tournament_id}/stage_items/${stage_item_id}/upcoming_matches?elo_diff_threshold=${schedulerSettings.eloThreshold}&only_recommended=${schedulerSettings.onlyRecommended}&limit=${schedulerSettings.limit}&iterations=${schedulerSettings.iterations}`,
    fetcher
  );
}

export async function uploadTournamentLogo(tournament_id: number, file: any) {
  const bodyFormData = new FormData();
  bodyFormData.append('file', file, file.name);

  const axiosInstance = await createAxios();
  return axiosInstance.post(`tournaments/${tournament_id}/logo`, bodyFormData);
}

export async function removeTournamentLogo(tournament_id: number) {
  const axiosInstance = await createAxios();
  return axiosInstance.post(`tournaments/${tournament_id}/logo`);
}

export async function uploadTeamLogo(tournament_id: number, team_id: number, file: any) {
  const bodyFormData = new FormData();
  bodyFormData.append('file', file, file.name);

  const axiosInstance = await createAxios();
  return axiosInstance.post(`tournaments/${tournament_id}/teams/${team_id}/logo`, bodyFormData);
}

export async function removeTeamLogo(tournament_id: number, team_id: number) {
  const axiosInstance = await createAxios();
  return axiosInstance.post(`tournaments/${tournament_id}/teams/${team_id}/logo`);
}

export function checkForAuthError(response: any) {
  // if (typeof window !== 'undefined' && !tokenPresent()) {
  //   const router = useRouter();
  //   router.push('/login');
  // }

  // // We send a simple GET `/clubs` request to test whether we really should log out. // Next
  // // sometimes uses out-of-date local storage, so we send an additional request with up-to-date
  // // local storage.
  // // If that gives a 401, we log out.
  // function responseHasAuthError(_response: any) {
  //   return (
  //     _response.error != null &&
  //     _response.error.response != null &&
  //     _response.error.response.status === 401
  //   );
  // }
  // if (responseHasAuthError(response)) {
  //   createAxios()
  //     .get('users/me')
  //     .then(() => {})
  //     .catch((error: any) => {
  //       if (error.toJSON().status === 401) {
  //         performLogout();
  //       }
  //     });
  // }
}

