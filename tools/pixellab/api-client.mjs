// Thin client cho PixelLab API (https://api.pixellab.ai/v1). Chỉ đọc khoá từ env PIXELLAB_API_KEY;
// không bao giờ ghi khoá ra file/log. Mỗi hàm trả ảnh base64 PNG đã decode sang RGBA (png.mjs).
import { decodePng } from '../lib/png.mjs';

const BASE_URL = 'https://api.pixellab.ai/v1';
const BASE_URL_V2 = 'https://api.pixellab.ai/v2';
const REQUEST_TIMEOUT_MS = 120_000;

/** Lấy khoá API; ném lỗi rõ nếu thiếu để người chạy biết đặt env. */
export function requireApiKey() {
  const key = process.env.PIXELLAB_API_KEY;
  if (!key) throw new Error('Thiếu env PIXELLAB_API_KEY (đặt user-level rồi mở shell mới).');
  return key;
}

/** Lỗi API có kèm mã HTTP để nơi gọi phân biệt hết-quota (402/429) với lỗi khác. */
export class PixelLabApiError extends Error {
  name = 'PixelLabApiError';
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function postJson(path, body, baseUrl = BASE_URL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${requireApiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new PixelLabApiError(`POST ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`, res.status);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${requireApiKey()}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new PixelLabApiError(`GET ${label} → HTTP ${res.status}`, res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Số dư tài khoản (USD). Dùng để báo cáo, không chặn vì tài khoản có thể chạy bằng quota generations. */
export async function getBalance() {
  return getJson(`${BASE_URL}/balance`, '/balance');
}

/**
 * Trạng thái gói (v2): tiền và quota generations còn lại. Trả về
 * { credits: { type, usd }, subscription: { type, status, plan, generations, total } }.
 * Dùng để báo số lượt sinh còn lại và chặn chạy quá ngân sách.
 */
export async function getSubscriptionBalance() {
  return getJson(`${BASE_URL_V2}/balance`, '/v2/balance');
}

/** Số lượt sinh (generations) còn lại theo gói, hoặc null nếu v2 không trả về con số. */
export function remainingGenerations(v2Balance) {
  const value = v2Balance?.subscription?.generations;
  return typeof value === 'number' ? value : null;
}

function decodeResponseImage(json, label) {
  const base64 = json?.image?.base64;
  if (typeof base64 !== 'string') throw new PixelLabApiError(`${label}: phản hồi không có ảnh base64`, 0);
  return decodePng(Buffer.from(base64, 'base64'), label);
}

/**
 * Sinh sprite từ mô tả (pixflux). Trả ảnh RGBA đã decode.
 * @param {{description:string,width:number,height:number,view?:string,direction?:string,seed?:number,
 *   outline?:string,shading?:string,detail?:string,negative?:string,noBackground?:boolean}} opts
 */
export async function generateImage(opts) {
  const body = {
    description: opts.description,
    image_size: { width: opts.width, height: opts.height },
    view: opts.view ?? 'high top-down',
    no_background: opts.noBackground ?? true,
    outline: opts.outline ?? 'single color black outline',
    shading: opts.shading ?? 'detailed shading',
    detail: opts.detail ?? 'highly detailed',
  };
  if (opts.direction) body.direction = opts.direction;
  if (opts.negative) body.negative_description = opts.negative;
  if (typeof opts.seed === 'number') body.seed = opts.seed;
  return decodeResponseImage(await postJson('/generate-image-pixflux', body), `pixflux(${opts.description.slice(0, 30)})`);
}

function toBase64Image(rgbaImage, encodePng) {
  return { type: 'base64', base64: encodePng(rgbaImage).toString('base64') };
}

/**
 * Xoay sprite sang hướng khác (tạo 4 facing từ 1 base). from/to dùng Direction của PixelLab.
 * Cần truyền encodePng để gói ảnh nguồn thành base64.
 */
export async function rotateImage(fromImage, { fromDirection, toDirection, width, height, seed }, encodePng) {
  const body = {
    from_image: toBase64Image(fromImage, encodePng),
    image_size: { width, height },
    from_view: 'high top-down',
    to_view: 'high top-down',
    from_direction: fromDirection,
    to_direction: toDirection,
  };
  if (typeof seed === 'number') body.seed = seed;
  return decodeResponseImage(await postJson('/rotate', body), `rotate(${fromDirection}->${toDirection})`);
}

/**
 * Sinh N frame hoạt ảnh của một action từ ảnh tham chiếu (animate-with-text).
 * Trả mảng ảnh RGBA theo thứ tự frame.
 */
export async function animateWithText(referenceImage, opts, encodePng) {
  const body = {
    image_size: { width: opts.width, height: opts.height },
    description: opts.description,
    action: opts.action,
    view: opts.view ?? 'high top-down',
    direction: opts.direction ?? 'south',
    n_frames: opts.frames,
    reference_image: toBase64Image(referenceImage, encodePng),
  };
  if (opts.negative) body.negative_description = opts.negative;
  if (typeof opts.seed === 'number') body.seed = opts.seed;
  const json = await postJson('/animate-with-text', body);
  const images = json?.images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new PixelLabApiError(`animate(${opts.action}): phản hồi không có mảng images`, 0);
  }
  return images.map((img, index) => decodePng(Buffer.from(img.base64, 'base64'), `animate(${opts.action})#${index}`));
}

const TILESET_POLL_MS = 5_000;
const TILESET_TIMEOUT_MS = 6 * 60_000;
const TILESET_PENDING_STATUS = 423;

/**
 * Sinh tileset top-down Wang 2 địa hình (lower/upper) qua v2, chờ xử lý nền xong rồi trả từng ô kèm 4 góc.
 * @param {{lower:string,upper:string,transition?:string,tileSize:number,transitionSize?:number,seed?:number,
 *   shading?:string,detail?:string,lowerBaseTileId?:string}} opts
 * `lowerBaseTileId`: id ô của tileset trước để dùng lại đúng mảng nền đó (cỏ khớp màu giữa các tileset).
 * @returns {Promise<{tileSize:number,tiles:{corners:{NW:string,NE:string,SW:string,SE:string},image:object}[]}>}
 */
export async function createTileset(opts) {
  const body = {
    lower_description: opts.lower,
    upper_description: opts.upper,
    transition_description: opts.transition ?? '',
    tile_size: { width: opts.tileSize, height: opts.tileSize },
    transition_size: opts.transitionSize ?? 0,
    view: 'high top-down',
  };
  if (opts.lowerBaseTileId) body.lower_base_tile_id = opts.lowerBaseTileId;
  if (opts.shading) body.shading = opts.shading;
  if (opts.detail) body.detail = opts.detail;
  if (typeof opts.seed === 'number') body.seed = opts.seed;
  const queued = await postJson('/create-tileset', body, BASE_URL_V2);
  const tilesetId = queued?.tileset_id;
  if (typeof tilesetId !== 'string') throw new PixelLabApiError('create-tileset: phản hồi không có tileset_id', 0);
  const json = await pollTileset(tilesetId);
  const tiles = json?.tileset?.tiles;
  if (!Array.isArray(tiles) || tiles.length === 0) throw new PixelLabApiError('tileset: phản hồi không có tiles', 0);
  return {
    tileSize: opts.tileSize,
    tiles: tiles.map((tile, index) => ({ corners: tile.corners, image: decodePng(Buffer.from(tile.image.base64, 'base64'), `tileset#${index}`) })),
  };
}

/** Chờ tileset xử lý nền xong: 423 nghĩa là đang sinh, thử lại sau mỗi TILESET_POLL_MS. */
async function pollTileset(tilesetId) {
  const deadline = Date.now() + TILESET_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      return await getJson(`${BASE_URL_V2}/tilesets/${tilesetId}`, '/v2/tilesets/{id}');
    } catch (error) {
      if (!(error instanceof PixelLabApiError) || error.status !== TILESET_PENDING_STATUS) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, TILESET_POLL_MS));
  }
  throw new PixelLabApiError(`tileset ${tilesetId}: quá ${TILESET_TIMEOUT_MS / 1000}s chưa xong`, 0);
}
