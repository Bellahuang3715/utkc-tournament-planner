import { createAxios, handleRequestError } from './adapter';
import type { DivisionCreateValues, DivisionFormValues } from '../interfaces/division';

export async function createDivision(values: DivisionCreateValues) {
  try {
    const axios = await createAxios();
    // backend expects: name, prefix?, tournament_id, duration_mins, margin_mins, division_type
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

export async function addPlayersToDivision(division_id: number, player_ids: Array<number | string>) {
  try {
    const axios = await createAxios();
    return await axios.post(`divisions/${division_id}/players`, {
      player_ids: player_ids.map((x) => Number(x)),
    });
  } catch (err: any) {
    return handleRequestError(err);
  }
}
