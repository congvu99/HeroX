import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    conditions: ['source'],
  },
  ssr: {
    resolve: {
      conditions: ['source'],
      externalConditions: ['source'],
    },
  },
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
