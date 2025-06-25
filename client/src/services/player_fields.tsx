import { createAxios, handleRequestError } from './adapter';
import { FieldInsertable } from '../interfaces/player_fields';

export async function updatePlayerFields(
    tournament_id: number,
    fields: FieldInsertable[]
  ) {
    try {
      console.log("fields", fields);
      const axiosInstance = await createAxios();
      return await axiosInstance.put(
        `tournaments/${tournament_id}/player_fields`,
        {
          fields: fields.map((f, idx) => ({
            key:      f.key,
            label:    f.label,
            include:  f.include,
            type:     f.type,
            options:  f.options,
            position: idx,
          })),
        }
      );
    } catch (error: any) {
      handleRequestError(error);
    }
  }
