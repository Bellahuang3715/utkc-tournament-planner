import { showNotification } from '@mantine/notifications';
import type Axios from 'axios';
import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import useSWR, { SWRResponse } from 'swr';

import { getAuth } from 'firebase/auth';
import {
  getEditSessionIdForRequests,
  getScorekeeperTokenForCurrentPath,
} from '../utils/scorekeeper_access';

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
  const scorekeeperToken = getScorekeeperTokenForCurrentPath();
  const editSessionId = getEditSessionIdForRequests();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (scorekeeperToken) {
    headers['X-Scorekeeper-Token'] = scorekeeperToken;
  }
  if (editSessionId) {
    headers['X-Edit-Session-Id'] = editSessionId;
  }

  if (user) {
    return user.getIdToken().then((access_token) => {
      headers.Authorization = `Bearer ${access_token}`;
      return axios.create({
        baseURL: getBaseApiUrl(),
        headers,
      });
    });
  }

  if (scorekeeperToken) {
    return Promise.resolve(
      axios.create({
        baseURL: getBaseApiUrl(),
        headers,
      })
    );
  }

  throw new Error('User is not authenticated');
}

/** Unauthenticated axios for participant / preview site. */
export function createPublicAxios() {
  return Promise.resolve(
    axios.create({
      baseURL: getBaseApiUrl(),
      headers: {
        Accept: 'application/json',
      },
    })
  );
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

const fetcher = async (url: string) => {
  const axiosInstance = await createAxios();
  return axiosInstance.get(url).then((res: { data: any }) => res.data);
};

const publicFetcher = async (url: string) => {
  const axiosInstance = await createPublicAxios();
  return axiosInstance.get(url).then((res: { data: any }) => res.data);
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

export function getPublicTournamentByEndpoint(
  endpoint: string | null | undefined,
  preview: string | null | undefined
): SWRResponse {
  const qs = preview ? `?preview=${encodeURIComponent(preview)}` : '';
  const key = endpoint ? `public/tournaments/${endpoint}${qs}` : null;
  return useSWR(key, publicFetcher);
}

function publicTournamentKey(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  path: string
): string | null {
  if (!endpoint) return null;
  const qs = preview ? `?preview=${encodeURIComponent(preview)}` : '';
  return `public/tournaments/${encodeURIComponent(endpoint)}/${path}${qs}`;
}

export function getPublicPlayers(
  endpoint: string | null | undefined,
  preview: string | null | undefined
): SWRResponse {
  return useSWR(publicTournamentKey(endpoint, preview, 'players'), publicFetcher);
}

export function getPublicCourts(
  endpoint: string | null | undefined,
  preview: string | null | undefined
): SWRResponse {
  return useSWR(publicTournamentKey(endpoint, preview, 'courts'), publicFetcher);
}

export function getPublicDivisions(
  endpoint: string | null | undefined,
  preview: string | null | undefined
): SWRResponse {
  return useSWR(publicTournamentKey(endpoint, preview, 'divisions'), publicFetcher);
}

export function getPublicScheduleTimetable(
  endpoint: string | null | undefined,
  preview: string | null | undefined
): SWRResponse {
  return useSWR(publicTournamentKey(endpoint, preview, 'schedule_timetable'), publicFetcher);
}

export function getPublicPlayerDivisions(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  playerId: number | null
): SWRResponse {
  const path = playerId != null ? `players/${playerId}/divisions` : '';
  return useSWR(
    playerId != null ? publicTournamentKey(endpoint, preview, path) : null,
    publicFetcher
  );
}

export function getPublicPlayerMatchAssignments(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  playerId: number | null
): SWRResponse {
  const path = playerId != null ? `players/${playerId}/assignments` : '';
  return useSWR(
    playerId != null ? publicTournamentKey(endpoint, preview, path) : null,
    publicFetcher
  );
}

export function getPublicMatchDirectory(
  endpoint: string | null | undefined,
  preview: string | null | undefined
): SWRResponse {
  return useSWR(publicTournamentKey(endpoint, preview, 'match-directory'), publicFetcher);
}

export function getPublicDivisionBracketsWithPlayers(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  divisionId: number | null
): SWRResponse {
  const path =
    divisionId != null ? `divisions/${divisionId}/brackets/with-players` : '';
  return useSWR(
    divisionId != null ? publicTournamentKey(endpoint, preview, path) : null,
    publicFetcher
  );
}

export function getPublicDivisionBracketsWithTeams(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  divisionId: number | null
): SWRResponse {
  const path =
    divisionId != null ? `divisions/${divisionId}/brackets/with-teams` : '';
  return useSWR(
    divisionId != null ? publicTournamentKey(endpoint, preview, path) : null,
    publicFetcher
  );
}

export function getPublicDivisionBracketCells(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  divisionId: number | null
): SWRResponse {
  const path = divisionId != null ? `divisions/${divisionId}/bracket-cells` : '';
  return useSWR(
    divisionId != null ? publicTournamentKey(endpoint, preview, path) : null,
    publicFetcher,
    { refreshInterval: 10_000 }
  );
}

export function getPublicDivisionTeamBracketCells(
  endpoint: string | null | undefined,
  preview: string | null | undefined,
  divisionId: number | null
): SWRResponse {
  const path =
    divisionId != null ? `divisions/${divisionId}/team-bracket-cells` : '';
  return useSWR(
    divisionId != null ? publicTournamentKey(endpoint, preview, path) : null,
    publicFetcher,
    { refreshInterval: 10_000 }
  );
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

export function getTeamCategories(tournament_id: number | null): SWRResponse {
  return useSWR(
    tournament_id == null
      ? null
      : `tournaments/${tournament_id}/team_categories`,
    fetcher,
  );
}

export function getTeamsLive(tournament_id: number | null): SWRResponse {
  return useSWR(tournament_id == null ? null : `tournaments/${tournament_id}/teams`, fetcher, {
    refreshInterval: 5_000,
  });
}

export function getDivisions(tournament_id: number | null): SWRResponse {
  return useSWR(
    tournament_id != null && Number.isFinite(tournament_id)
      ? `tournaments/${tournament_id}/divisions`
      : null,
    fetcher
  );
}

export function getDivisionPlayers(division_id: number): SWRResponse {
  return useSWR(
    `divisions/${division_id}/players`,
    fetcher
  );
}

export function getDivisionTeams(division_id: number): SWRResponse {
  return useSWR(
    division_id ? `divisions/${division_id}/teams` : null,
    fetcher
  );
}

export function getDivisionBrackets(division_id: number): SWRResponse {
  return useSWR(
    `divisions/${division_id}/brackets`,
    fetcher
  );
}

export function getDivisionLock(division_id: number | null): SWRResponse {
  return useSWR(
    division_id != null && Number.isFinite(division_id)
      ? `divisions/${division_id}/lock`
      : null,
    fetcher
  );
}

export function getCourts(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/courts`, fetcher);
}

export function getCourtsLive(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/courts`, fetcher, {
    refreshInterval: 60_000,
  });
}

export function getScheduleTimetable(tournament_id: number): SWRResponse {
  return useSWR(`tournaments/${tournament_id}/schedule_timetable`, fetcher);
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
