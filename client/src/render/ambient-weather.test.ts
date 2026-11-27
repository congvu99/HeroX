import { describe, expect, it } from 'vitest';
import { ARENA_THEMES, type ArenaThemeId } from '../battle/battle-arena-layout';
import { arenaWeatherFor, mapWeatherForPreset, type WeatherKind } from './ambient-weather';
import type { LightingPresetName } from './lighting-presets';

describe('arenaWeatherFor', () => {
  const expected: Readonly<Record<ArenaThemeId, WeatherKind | null>> = {
    fields: 'leaves',
    'ash-forest': 'leaves',
    catacomb: 'motes',
    'broken-heaven': 'motes',
    village: null,
    lair: null,
    hellmaw: null,
  };

  it.each(ARENA_THEMES)('trả hạt đúng tông cho theme %s', (theme) => {
    expect(arenaWeatherFor(theme)?.kind ?? null).toBe(expected[theme]);
  });

  it('lair và hellmaw trả null vì đã có ember riêng', () => {
    expect(arenaWeatherFor('lair')).toBeNull();
    expect(arenaWeatherFor('hellmaw')).toBeNull();
  });

  it('không throw với theme lạ, trả null', () => {
    expect(arenaWeatherFor('unknown-theme' as ArenaThemeId)).toBeNull();
  });

  it('spec có mật độ dương và alpha tắt dần', () => {
    const spec = arenaWeatherFor('fields');
    expect(spec).not.toBeNull();
    expect(spec!.frequencyMs).toBeGreaterThan(0);
    expect(spec!.lifespanMs).toBeGreaterThan(0);
    expect(spec!.alpha.end).toBe(0);
  });
});

describe('mapWeatherForPreset', () => {
  const expected: Readonly<Record<LightingPresetName, WeatherKind>> = {
    sunny: 'leaves',
    sunset: 'leaves',
    moonlight: 'motes',
    holy: 'motes',
    infernal: 'ash',
  };

  it.each(Object.keys(expected) as LightingPresetName[])('trả hạt đúng tông cho preset %s', (preset) => {
    expect(mapWeatherForPreset(preset)?.kind).toBe(expected[preset]);
  });

  it('không throw với preset lạ, trả null', () => {
    expect(mapWeatherForPreset('twilight' as LightingPresetName)).toBeNull();
  });
});
