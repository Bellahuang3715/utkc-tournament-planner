import { createAxios, handleRequestError } from './adapter';
import type { DivisionCreateValues, DivisionFormValues, DivisionPlayer } from '../interfaces/division';

export async function createDivision(values: DivisionCreateValues) {
  try {
    const axios = await createAxios();
    return await axios.post('divisions', values);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function updateDivision(division_id: number, values: DivisionFormValues) {
  try {
    const axios = await createAxios();
    return await axios.put(`divisions/${division_id}`, values);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function deleteDivision(division_id: number) {
  try {
    const axios = await createAxios();
    return await axios.delete(`divisions/${division_id}`);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function addPlayersToDivision(division_id: number, player_ids: Array<number | string>, bias_player_ids?: Array<number | string>) {
  try {
    const axios = await createAxios();
    return await axios.post(`divisions/${division_id}/players`, {
      player_ids: player_ids.map((x) => Number(x)),
      bias_player_ids: (bias_player_ids ?? []).map(Number),
    });
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function fetchDivisionPlayers(division_id: number) {
  try {
    const axios = await createAxios();
    return await axios.get<{ players: DivisionPlayer[] }>(
      `divisions/${division_id}/players`
    );
  } catch (err: any) {
    return handleRequestError(err);
  }
}
