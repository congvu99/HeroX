import { API_ERROR_CODES, HttpError } from './http-error.js';

// Múi giờ hợp lệ trên thế giới: UTC−12 tới UTC+14, tính bằng phút về phía đông.
const MIN_UTC_OFFSET_MINUTES = -720;
const MAX_UTC_OFFSET_MINUTES = 840;
const UTC_OFFSET_PATTERN = /^-?\d{1,4}$/;

/**
 * Đọc `?utcOffset=` bắt buộc: thiếu múi giờ thì "hôm nay" tính theo UTC và chuỗi ngày lệch với LingoBrain,
 * nên trả 400 thay vì số sai. Client gửi `-new Date().getTimezoneOffset()` (phút về phía đông UTC).
 */
export function readUtcOffsetMinutes(query: unknown): number {
  const raw = typeof query === 'object' && query !== null && 'utcOffset' in query ? query.utcOffset : undefined;
  const value = typeof raw === 'string' && UTC_OFFSET_PATTERN.test(raw) ? Number(raw) : Number.NaN;
  if (!(value >= MIN_UTC_OFFSET_MINUTES && value <= MAX_UTC_OFFSET_MINUTES)) {
    throw new HttpError(400, 'Thiếu hoặc sai múi giờ (utcOffset)', API_ERROR_CODES.invalidRequest);
  }
  return value;
}
