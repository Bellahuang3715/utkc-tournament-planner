/**
 * Shared setup for the generated OpenAPI axios client.
 *
 * Prefer importing types/SDK helpers from `src/openapi` for new API calls.
 * Existing hand-written services in this folder can migrate gradually.
 */
import { client } from '../openapi/client.gen';
import { getBaseApiUrl } from './adapter';

let configured = false;

/** Configure (once) and return the generated OpenAPI client. */
export function getOpenApiClient() {
  if (!configured) {
    client.setConfig({
      baseURL: getBaseApiUrl(),
    });
    configured = true;
  }
  return client;
}
