import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// HeroX chỉ được ghi vào schema herox; bảng của LingoBrain (public.*) chỉ đọc.
// Quét mã nguồn server (trừ test) tìm câu ghi có đích không phải herox.* — kể cả tên bảng không ghi schema,
// vì search_path mặc định trỏ về public.
const SOURCE_DIRECTORY = fileURLToPath(new URL('./', import.meta.url));
const SCANNED_EXTENSIONS = /\.(ts|sql)$/;
const TEST_FILE = /\.test\.ts$/;
// Đích của lệnh ghi; bỏ qua "DO UPDATE" (ON CONFLICT) và "FOR UPDATE" (khoá dòng khi đọc).
const WRITE_TARGET_PATTERN =
  /\b(?:INSERT\s+INTO|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?|(?<!\b(?:DO|FOR)\s+)UPDATE|ALTER\s+TABLE|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|CREATE\s+(?:TABLE|INDEX)(?:\s+IF\s+NOT\s+EXISTS)?)\s+(?:ONLY\s+)?("?[\w.]+"?)/gi;
const ALLOWED_TARGET = /^"?herox"?\./i;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && SCANNED_EXTENSIONS.test(entry.name) && !TEST_FILE.test(entry.name))
    .map((entry) => `${entry.parentPath}/${entry.name}`);
}

function findForbiddenWrites(source: string): string[] {
  return [...source.matchAll(WRITE_TARGET_PATTERN)]
    .filter((match) => !ALLOWED_TARGET.test(match[1] ?? ''))
    .map((match) => match[0]);
}

describe('server source never writes outside the herox schema', () => {
  it('detects writes to LingoBrain tables', () => {
    expect(findForbiddenWrites('UPDATE sessions SET last_used_at = now()')).toHaveLength(1);
    expect(findForbiddenWrites('INSERT INTO public.progress (user_id) VALUES ($1)')).toHaveLength(1);
    expect(findForbiddenWrites('DELETE FROM "public".users')).toHaveLength(1);
    expect(findForbiddenWrites('INSERT INTO herox.heroes VALUES (1) ON CONFLICT (user_id) DO UPDATE SET name = $2')).toEqual([]);
    expect(findForbiddenWrites('SELECT data FROM public.progress FOR UPDATE')).toEqual([]);
  });

  it('finds no such write in server/src', () => {
    const files = listSourceFiles(SOURCE_DIRECTORY);
    expect(files.length).toBeGreaterThan(0);
    const violations = files.flatMap((file) =>
      findForbiddenWrites(readFileSync(file, 'utf8')).map((statement) => `${file}: ${statement}`),
    );
    expect(violations).toEqual([]);
  });
});
