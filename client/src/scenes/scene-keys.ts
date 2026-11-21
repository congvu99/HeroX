import type { MapProject } from '../maps/ldtk-loader';

export const SCENE_KEYS = {
  boot: 'boot',
  world: 'world',
  ui: 'ui',
  battle: 'battle',
  citadel: 'citadel',
} as const;

/** Khoá dữ liệu dùng chung giữa các scene trong `game.registry`. */
export const REGISTRY_KEYS = {
  mapProject: 'map-project',
  me: 'me',
  /** Chỉ ở dev: thành trì chạy cục bộ, giữ trạng thái giữa các lần vào công trình. */
  devCitadel: 'dev-citadel',
  /** Giai đoạn thành trì mới nhất từ `/citadel`; mới hơn số liệu `me` lúc boot. */
  citadelStage: 'citadel-stage',
  /** `StoryJournal`: tiến độ truyện dùng chung giữa bản đồ, trận và thành trì. */
  story: 'story',
  /** `QuestTracker`: bảng nhiệm vụ DOM sống suốt phiên. */
  questTracker: 'quest-tracker',
  /** `QualityController`: mức hiệu ứng theo fps và `prefers-reduced-motion`, tạo ở `main.ts`. */
  quality: 'quality',
} as const;

/** Map chương 1, đường dẫn tính từ thư mục `assets/`; chương thực tế để boot do `activeChapterMapPath` chọn. */
export const START_MAP_PATH = 'maps/chapter-1-misty-village.ldtk';

/** Khoá cache project có namespace theo file map để nhiều chương không đè cache của nhau. */
export function mapProjectCacheKey(mapPath: string): string {
  return `ldtk-project:${mapPath}`;
}

/** Project LDtk đã parse kèm đường dẫn file gốc để giải đường dẫn tương đối và đặt namespace cho cache. */
export interface LoadedMapProject {
  readonly sourcePath: string;
  readonly project: MapProject;
}
