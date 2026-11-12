import type { BattleSound } from '../battle/battle-cues';
import { unlockAudioContext } from './audio-unlock';

interface ToneStep {
  readonly frequency: number;
  readonly endFrequency: number;
  readonly durationS: number;
  readonly type: OscillatorType;
  readonly volume: number;
}

/** Âm tổng hợp ngắn, không cần file âm thanh (không tốn tải, không vướng license). */
const SOUND_SHAPES: Readonly<Record<BattleSound, readonly ToneStep[]>> = {
  cast: [{ frequency: 520, endFrequency: 880, durationS: 0.12, type: 'triangle', volume: 0.18 }],
  hit: [{ frequency: 180, endFrequency: 70, durationS: 0.12, type: 'square', volume: 0.16 }],
  heavyHit: [
    { frequency: 140, endFrequency: 40, durationS: 0.25, type: 'sawtooth', volume: 0.22 },
    { frequency: 900, endFrequency: 300, durationS: 0.2, type: 'triangle', volume: 0.12 },
  ],
  enemyHit: [{ frequency: 110, endFrequency: 55, durationS: 0.18, type: 'sawtooth', volume: 0.18 }],
  miss: [{ frequency: 300, endFrequency: 150, durationS: 0.2, type: 'square', volume: 0.1 }],
  combo: [
    { frequency: 660, endFrequency: 660, durationS: 0.07, type: 'triangle', volume: 0.14 },
    { frequency: 990, endFrequency: 990, durationS: 0.1, type: 'triangle', volume: 0.14 },
  ],
  evade: [{ frequency: 1200, endFrequency: 400, durationS: 0.15, type: 'sine', volume: 0.12 }],
  victory: [
    { frequency: 523, endFrequency: 523, durationS: 0.12, type: 'triangle', volume: 0.16 },
    { frequency: 659, endFrequency: 659, durationS: 0.12, type: 'triangle', volume: 0.16 },
    { frequency: 784, endFrequency: 784, durationS: 0.25, type: 'triangle', volume: 0.16 },
  ],
  defeat: [
    { frequency: 392, endFrequency: 392, durationS: 0.2, type: 'sine', volume: 0.14 },
    { frequency: 262, endFrequency: 196, durationS: 0.4, type: 'sine', volume: 0.14 },
  ],
};

/**
 * Âm thanh trận, tắt được. AudioContext chỉ tạo sau thao tác đầu tiên của người chơi
 * (Safari iOS chặn âm thanh trước đó).
 */
export class BattleSounds {
  private context: AudioContext | null = null;

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Gọi trong handler chạm/phím. */
  unlock(): void {
    if (!this.enabled) return;
    this.context = unlockAudioContext(this.context);
  }

  play(sound: BattleSound): void {
    const context = this.context;
    if (!this.enabled || context === null || context.state !== 'running') return;
    let startS = context.currentTime;
    for (const step of SOUND_SHAPES[sound]) {
      this.playTone(context, step, startS);
      startS += step.durationS;
    }
  }

  destroy(): void {
    this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private playTone(context: AudioContext, step: ToneStep, startS: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = step.type;
    oscillator.frequency.setValueAtTime(step.frequency, startS);
    oscillator.frequency.exponentialRampToValueAtTime(step.endFrequency, startS + step.durationS);
    gain.gain.setValueAtTime(step.volume, startS);
    gain.gain.exponentialRampToValueAtTime(0.001, startS + step.durationS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startS);
    oscillator.stop(startS + step.durationS);
  }
}
