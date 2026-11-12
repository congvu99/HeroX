/** Một dòng trong `assets/credits.json` (sinh/kiểm bởi `tools/build-credits.mjs`), đã chuẩn hoá cho màn ghi công. */
export interface AssetCredit {
  readonly path: string;
  readonly source: string;
  readonly url: string;
  readonly authors: readonly string[];
  readonly license: string;
}

export interface CreditGroup {
  readonly source: string;
  readonly license: string;
  readonly authors: readonly string[];
  readonly url: string;
  readonly count: number;
}

// Chưa có file thì glob trả rỗng: màn ghi công báo "chưa có" thay vì làm hỏng bản build.
const creditFiles = import.meta.glob<unknown>('../../../assets/credits.json', { eager: true, import: 'default' });

/** Tác giả ghi dạng mảng hoặc chuỗi ngăn bởi dấu phẩy. */
function readAuthors(value: unknown): string[] {
  let names: unknown[] = [];
  if (Array.isArray(value)) names = value;
  else if (typeof value === 'string') names = value.split(',');
  return names.filter((name): name is string => typeof name === 'string').map((name) => name.trim()).filter((name) => name !== '');
}

/** Đọc dòng credits thô; thiếu nguồn hoặc giấy phép thì bỏ (test asset-credits đã chặn ở lúc build). */
export function parseCredits(raw: unknown): AssetCredit[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const fields = entry as Readonly<Record<string, unknown>>;
    const { path, source, license, url } = fields;
    if (typeof path !== 'string' || typeof source !== 'string' || typeof license !== 'string') return [];
    return [{ path, source, license, url: typeof url === 'string' ? url : '', authors: readAuthors(fields.authors) }];
  });
}

/** Dòng ghi công đóng gói trong bản build. */
export function bundledCredits(): AssetCredit[] {
  return parseCredits(Object.values(creditFiles)[0]);
}

/** Gộp theo nguồn + giấy phép để màn ghi công gọn, tác giả không lặp. */
export function groupCredits(credits: readonly AssetCredit[]): CreditGroup[] {
  const groups = new Map<string, { source: string; license: string; url: string; authors: Set<string>; count: number }>();
  for (const credit of credits) {
    const key = JSON.stringify([credit.source, credit.license]);
    const group = groups.get(key) ?? { source: credit.source, license: credit.license, url: credit.url, authors: new Set<string>(), count: 0 };
    for (const author of credit.authors) group.authors.add(author);
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ source: group.source, license: group.license, url: group.url, authors: [...group.authors].sort(), count: group.count }))
    .sort((left, right) => left.source.localeCompare(right.source));
}
