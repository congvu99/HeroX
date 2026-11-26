import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORY_CHAPTERS } from '@herox/shared';
import { describe, expect, it } from 'vitest';
import { presentChapterMapPaths } from '../src/maps/chapter-maps';
import { findEntities, parseLdtkLevel, parseLdtkProject, resolveAssetPath } from '../src/maps/ldtk-loader';
import { NPC_SPRITE_PATHS } from '../src/render/npc-sprite-paths';

const ASSETS_DIR = join(import.meta.dirname, '..', '..', 'assets');

function readJsonAsset(relPath: string): unknown {
  return JSON.parse(readFileSync(join(ASSETS_DIR, relPath), 'utf8'));
}

/** Mọi `dialogId` của NPC trên các map chương đang có trong bản build. */
function collectMapDialogIds(): string[] {
  const ids = new Set<string>();
  for (const { path } of presentChapterMapPaths()) {
    const project = parseLdtkProject(readJsonAsset(path));
    for (const ref of project.levels) {
      if (ref.externalRelPath === null) throw new Error(`${ref.identifier} phải tách file .ldtkl`);
      const level = parseLdtkLevel(readJsonAsset(resolveAssetPath(path, ref.externalRelPath)));
      for (const npc of findEntities(level, 'Npc')) ids.add(npc.dialogId);
    }
  }
  return [...ids].sort();
}

describe('NPC trên map', () => {
  const dialogIds = collectMapDialogIds();

  it('quét được NPC của nhiều chương', () => {
    expect(dialogIds.length).toBeGreaterThan(6);
  });

  it('mọi NPC trên map có hình, không rơi về hình tạm', () => {
    expect(dialogIds.filter((id) => NPC_SPRITE_PATHS[id] === undefined)).toEqual([]);
  });

  it('mọi đường dẫn hình NPC trỏ tới file có thật', () => {
    const missing = Object.values(NPC_SPRITE_PATHS).filter((path) => !existsSync(join(ASSETS_DIR, path)));
    expect(missing).toEqual([]);
  });

  it('mọi NPC trên map có hội thoại trùng dialogId, nói chuyện được', () => {
    const scriptIds = new Set(STORY_CHAPTERS.flatMap((chapter) => chapter.dialogs.map((dialog) => dialog.id)));
    expect(dialogIds.filter((id) => !scriptIds.has(id))).toEqual([]);
  });
});
