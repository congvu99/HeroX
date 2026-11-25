import { defineConfig, devices } from '@playwright/test';
import {
  E2E_CLIENT_OUT_DIR,
  E2E_CLIENT_PORT,
  E2E_CLIENT_URL,
  E2E_DATABASE_PORT,
  E2E_DATABASE_URL,
  E2E_REPORT_DIR,
  E2E_SERVER_PORT,
  E2E_SERVER_READY_URL,
} from './e2e/support/e2e-environment.js';

/**
 * E2E HeroX. Mặc định tự dựng môi trường trên máy dev: Postgres nhúng đã seed (PGlite), server thật, client bản build dev qua vite preview.
 * Đặt `E2E_BASE_URL` (ví dụ http://localhost:8080/herox/ của compose.dev.yml) để chạy vào stack có sẵn.
 * Không bao giờ dùng lại process đang chạy: server dev của người dùng có thể đang trỏ vào DB thật.
 */
const externalBaseUrl = process.env.E2E_BASE_URL?.trim() || undefined;
const SERVER_START_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: './e2e/specs',
  outputDir: `${E2E_REPORT_DIR}/artifacts`,
  reporter: [['list'], ['html', { outputFolder: `${E2E_REPORT_DIR}/html`, open: 'never' }]],
  // Hai project chạy song song trên cùng DB nhưng mỗi project, mỗi nhóm spec có người dùng riêng.
  workers: 2,
  // Một trận đầy đủ (đi bộ, chờ khoá input mỗi đề, gửi log) mất tới gần 2 phút trên máy chậm.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  forbidOnly: process.env.CI !== undefined,
  use: {
    baseURL: externalBaseUrl ?? E2E_CLIENT_URL,
    actionTimeout: 30_000,
    trace: 'on',
    screenshot: 'on',
  },
  // Game chạy khung dọc (portrait-only): cả hai project dùng thiết bị dọc, giữ hai engine Chromium + WebKit.
  projects: [
    { name: 'pixel-5', use: { ...devices['Pixel 5'] } },
    { name: 'iphone-12', use: { ...devices['iPhone 12'] } },
  ],
  webServer: externalBaseUrl
    ? []
    : [
        {
          command: 'npx tsx --conditions=source e2e/support/start-e2e-database.ts',
          port: E2E_DATABASE_PORT,
          reuseExistingServer: false,
          timeout: SERVER_START_TIMEOUT_MS,
        },
        {
          // Chạy thẳng mã nguồn, không nạp file .env của người dùng (có thể chứa chuỗi kết nối DB thật).
          command: 'npx tsx --conditions=source server/src/server.ts',
          url: E2E_SERVER_READY_URL,
          reuseExistingServer: false,
          timeout: SERVER_START_TIMEOUT_MS,
          env: {
            DATABASE_URL: E2E_DATABASE_URL,
            PORT: String(E2E_SERVER_PORT),
            TRUST_PROXY_HOPS: '0',
            PGSSL: 'false',
            PGSSLROOTCERT: '',
            // PGlite dùng chung một engine cho các socket; một kết nối tránh transaction của socket này
            // xen vào socket khác và làm mất mốc truyện vừa ghi. Postgres thật vẫn dùng mặc định 5.
            PGPOOL_MAX_CONNECTIONS: '1',
          },
        },
        {
          // Bản build chế độ dev (giữ hook kiểm thử) phục vụ tĩnh bằng vite preview: không có HMR nên trang
          // không tự tải lại giữa trận khi mã nguồn đổi. Preview dùng chung proxy /herox/api của cấu hình dev.
          command:
            `npm run build -w @herox/client -- --outDir ${E2E_CLIENT_OUT_DIR} --emptyOutDir` +
            ` && npm run preview -w @herox/client -- --outDir ${E2E_CLIENT_OUT_DIR} --port ${E2E_CLIENT_PORT}`,
          url: E2E_CLIENT_URL,
          reuseExistingServer: false,
          timeout: SERVER_START_TIMEOUT_MS,
          env: { NODE_ENV: 'development' },
        },
      ],
});
