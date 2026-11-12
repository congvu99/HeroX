/** Cổng, địa chỉ cố định của môi trường E2E chạy trên máy dev; trùng cổng thì dừng process cũ, không đổi cổng. */
export const E2E_DATABASE_HOST = '127.0.0.1';
export const E2E_DATABASE_PORT = 55_432;
/** PGlite không kiểm tài khoản; tên DB mặc định của PGlite là `postgres`. */
export const E2E_DATABASE_URL = `postgres://postgres@${E2E_DATABASE_HOST}:${E2E_DATABASE_PORT}/postgres`;

/** Trùng cổng dev của server (Vite dev proxy `/herox/api` cố định sang cổng này, xem client/vite.config.ts). */
export const E2E_SERVER_PORT = 3180;
export const E2E_SERVER_READY_URL = `http://127.0.0.1:${E2E_SERVER_PORT}/herox/api/ready`;

/**
 * Client riêng cho E2E (bản build chế độ dev qua vite preview), khác cổng dev 5180 để không đụng Vite người dùng đang mở; vẫn proxy API sang cổng
 * 3180 như cấu hình chung. Dùng bản dev vì hook `window.__HEROX_GAME__` bị loại khỏi bản build thường.
 */
export const E2E_CLIENT_PORT = 5181;
export const E2E_CLIENT_URL = `http://localhost:${E2E_CLIENT_PORT}/herox/`;

/** Thư mục kết quả E2E (trace, ảnh, báo cáo HTML); Playwright xoá sạch `artifacts` mỗi lần chạy. */
export const E2E_REPORT_DIR = 'plans/reports/e2e-playwright';

/** Thư mục build client cho E2E (tương đối với `client/`), tách khỏi `dist` của bản build thường. */
export const E2E_CLIENT_OUT_DIR = 'dist-e2e';
