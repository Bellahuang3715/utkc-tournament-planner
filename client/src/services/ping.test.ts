import { describe, expect, it, vi } from 'vitest';

vi.mock('./openapi_client', () => ({
  getOpenApiClient: () => ({
    get: vi.fn(async () => ({ data: 'ping', error: undefined })),
  }),
}));

vi.mock('../openapi', () => ({
  pingPingGet: vi.fn(async ({ client }: { client: { get: () => Promise<{ data: string }> } }) =>
    client.get()
  ),
}));

describe('pingApi', () => {
  it('returns healthcheck payload from generated client', async () => {
    const { pingApi } = await import('./ping');
    await expect(pingApi()).resolves.toBe('ping');
  });
});
