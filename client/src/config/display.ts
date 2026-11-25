/** Thông số hiển thị đã chốt: top-down 3/4, lưới 32px, khung dọc (portrait) 360×780 (khoảng 11×24 ô), sát iPhone 14 Plus. */
export const LOGICAL_WIDTH = 360;
export const LOGICAL_HEIGHT = 780;
export const TILE_SIZE = 32;
/** Khung hero LPC. */
export const HERO_FRAME_SIZE = 64;
/** Nền chiều tà tím ấm quanh canvas và sau sân trận; khớp index.html, manifest.webmanifest (không import được hằng). */
export const BACKGROUND_COLOR = '#2e2233';

/**
 * Chỉ dùng zoom số nguyên (pixel đều, sắc) khi nó lấp gần hết khung FIT — tức mất chưa tới ~0,5%.
 * Ngưỡng cao để màn thật (vd iPhone DPR 3, FIT 3,23 → làm tròn 3) không bị thu nhỏ để lại viền đen 4 phía;
 * khi integer phí nhiều thì ưu tiên lấp đầy bằng zoom lẻ (người dùng đã chốt: lấp đầy hơn pixel tuyệt đối sắc).
 */
const INTEGER_ZOOM_MIN_FILL = 0.995;
const MIN_ZOOM = 0.25;

/**
 * Trần của khung nhìn mở rộng (pixel logic). Màn quá ngang (desktop, máy tính bảng) hoặc quá dọc vượt mức này
 * thì chừa viền thay vì kéo dài sân vô hạn.
 */
export const MAX_VIEW_WIDTH = 480;
export const MAX_VIEW_HEIGHT = 1040;

export interface ViewSize {
  readonly width: number;
  readonly height: number;
}

/** Khung thiết kế 360×780: sân trận, HUD, vòng từ đều đặt theo khung này và luôn nằm giữa khung nhìn. */
export const DESIGN_VIEW: ViewSize = { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Làm tròn về số chẵn để phần thừa chia đều hai mép là số nguyên (pixel sắc). */
function roundToEven(value: number): number {
  return Math.round(value / 2) * 2;
}

/**
 * Kích thước khung nhìn logic để canvas lấp đầy vùng `availableWidth × availableHeight` (px CSS):
 * giữ tối thiểu khung thiết kế 360×780, nới chiều ngang hoặc chiều dọc theo đúng tỉ lệ màn (trong trần MAX_VIEW_*).
 * Màn iPhone trong Safari thường "ngang" hơn 360:780 nên khung rộng ra, hết viền hai bên.
 */
export function computeViewSize(availableWidth: number, availableHeight: number): ViewSize {
  const aspect = availableWidth / availableHeight;
  if (!Number.isFinite(aspect) || aspect <= 0) return DESIGN_VIEW;
  return {
    width: clamp(roundToEven(LOGICAL_HEIGHT * aspect), LOGICAL_WIDTH, MAX_VIEW_WIDTH),
    height: clamp(roundToEven(LOGICAL_WIDTH / aspect), LOGICAL_HEIGHT, MAX_VIEW_HEIGHT),
  };
}

/**
 * Zoom (theo px CSS) cho canvas logic cỡ `view` (mặc định khung thiết kế) trong khung `availableWidth × availableHeight` px CSS.
 * Pixel sắc khi mỗi pixel logic là số nguyên px thiết bị, nên làm tròn theo `devicePixelRatio`
 * (laptop Windows scale 125–150%, iPhone DPR 3).
 */
export function computeDisplayZoom(
  availableWidth: number,
  availableHeight: number,
  devicePixelRatio = 1,
  view: ViewSize = DESIGN_VIEW,
): number {
  const fitZoom = Math.min(availableWidth / view.width, availableHeight / view.height);
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
  readonly scale: { setZoom(value: number): unknown; resize(width: number, height: number): unknown };
}

/**
 * Cập nhật cỡ khung nhìn logic (`computeViewSize`) và zoom theo kích thước phần tử chứa (đã trừ safe-area bằng CSS trong `index.html`).
 * Nghe cả `visualViewport` (iOS đổi vùng nhìn khi xoay máy, hiện thanh địa chỉ mà không phát `resize` của window)
 * và thay đổi `devicePixelRatio` (kéo cửa sổ sang màn hình khác, đổi mức zoom trình duyệt). Trả hàm huỷ đăng ký.
 */
export function attachDisplayZoom(game: ZoomableGame, container: HTMLElement): () => void {
  let lastZoom = 0;
  let lastView: ViewSize | null = null;
  let pixelRatioQuery: MediaQueryList | null = null;
  const applyZoom = (): void => {
    const view = computeViewSize(container.clientWidth, container.clientHeight);
    if (lastView === null || view.width !== lastView.width || view.height !== lastView.height) {
      lastView = view;
      game.scale.resize(view.width, view.height);
      // Đổi cỡ canvas làm Phaser tính lại cỡ hiển thị, nên phải đặt lại zoom dù giá trị không đổi.
      lastZoom = 0;
    }
    const zoom = computeDisplayZoom(container.clientWidth, container.clientHeight, window.devicePixelRatio, view);
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
