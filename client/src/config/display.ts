/** Thông số hiển thị đã chốt: top-down 3/4, lưới 32px, khung dọc (portrait) 360×780 (khoảng 11×24 ô), sát iPhone 14 Plus. */
export const LOGICAL_WIDTH = 360;
export const LOGICAL_HEIGHT = 780;
export const TILE_SIZE = 32;
/** Khung hero LPC. */
export const HERO_FRAME_SIZE = 64;
export const BACKGROUND_COLOR = '#0b0b12';

/**
 * Nếu zoom số nguyên lấp được ít nhất tỉ lệ này của zoom FIT thì dùng số nguyên (pixel đều, sắc);
 * thấp hơn thì dùng zoom lẻ để màn nhỏ không bị viền đen quá lớn.
 */
const INTEGER_ZOOM_MIN_FILL = 0.85;
const MIN_ZOOM = 0.25;

/**
 * Zoom (theo px CSS) cho canvas logic trong khung `availableWidth × availableHeight` px CSS.
 * Pixel sắc khi mỗi pixel logic là số nguyên px thiết bị, nên làm tròn theo `devicePixelRatio`
 * (laptop Windows scale 125–150%, iPhone DPR 3).
 */
export function computeDisplayZoom(availableWidth: number, availableHeight: number, devicePixelRatio = 1): number {
  const fitZoom = Math.min(availableWidth / LOGICAL_WIDTH, availableHeight / LOGICAL_HEIGHT);
  if (!Number.isFinite(fitZoom) || fitZoom <= 0) return 1;
  const pixelRatio = devicePixelRatio > 0 && Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  const deviceFitZoom = fitZoom * pixelRatio;
  const integerDeviceZoom = Math.floor(deviceFitZoom);
  if (integerDeviceZoom >= 1 && integerDeviceZoom / deviceFitZoom >= INTEGER_ZOOM_MIN_FILL) {
    return integerDeviceZoom / pixelRatio;
  }
  return Math.max(MIN_ZOOM, fitZoom);
}

interface ZoomableGame {
  readonly scale: { setZoom(value: number): unknown };
}

/**
 * Cập nhật zoom theo kích thước phần tử chứa (đã trừ safe-area bằng CSS trong `index.html`).
 * Nghe cả `visualViewport` (iOS đổi vùng nhìn khi xoay máy, hiện thanh địa chỉ mà không phát `resize` của window)
 * và thay đổi `devicePixelRatio` (kéo cửa sổ sang màn hình khác, đổi mức zoom trình duyệt). Trả hàm huỷ đăng ký.
 */
export function attachDisplayZoom(game: ZoomableGame, container: HTMLElement): () => void {
  let lastZoom = 0;
  let pixelRatioQuery: MediaQueryList | null = null;
  const applyZoom = (): void => {
    const zoom = computeDisplayZoom(container.clientWidth, container.clientHeight, window.devicePixelRatio);
    if (zoom === lastZoom) return;
    lastZoom = zoom;
    game.scale.setZoom(zoom);
  };
  // Media query chỉ báo khi rời đúng mức DPR hiện tại, nên đăng ký lại theo DPR mới sau mỗi lần đổi.
  const watchPixelRatio = (): void => {
    pixelRatioQuery?.removeEventListener('change', handlePixelRatioChange);
    pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    pixelRatioQuery.addEventListener('change', handlePixelRatioChange);
  };
  function handlePixelRatioChange(): void {
    applyZoom();
    watchPixelRatio();
  }
  applyZoom();
  watchPixelRatio();
  const observer = new ResizeObserver(applyZoom);
  observer.observe(container);
  window.visualViewport?.addEventListener('resize', applyZoom);
  return () => {
    observer.disconnect();
    window.visualViewport?.removeEventListener('resize', applyZoom);
    pixelRatioQuery?.removeEventListener('change', handlePixelRatioChange);
  };
}
