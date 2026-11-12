import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    conditions: ['source'],
  },
  // Test chạy trong môi trường SSR của Vite: cần điều kiện riêng để đọc mã nguồn @herox/shared thay vì dist đã build.
  ssr: {
    resolve: {
      conditions: ['source'],
      externalConditions: ['source'],
    },
  },
  test: {
    name: 'client',
    environment: 'node',
    // Chỉ test logic thuần (không import Phaser): Phaser cần DOM và WebGL.
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
