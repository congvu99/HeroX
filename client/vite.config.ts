import { defineConfig, defaultClientConditions } from 'vite';
import { API_PREFIX, APP_BASE_PATH } from '@herox/shared';

/** Cổng dev cố định để không sinh process trùng cổng; xem README. */
const DEV_CLIENT_PORT = 5180;
const DEV_SERVER_ORIGIN = 'http://127.0.0.1:3180';
/** Asset nhỏ hơn ngưỡng này mới được nhúng base64; sprite, map phải là file riêng để cache theo hash. */
const ASSETS_INLINE_LIMIT_BYTES = 1024;
/** Phaser minify ~1.4 MB và không chia nhỏ được; ngưỡng này vẫn bắt chunk mã game phình bất thường. */
const CHUNK_SIZE_WARNING_LIMIT_KB = 1500;

export default defineConfig({
  base: APP_BASE_PATH,
  resolve: {
    // Đọc thẳng mã nguồn TS của @herox/shared, không cần build trước khi dev.
    conditions: ['source', ...defaultClientConditions],
  },
  server: {
    port: DEV_CLIENT_PORT,
    strictPort: true,
    proxy: {
      [API_PREFIX]: { target: DEV_SERVER_ORIGIN, changeOrigin: false },
    },
  },
  preview: {
    port: DEV_CLIENT_PORT,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: ASSETS_INLINE_LIMIT_BYTES,
    sourcemap: true,
    chunkSizeWarningLimit: CHUNK_SIZE_WARNING_LIMIT_KB,
    rolldownOptions: {
      output: {
        // Phaser tách chunk riêng: sửa mã game không làm trình duyệt tải lại engine.
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ }],
        },
      },
    },
  },
});
