import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['shared', 'server', 'client'],
    // Chạy bằng `npm run test:coverage`; logic trận là lõi kiểm thưởng ở server nên giữ phủ dòng ≥ 90%.
    coverage: {
      provider: 'v8',
      include: ['**/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: {
        '**/src/combat/**': { lines: 90 },
      },
    },
  },
});
