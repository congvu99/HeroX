/**
 * Mức chất lượng hiệu ứng: tự hạ khi máy không giữ nổi khung hình, và tôn trọng `prefers-reduced-motion`.
 * Logic thuần; scene đọc `QualityProfile` để bật/tắt hạt, mưa, lớp bóng tối, rung màn hình.
 */

export const QUALITY_LEVELS = ['high', 'low'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

/** Dưới mức fps này liên tục trong `LOW_FPS_SUSTAIN_MS` thì hạ chất lượng. */
export const LOW_FPS_THRESHOLD = 30;
export const LOW_FPS_SUSTAIN_MS = 3000;
/**
 * Hai mẫu fps cách nhau quá mức này (tab bị ẩn, máy treo khi tải asset) thì bỏ chuỗi đang đếm:
 * khoảng trống đó không phản ánh tốc độ vẽ thật.
 */
export const MAX_SAMPLE_GAP_MS = 1000;
/** Bỏ qua mấy giây đầu kể từ mẫu đầu tiên: lúc nạp asset, dựng map fps thấp là bình thường, không phải máy yếu. */
export const FRAME_RATE_WARMUP_MS = 5000;

export interface QualityProfile {
  /** Hệ số nhân số hạt của mọi emitter (1 = đủ, 0 = tắt). */
  readonly particleDensity: number;
  /** Mưa, tàn lửa bay: hiệu ứng nền theo `docs/art-direction.md`. */
  readonly ambientWeatherEnabled: boolean;
  /** Lớp bóng tối khoét vùng sáng quanh hero và nguồn lửa; tắt thì dùng màu tối phẳng. */
  readonly dynamicLightingEnabled: boolean;
  readonly screenShakeEnabled: boolean;
}

const PROFILES: Readonly<Record<QualityLevel, QualityProfile>> = {
  high: { particleDensity: 1, ambientWeatherEnabled: true, dynamicLightingEnabled: true, screenShakeEnabled: true },
  low: { particleDensity: 0.35, ambientWeatherEnabled: false, dynamicLightingEnabled: false, screenShakeEnabled: true },
};

/**
 * Hồ sơ hiệu ứng theo mức chất lượng và cài đặt giảm chuyển động của hệ điều hành.
 * Giảm chuyển động: tắt rung màn hình và mưa (chuyển động nền liên tục), giữ ánh sáng vì nó tĩnh.
 */
export function resolveQualityProfile(level: QualityLevel, prefersReducedMotion: boolean): QualityProfile {
  const base = PROFILES[level];
  if (!prefersReducedMotion) return base;
  return {
    ...base,
    particleDensity: Math.min(base.particleDensity, PROFILES.low.particleDensity),
    ambientWeatherEnabled: false,
    screenShakeEnabled: false,
  };
}

/** Phát hiện fps thấp kéo dài. Gọi `sample` mỗi khung hoặc định kỳ với fps đo được và thời điểm (ms). */
export class LowFrameRateDetector {
  private belowSinceMs: number | null = null;
  private lastSampleMs: number | null = null;
  private firstSampleMs: number | null = null;

  constructor(
    private readonly thresholdFps = LOW_FPS_THRESHOLD,
    private readonly sustainMs = LOW_FPS_SUSTAIN_MS,
    private readonly warmupMs = FRAME_RATE_WARMUP_MS,
  ) {}

  /** Trả `true` khi fps đã dưới ngưỡng liên tục ít nhất `sustainMs` (sau khoảng khởi động). */
  sample(fps: number, nowMs: number): boolean {
    this.firstSampleMs ??= nowMs;
    if (nowMs - this.firstSampleMs < this.warmupMs) {
      this.lastSampleMs = nowMs;
      return false;
    }
    const gapTooLarge = this.lastSampleMs !== null && nowMs - this.lastSampleMs > MAX_SAMPLE_GAP_MS;
    this.lastSampleMs = nowMs;
    if (gapTooLarge || !Number.isFinite(fps) || fps >= this.thresholdFps) {
      this.belowSinceMs = null;
      return false;
    }
    this.belowSinceMs ??= nowMs;
    return nowMs - this.belowSinceMs >= this.sustainMs;
  }

  reset(): void {
    this.belowSinceMs = null;
    this.lastSampleMs = null;
    this.firstSampleMs = null;
  }
}

export type QualityChangeListener = (profile: QualityProfile) => void;

/**
 * Giữ mức chất lượng hiện tại. Chỉ tự hạ, không tự nâng lại trong phiên: nâng/hạ qua lại làm hình chập chờn.
 */
export class QualityController {
  private level: QualityLevel = 'high';
  private readonly detector: LowFrameRateDetector;
  private readonly listeners = new Set<QualityChangeListener>();

  constructor(
    private prefersReducedMotion: boolean,
    detector = new LowFrameRateDetector(),
  ) {
    this.detector = detector;
  }

  get currentLevel(): QualityLevel {
    return this.level;
  }

  get profile(): QualityProfile {
    return resolveQualityProfile(this.level, this.prefersReducedMotion);
  }

  /** Báo fps của khung vừa vẽ; tự hạ xuống `low` khi fps thấp kéo dài. */
  observeFrameRate(fps: number, nowMs: number): void {
    if (this.level === 'low') return;
    if (!this.detector.sample(fps, nowMs)) return;
    this.level = 'low';
    this.notify();
  }

  setPrefersReducedMotion(value: boolean): void {
    if (value === this.prefersReducedMotion) return;
    this.prefersReducedMotion = value;
    this.notify();
  }

  /** Đăng ký nghe đổi hồ sơ; trả hàm huỷ. */
  subscribe(listener: QualityChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const profile = this.profile;
    for (const listener of this.listeners) listener(profile);
  }
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MatchMedia = (query: string) => MediaQueryList;

/** Theo dõi `prefers-reduced-motion`: gọi ngay với giá trị hiện tại rồi mỗi lần người dùng đổi. Trả hàm huỷ. */
export function watchReducedMotion(matchMedia: MatchMedia, onChange: (prefersReducedMotion: boolean) => void): () => void {
  const query = matchMedia(REDUCED_MOTION_QUERY);
  const handler = (event: MediaQueryListEvent): void => onChange(event.matches);
  onChange(query.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
