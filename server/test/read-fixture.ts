import { readFileSync } from 'node:fs';

const FIXTURE_DIRECTORY = new URL('./fixtures/', import.meta.url);

/** Đọc fixture JSON tổng hợp trong `server/test/fixtures` (không phải dữ liệu người dùng thật). */
export function readFixture<T = unknown>(fileName: string): T {
  return JSON.parse(readFileSync(new URL(fileName, FIXTURE_DIRECTORY), 'utf8')) as T;
}
