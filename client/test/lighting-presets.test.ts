import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARENA_THEMES } from '../src/battle/battle-arena-layout';
import { ARENA_LIGHTING, LEVEL_LIGHTING, LIGHTING_PRESETS, lightingForArena, lightingForLevel } from '../src/render/lighting-presets';

const project = JSON.parse(readFileSync(new URL('../../assets/maps/chapter-1-misty-village.ldtk', import.meta.url), 'utf8')) as {
  levels: { identifier: string }[];
};
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const RGB_LIST = /^\d{1,3}, \d{1,3}, \d{1,3}$/;
const inUnit = (value: number) => value >= 0 && value <= 1;

describe('lighting-presets', () => {
  it('mọi level chương 1 có preset khai báo', () => {
    expect(project.levels.length).toBeGreaterThan(0);
    for (const { identifier } of project.levels) expect(LEVEL_LIGHTING[identifier], identifier).toBeDefined();
  });

  it('mọi sân trận có preset', () => {
    for (const theme of ARENA_THEMES) expect(lightingForArena(theme).name).toBe(ARENA_LIGHTING[theme]);
  });

  it('gán đúng kiểu ánh sáng theo level, level lạ dùng nắng', () => {
    expect(lightingForLevel('Misty_Village').name).toBe('sunset');
    expect(lightingForLevel('Scarecrow_Lair').name).toBe('moonlight');
    expect(lightingForLevel('Unknown').name).toBe('sunny');
  });

  it('giá trị preset hợp lệ', () => {
    for (const [name, preset] of Object.entries(LIGHTING_PRESETS)) {
      expect(preset.name).toBe(name);
      expect(preset.toneLight).toMatch(HEX_COLOR);
      expect(preset.toneDark).toMatch(HEX_COLOR);
      expect(preset.washRgb).toMatch(RGB_LIST);
      expect(preset.shaftRgb.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)).toBe(true);
      expect(preset.shaftAngleDeg).toBeGreaterThanOrEqual(0);
      expect(preset.shaftAngleDeg).toBeLessThan(60);
      for (const alpha of [preset.washAlpha, preset.shaftAlpha, preset.windowGlowAlpha, preset.warmLightAlpha, preset.shadowAlpha, preset.vignetteStrength]) {
        expect(inUnit(alpha)).toBe(true);
      }
    }
    expect(LIGHTING_PRESETS.sunset.shadowAlpha).toBeGreaterThan(LIGHTING_PRESETS.sunny.shadowAlpha);
    expect(LIGHTING_PRESETS.moonlight.vignetteStrength).toBeGreaterThan(LIGHTING_PRESETS.sunny.vignetteStrength);
  });
});
