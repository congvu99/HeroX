import { describe, expect, it } from 'vitest';
import {
  FRAME_RATE_WARMUP_MS,
  LOW_FPS_SUSTAIN_MS,
  LOW_FPS_THRESHOLD,
  LowFrameRateDetector,
  MAX_SAMPLE_GAP_MS,
  QualityController,
  resolveQualityProfile,
} from '../src/platform/quality-settings';

const FRAME_MS = 100;

/** Bộ đo không có khoảng khởi động, để test đếm thời gian fps thấp từ mốc 0. */
const noWarmupDetector = (): LowFrameRateDetector => new LowFrameRateDetector(LOW_FPS_THRESHOLD, LOW_FPS_SUSTAIN_MS, 0);

/** Gửi fps cố định mỗi `FRAME_MS` từ `startMs` tới `endMs` (tính cả hai đầu); trả kết quả mẫu cuối. */
function feed(detector: LowFrameRateDetector, fps: number, startMs: number, endMs: number): boolean {
  let result = false;
  for (let now = startMs; now <= endMs; now += FRAME_MS) result = detector.sample(fps, now);
  return result;
}

describe('LowFrameRateDetector', () => {
  it('chỉ báo fps thấp khi dưới 30 liên tục đủ 3 giây', () => {
    const detector = noWarmupDetector();
    expect(feed(detector, 25, 0, LOW_FPS_SUSTAIN_MS - FRAME_MS)).toBe(false);
    expect(detector.sample(25, LOW_FPS_SUSTAIN_MS)).toBe(true);
  });

  it('một khung đạt 30 fps làm đếm lại từ đầu', () => {
    const detector = noWarmupDetector();
    feed(detector, 20, 0, 2000);
    expect(detector.sample(30, 2100)).toBe(false);
    expect(feed(detector, 20, 2200, 2200 + LOW_FPS_SUSTAIN_MS - FRAME_MS)).toBe(false);
  });

  it('khoảng trống giữa hai mẫu (tab ẩn) không tính là fps thấp', () => {
    const detector = noWarmupDetector();
    feed(detector, 20, 0, 2000);
    const resumeMs = 2000 + MAX_SAMPLE_GAP_MS + 1;
    expect(detector.sample(20, resumeMs)).toBe(false);
    expect(detector.sample(20, resumeMs + LOW_FPS_SUSTAIN_MS - FRAME_MS)).toBe(false);
  });

  it('fps thấp trong khoảng khởi động (đang nạp asset) không tính', () => {
    const detector = new LowFrameRateDetector();
    expect(feed(detector, 10, 0, FRAME_RATE_WARMUP_MS - FRAME_MS)).toBe(false);
    expect(feed(detector, 10, FRAME_RATE_WARMUP_MS, FRAME_RATE_WARMUP_MS + LOW_FPS_SUSTAIN_MS - FRAME_MS)).toBe(false);
    expect(detector.sample(10, FRAME_RATE_WARMUP_MS + LOW_FPS_SUSTAIN_MS)).toBe(true);
  });

  it('bỏ qua fps không hợp lệ', () => {
    const detector = noWarmupDetector();
    expect(feed(detector, Number.NaN, 0, LOW_FPS_SUSTAIN_MS * 2)).toBe(false);
  });
});

describe('resolveQualityProfile', () => {
  it('mức thấp tắt mưa và lớp bóng tối, giảm hạt', () => {
    const low = resolveQualityProfile('low', false);
    expect(low.ambientWeatherEnabled).toBe(false);
    expect(low.dynamicLightingEnabled).toBe(false);
    expect(low.particleDensity).toBeLessThan(resolveQualityProfile('high', false).particleDensity);
  });

  it('giảm chuyển động tắt rung màn và mưa nhưng giữ ánh sáng tĩnh', () => {
    const profile = resolveQualityProfile('high', true);
    expect(profile.screenShakeEnabled).toBe(false);
    expect(profile.ambientWeatherEnabled).toBe(false);
    expect(profile.dynamicLightingEnabled).toBe(true);
    expect(profile.particleDensity).toBe(resolveQualityProfile('low', false).particleDensity);
  });
});

describe('QualityController', () => {
  it('tự hạ xuống low một lần và báo người nghe, không tự nâng lại', () => {
    const controller = new QualityController(false, noWarmupDetector());
    const received: boolean[] = [];
    controller.subscribe(profile => received.push(profile.ambientWeatherEnabled));
    for (let now = 0; now <= LOW_FPS_SUSTAIN_MS; now += FRAME_MS) controller.observeFrameRate(20, now);
    expect(controller.currentLevel).toBe('low');
    for (let now = 4000; now <= 8000; now += FRAME_MS) controller.observeFrameRate(60, now);
    expect(controller.currentLevel).toBe('low');
    expect(received).toEqual([false]);
  });

  it('đổi prefers-reduced-motion phát hồ sơ mới; giá trị trùng thì không phát', () => {
    const controller = new QualityController(false, noWarmupDetector());
    const received: boolean[] = [];
    const unsubscribe = controller.subscribe(profile => received.push(profile.screenShakeEnabled));
    controller.setPrefersReducedMotion(false);
    controller.setPrefersReducedMotion(true);
    unsubscribe();
    controller.setPrefersReducedMotion(false);
    expect(received).toEqual([false]);
  });
});
