import Phaser from 'phaser';
import type { BuildingId } from '@herox/shared';
import { currentUtcOffsetMinutes, readEngSessionToken } from '../api/me-api';
import { ApiCitadelGateway, DevCitadelGateway, type CitadelGateway } from '../citadel/citadel-gateway';
import { devCitadelSeed } from '../citadel/dev-citadel-fixture';
import type { StoryJournal } from '../story/story-journal';
import { CitadelPanel } from '../ui/panels/citadel-panel';
import { REGISTRY_KEYS, SCENE_KEYS } from './scene-keys';

export interface CitadelSceneData {
  readonly buildingId: BuildingId;
}

const SIGNED_OUT_GATEWAY: CitadelGateway = {
  load: () => Promise.resolve({ kind: 'unauthenticated' }),
  send: () => Promise.resolve({ kind: 'unauthenticated' }),
};

/**
 * Lớp phủ khi bước vào cửa một công trình ở Lexhold: bản đồ dừng, panel DOM mở trên canvas;
 * đóng panel (nút Đóng hoặc Escape) thì bản đồ chạy tiếp tại chỗ.
 */
export class CitadelScene extends Phaser.Scene {
  private panel: CitadelPanel | null = null;

  constructor() {
    super(SCENE_KEYS.citadel);
  }

  create(data: CitadelSceneData): void {
    const panel = new CitadelPanel(document.body, data.buildingId, this.createGateway(), () => this.leave(), (view) => {
      this.registry.set(REGISTRY_KEYS.citadelStage, view.stage);
    });
    this.panel = panel;
    // Scene bị tắt từ ngoài (tải lại nóng khi dev): gỡ panel DOM theo.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel?.close());
    void panel.open();
  }

  private createGateway(): CitadelGateway {
    // Dev vào map bằng nút thử (không có phiên LingoBrain): thành trì chạy cục bộ, giữ trạng thái tới khi tải lại trang.
    if (import.meta.env.DEV && this.registry.get(REGISTRY_KEYS.me) === undefined) {
      const existing = this.registry.get(REGISTRY_KEYS.devCitadel) as DevCitadelGateway | undefined;
      if (existing !== undefined) return existing;
      const journal = this.registry.get(REGISTRY_KEYS.story) as StoryJournal | undefined;
      const gateway = new DevCitadelGateway(devCitadelSeed(), Date.now, journal === undefined ? undefined : () => journal.beats);
      this.registry.set(REGISTRY_KEYS.devCitadel, gateway);
      return gateway;
    }
    const token = readEngSessionToken(() => window.localStorage);
    if (token === null) return SIGNED_OUT_GATEWAY;
    return new ApiCitadelGateway({ token, fetchImpl: window.fetch.bind(window), utcOffsetMinutes: () => currentUtcOffsetMinutes() });
  }

  private leave(): void {
    this.panel = null;
    this.scene.stop();
    this.scene.resume(SCENE_KEYS.world);
    this.scene.wake(SCENE_KEYS.ui);
  }
}
