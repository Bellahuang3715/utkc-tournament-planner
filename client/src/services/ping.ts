import { pingPingGet } from '../openapi';
import { getOpenApiClient } from './openapi_client';

/** Example of calling the API via the generated OpenAPI client. */
export async function pingApi(): Promise<string | undefined> {
  const { data, error } = await pingPingGet({
    client: getOpenApiClient(),
  });
  if (error) {
    throw error;
  }
  return data;
}
