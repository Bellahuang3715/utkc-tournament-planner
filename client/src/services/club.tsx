import { createAxios, handleRequestError } from "./adapter";
import { ClubFormValues } from "../interfaces/club";

export async function createClub(values: ClubFormValues) {
  console.log("createClub called with values: ", values);
  try {
    const axios = await createAxios();
    return await axios.post("clubs", values);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function deleteClub(club_id: number) {
  try {
    const axios = await createAxios();
    return await axios.delete(`clubs/${club_id}`);
  } catch (err: any) {
    return handleRequestError(err);
  }
}

export async function updateClub(club_id: number, values: ClubFormValues) {
  try {
    const axios = await createAxios();
    return await axios.put(`clubs/${club_id}`, values);
  } catch (err: any) {
    return handleRequestError(err);
  }
}
