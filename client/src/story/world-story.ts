import {
  beatForItem,
  encounterGateState,
  findBeat,
  levelGateState,
  pendingAutoDialog,
  selectDialog,
  type ActiveDialog,
  type WordCounts,
} from '@herox/shared';
import { DialogRunner, type WordChallenge } from './dialog-runner';
import type { QuestTracker } from './quest-tracker';
import type { JournalResult, StoryJournal } from './story-journal';

/** Việc bản đồ làm hộ khi truyện cần: dừng/chạy tiếp bản đồ, mở trận, đổi hình rương. */
export interface StoryHost {
  readonly heroName: string;
  wordCounts(): WordCounts;
  /** Dừng bản đồ, ẩn joystick để hộp thoại phủ lên. */
  pauseWorld(): void;
  resumeWorld(): void;
  /** Mở màn trận khi bản đồ đang dừng (trận do hội thoại gọi). */
  startBattle(encounterId: string): void;
  markChestOpened(itemId: string): void;
}

const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết, hãy đăng nhập lại LingoBrain';
const COLLECTED_MESSAGE = 'Nhặt được mảnh Thánh Ngôn';
const EMPTY_CHEST_MESSAGE = 'Rương đã trống';
const LOCKED_CHEST_MESSAGE = 'Rương bị phong ấn, chưa mở được';

function failureMessage(result: JournalResult): string | null {
  if (result.kind === 'ok') return null;
  return result.kind === 'unauthenticated' ? SESSION_EXPIRED_MESSAGE : result.message;
}

/**
 * Điều phối truyện trên bản đồ: hội thoại NPC, rương thánh tích, khoá trận và cổng theo mốc.
 * Mọi mốc ghi qua `StoryJournal` (server kiểm), bản đồ chỉ hỏi "được không" và làm theo.
 */
export class WorldStory {
  private dialog: DialogRunner | null = null;
  /** Hội thoại tự mở đã hiện mà chưa ghi được mốc: không mở lại liên tục tới khi tiến độ đổi. */
  private autoDialogShown: string | null = null;

  constructor(
    private readonly journal: StoryJournal,
    private readonly quests: QuestTracker,
    private readonly host: StoryHost,
  ) {}

  get isDialogOpen(): boolean {
    return this.dialog !== null;
  }

  /** Vẽ lại bảng nhiệm vụ và mở hội thoại tự động (mở đầu, kết chương) nếu tới lúc. */
  refresh(): void {
    this.quests.render(this.journal.progress);
    this.quests.setVisible(true);
    const auto = pendingAutoDialog(this.journal.progress);
    const key = auto === null ? null : `${auto.chapter}:${auto.script.id}:${auto.variant.completesBeat ?? ''}`;
    if (auto === null || key === this.autoDialogShown) return;
    this.autoDialogShown = key;
    void this.openDialog(auto);
  }

  /** Trận trên map: `false` khi trận truyện đã xong (không đánh lại) hoặc chưa tới lúc (báo lý do). */
  canStartBattle(encounterId: string): boolean {
    const gate = encounterGateState(encounterId, this.journal.progress);
    if (gate === 'finished') return false;
    if (!gate.open) this.quests.toast(gate.message);
    return gate.open;
  }

  canUsePortal(targetLevel: string): boolean {
    const gate = levelGateState(targetLevel, this.journal.progress, this.host.wordCounts());
    if (!gate.open) this.quests.toast(gate.message);
    return gate.open;
  }

  isChestOpened(itemId: string): boolean {
    const found = beatForItem(itemId);
    return found !== null && this.journal.progress.has(found.chapter, found.beat.id);
  }

  async openChest(itemId: string): Promise<void> {
    const found = beatForItem(itemId);
    if (found === null) return;
    const { chapter, beat } = found;
    if (this.journal.progress.has(chapter, beat.id)) {
      this.quests.toast(EMPTY_CHEST_MESSAGE);
      return;
    }
    if (!this.journal.progress.hasAll(chapter, beat.requires)) {
      this.quests.toast(LOCKED_CHEST_MESSAGE);
      return;
    }
    const result = await this.journal.complete(chapter, beat.id);
    const error = failureMessage(result);
    if (error !== null) {
      this.quests.toast(error);
      return;
    }
    this.host.markChestOpened(itemId);
    this.quests.toast(COLLECTED_MESSAGE);
    this.refresh();
  }

  /** Nói chuyện với NPC `dialogId`; NPC không có thoại hợp trạng thái thì im lặng. */
  talkTo(dialogId: string): void {
    const active = selectDialog(dialogId, this.journal.progress);
    if (active !== null) void this.openDialog(active);
  }

  /** Scene bị tắt (đổi level, tải lại nóng): gỡ hộp thoại DOM theo. */
  dispose(): void {
    this.dialog?.close();
    this.dialog = null;
  }

  private async openDialog(active: ActiveDialog): Promise<void> {
    if (this.dialog !== null) return;
    this.host.pauseWorld();
    this.quests.setVisible(false);
    const challenge = this.wordChallengeFor(active);
    const runner = new DialogRunner(document.body, { lines: active.variant.lines, heroName: this.host.heroName, ...(challenge ? { challenge } : {}) });
    this.dialog = runner;
    const outcome = await runner.run();
    if (this.dialog !== runner) return;
    this.dialog = null;
    if (outcome === 'finished') await this.completeDialogBeat(active, challenge !== undefined);
    const encounterId = active.variant.startsEncounter;
    // Trận do hội thoại gọi cũng phải qua cổng khoá như vùng trận trên map.
    if (outcome === 'finished' && encounterId !== undefined && this.canStartBattle(encounterId)) {
      this.host.startBattle(encounterId);
      return;
    }
    this.host.resumeWorld();
    this.refresh();
  }

  /** Mốc loại `dialog` ghi khi nghe xong; mốc loại `word` đã ghi trong thử thách chữ. */
  private async completeDialogBeat(active: ActiveDialog, viaChallenge: boolean): Promise<void> {
    const beatId = active.variant.completesBeat;
    if (beatId === undefined || viaChallenge) return;
    const error = failureMessage(await this.journal.complete(active.chapter, beatId));
    if (error !== null) this.quests.toast(error);
  }

  private wordChallengeFor(active: ActiveDialog): WordChallenge | undefined {
    const beatId = active.variant.completesBeat;
    const beat = beatId === undefined ? undefined : findBeat(active.chapter, beatId);
    if (beat?.completion.kind !== 'word') return undefined;
    const { word, meaning, emoji } = beat.completion;
    return {
      word,
      meaning,
      emoji,
      submit: async (answer) => failureMessage(await this.journal.complete(active.chapter, beat.id, answer)),
    };
  }
}
