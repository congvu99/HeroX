import Phaser from 'phaser';
import type { CreateHeroRequest, MeResponse } from '@herox/shared';
import { currentUtcOffsetMinutes, fetchMe, readEngSessionToken, type MeResult } from '../api/me-api';
import { createHero } from '../api/story-api';
import { LdtkFormatError, parseLdtkProject } from '../maps/ldtk-loader';
import { mapAssetUrl } from '../maps/map-asset-urls';
import { createPlaceholderTextures } from '../render/placeholder-textures';
import { ApiStoryBackend, DevStoryBackend, StoryJournal } from '../story/story-journal';
import { HeroCreationForm } from '../ui/hero-creation-form';
import { REGISTRY_KEYS, SCENE_KEYS, START_MAP_CACHE_KEY, START_MAP_PATH, type LoadedMapProject } from './scene-keys';

/** Trang chủ LingoBrain cùng origin, nơi người chơi đăng nhập. */
const ENG_HOME_PATH = '/';
const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'serif', fontSize: '32px', color: '#e8d9a8' };
const BODY_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '14px',
  color: '#c8c3d6',
  align: 'center',
  wordWrap: { width: 520 },
};
const BUTTON_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '16px',
  color: '#0b0b12',
  backgroundColor: '#e8d9a8',
  padding: { x: 14, y: 8 },
};

/** Nạp asset tối thiểu, xác thực bằng phiên LingoBrain rồi vào world; chưa đăng nhập thì mời về LingoBrain. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    this.load.json(START_MAP_CACHE_KEY, mapAssetUrl(START_MAP_PATH));
  }

  create(): void {
    createPlaceholderTextures(this);
    if (!this.loadMapProject()) return;
    void this.authenticate();
  }

  /** Map hỏng hoặc không tải được thì dừng ở màn lỗi thay vì màn đen. */
  private loadMapProject(): boolean {
    try {
      const loaded: LoadedMapProject = {
        sourcePath: START_MAP_PATH,
        project: parseLdtkProject(this.cache.json.get(START_MAP_CACHE_KEY)),
      };
      this.registry.set(REGISTRY_KEYS.mapProject, loaded);
      return true;
    } catch (error) {
      const detail = error instanceof LdtkFormatError ? error.message : 'Không tải được bản đồ';
      this.showUnavailable(`Lỗi dữ liệu bản đồ: ${detail}`, () => window.location.reload());
      return false;
    }
  }

  private async authenticate(): Promise<void> {
    this.showStatus('Đang vào HeroX…');
    const token = readEngSessionToken(() => window.localStorage);
    if (token === null) {
      this.showLoginRequired();
      return;
    }
    let result: MeResult;
    try {
      result = await fetchMe(token, window.fetch.bind(window), currentUtcOffsetMinutes());
    } catch {
      // Lưới an toàn: mọi lỗi bất ngờ đều có nút Thử lại, không kẹt ở màn chờ.
      result = { kind: 'unavailable', message: 'Không vào được HeroX, thử lại' };
    }
    // Người chơi có thể đã rời scene trong lúc chờ mạng.
    if (!this.scene.isActive()) return;
    if (result.kind === 'ok') {
      this.registry.set(REGISTRY_KEYS.me, result.me);
      if (result.me.hero === null) this.showHeroCreation(token, result.me);
      else void this.loadStory(token);
    } else if (result.kind === 'unauthenticated') {
      this.showLoginRequired();
    } else {
      this.showUnavailable(result.message, () => void this.authenticate());
    }
  }

  /** Lần đầu vào game: tạo nhân vật rồi mới vào truyện. */
  private showHeroCreation(token: string, me: MeResponse): void {
    this.resetScreen();
    const form = new HeroCreationForm(document.body, async (request: CreateHeroRequest) => {
      const created = await createHero(token, request, window.fetch.bind(window));
      if (created.kind === 'unauthenticated') return 'Phiên đăng nhập đã hết, hãy đăng nhập lại LingoBrain';
      if (created.kind === 'failed') return created.message;
      form.close();
      this.registry.set(REGISTRY_KEYS.me, { ...me, hero: created.value });
      void this.loadStory(token);
      return null;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => form.close());
  }

  /** Tải tiến độ truyện trước khi vào map để cổng, trận, hội thoại mở đúng mốc đang dở. */
  private async loadStory(token: string): Promise<void> {
    this.showStatus('Đang mở lại câu chuyện…');
    const journal = new StoryJournal(new ApiStoryBackend(token, window.fetch.bind(window)));
    const loaded = await journal.load();
    if (!this.scene.isActive()) return;
    if (loaded.kind === 'unauthenticated') {
      this.showLoginRequired();
      return;
    }
    if (loaded.kind === 'failed') {
      this.showUnavailable(loaded.message, () => void this.loadStory(token));
      return;
    }
    this.registry.set(REGISTRY_KEYS.story, journal);
    this.enterWorld();
  }

  /** Dev vào map không có phiên LingoBrain: truyện chạy cục bộ theo đúng luật server. */
  private enterDevWorld(): void {
    const journal = new StoryJournal(new DevStoryBackend());
    void journal.load().then(() => {
      this.registry.set(REGISTRY_KEYS.story, journal);
      this.enterWorld();
    });
  }

  /** UI chạy song song, không restart khi đổi level, nên joystick giữ được ngón tay đang kéo. */
  private enterWorld(): void {
    this.scene.start(SCENE_KEYS.world);
    this.scene.launch(SCENE_KEYS.ui);
  }

  private resetScreen(): { centerX: number; centerY: number } {
    this.children.removeAll(true);
    const { width, height } = this.scale.gameSize;
    return { centerX: width / 2, centerY: height / 2 };
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    this.add
      .text(x, y, label, BUTTON_STYLE)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);
  }

  private showStatus(message: string): void {
    const { centerX, centerY } = this.resetScreen();
    this.add.text(centerX, centerY - 30, 'HeroX', TITLE_STYLE).setOrigin(0.5);
    this.add.text(centerX, centerY + 20, message, BODY_STYLE).setOrigin(0.5);
  }

  private showLoginRequired(): void {
    const { centerX, centerY } = this.resetScreen();
    this.add.text(centerX, centerY - 70, 'HeroX', TITLE_STYLE).setOrigin(0.5);
    this.add
      .text(centerX, centerY - 20, 'Đăng nhập LingoBrain để vào game. Tiến độ học từ của bạn quyết định sức mạnh hiệp sĩ.', BODY_STYLE)
      .setOrigin(0.5);
    this.addButton(centerX, centerY + 35, 'Đăng nhập LingoBrain', () => window.location.assign(ENG_HOME_PATH));
    // Dev chạy Vite riêng cổng nên không có phiên LingoBrain; nút này bị loại khỏi bản build.
    if (import.meta.env.DEV) {
      this.addButton(centerX, centerY + 85, 'Vào map thử (dev)', () => this.enterDevWorld());
    }
  }

  private showUnavailable(message: string, retry: () => void): void {
    const { centerX, centerY } = this.resetScreen();
    this.add.text(centerX, centerY - 50, 'HeroX', TITLE_STYLE).setOrigin(0.5);
    this.add.text(centerX, centerY, message, BODY_STYLE).setOrigin(0.5);
    this.addButton(centerX, centerY + 50, 'Thử lại', retry);
  }
}
