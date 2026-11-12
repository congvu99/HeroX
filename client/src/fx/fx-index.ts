/** Thông tin phát một hiệu ứng, lấy từ `meta.pixelfx` lúc render (xem `tools/render-fx.mjs`). */
export interface FxInfo {
  /** Id effect gốc trong pixelfx, ví dụ `holy/smite`; tên khung trong atlas là `<phần sau dấu />` + số thứ tự. */
  readonly source: string;
  readonly fps: number;
  readonly loop: boolean;
  readonly frames: number;
  readonly frameSize: readonly [number, number];
  /** Điểm gốc của effect (thường là mặt đất dưới chân) trong khung, tính bằng pixel. */
  readonly pivot: readonly [number, number];
}

export type FxIndex = ReadonlyMap<string, FxInfo>;

export class FxIndexFormatError extends Error {
  constructor(detail: string) {
    super(`fx-index.json sai định dạng: ${detail}`);
    this.name = 'FxIndexFormatError';
  }
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function parseFxInfo(name: string, raw: unknown): FxInfo {
  if (typeof raw !== 'object' || raw === null) throw new FxIndexFormatError(`${name} không phải object`);
  const { source, fps, loop, frames, frameSize, pivot } = raw as Partial<Record<keyof FxInfo, unknown>>;
  if (typeof source !== 'string' || !source.includes('/')) throw new FxIndexFormatError(`${name}.source`);
  if (!isPositiveNumber(fps) || !isPositiveNumber(frames) || !Number.isInteger(frames)) throw new FxIndexFormatError(`${name}.fps/frames`);
  if (typeof loop !== 'boolean') throw new FxIndexFormatError(`${name}.loop`);
  if (!isNumberPair(frameSize) || !isNumberPair(pivot)) throw new FxIndexFormatError(`${name}.frameSize/pivot`);
  return { source, fps, loop, frames, frameSize, pivot };
}

export function parseFxIndex(raw: unknown): FxIndex {
  const effects = typeof raw === 'object' && raw !== null ? (raw as { effects?: unknown }).effects : undefined;
  if (typeof effects !== 'object' || effects === null) throw new FxIndexFormatError('thiếu effects');
  return new Map(Object.entries(effects).map(([name, info]) => [name, parseFxInfo(name, info)]));
}

/** Tên khung thứ `frameIndex` trong atlas pixelfx (`"<tên effect> <số>"`). */
export function fxFrameName(info: FxInfo, frameIndex: number): string {
  return `${info.source.slice(info.source.indexOf('/') + 1)} ${frameIndex}`;
}

/** Gốc sprite (0..1) theo pivot, để hiệu ứng đặt đúng chỗ chân/điểm trúng. */
export function fxOrigin(info: FxInfo): { readonly x: number; readonly y: number } {
  return { x: info.pivot[0] / info.frameSize[0], y: info.pivot[1] / info.frameSize[1] };
}
