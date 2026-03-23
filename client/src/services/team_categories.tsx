import {
  awaitRequestAndHandleError,
  createAxios,
  handleRequestError,
} from "./adapter";

export async function createTeamCategory(
  tournament_id: number,
  name: string,
  color: string,
) {
  try {
    const axiosInstance = await createAxios();
    return await axiosInstance.post(
      `tournaments/${tournament_id}/team_categories`,
      { name, color },
    );
  } catch (error: any) {
    return handleRequestError(error);
  }
}

export async function updateTeamCategory(
  tournament_id: number,
  categoryId: number,
  body: { name: string; color: string; position: number },
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.put(
      `tournaments/${tournament_id}/team_categories/${categoryId}`,
      body,
    ),
  );
}

export async function deleteTeamCategory(
  tournament_id: number,
  categoryId: number,
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.delete(
      `tournaments/${tournament_id}/team_categories/${categoryId}`,
    ),
  );
}
