import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../server/openapi/openapi.json',
  output: 'src/openapi',
  plugins: ['@hey-api/client-axios'],
});
