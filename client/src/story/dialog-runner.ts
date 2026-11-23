import type { DialogLine, SpeakerId } from '@herox/shared';
import { spriteAssetUrl } from '../render/sprite-asset-urls';
import { createButton, createElement } from '../ui/panels/panel-dom';
import { buildWordChoices, storyTaughtWords } from './word-choices';
import './story.css';

/** Chữ thánh người chơi phải gõ lại sau câu thoại cuối (mốc loại `word`). */
export interface WordChallenge {
  readonly word: string;
  readonly meaning: string;
  readonly emoji: string;
  /** Gửi chữ người chơi chọn/gõ; trả `null` khi server nhận, ngược lại là câu báo lỗi. */
  submit(answer: string): Promise<string | null>;
}

export interface DialogRunOptions {
  readonly lines: readonly DialogLine[];
  readonly heroName: string;
  readonly challenge?: WordChallenge;
}

/** `deferred`: người chơi đóng thử thách chữ để làm sau. */
export type DialogOutcome = 'finished' | 'deferred';

interface SpeakerInfo {
  readonly name: string;
  readonly portrait?: string;
}

const SPEAKERS: Readonly<Record<Exclude<SpeakerId, 'hero'>, SpeakerInfo>> = {
  narrator: { name: '' },
  keeper: { name: 'Tu sĩ Giữ Thư', portrait: 'sprites/npc/keeper.png' },
  villager: { name: 'Dân làng', portrait: 'sprites/npc/villager.png' },
  smith: { name: 'Thợ rèn', portrait: 'sprites/npc/smith.png' },
  scarecrow: { name: 'Quỷ Bù Nhìn', portrait: 'sprites/monsters/scarecrow-demon.png' },
  // Chương 2 (Rừng Tro)
  'forest-warden': { name: 'Người Giữ Rừng', portrait: 'sprites/npc/forest-warden.png' },
  'ash-stag': { name: 'Hươu Quỷ Tro', portrait: 'sprites/monsters/ash-stag.png' },
  // Chương 3 (Hầm Mộ Thánh)
  'crypt-warden': { name: 'Người Giữ Mộ', portrait: 'sprites/npc/crypt-warden.png' },
  'nameless-bishop': { name: 'Giám Mục Mất Tên', portrait: 'sprites/monsters/nameless-bishop.png' },
  // Chương 4 (Vực Lửa)
  'chained-soul': { name: 'Linh Hồn Bị Xích', portrait: 'sprites/npc/chained-soul.png' },
  'antonym-demon': { name: 'Chúa Quỷ Ngược Nghĩa', portrait: 'sprites/monsters/antonym-demon.png' },
  // Chương 5 (Thiên Cung Vỡ)
  'gate-seraph': { name: 'Seraph Giữ Cổng', portrait: 'sprites/npc/gate-seraph.png' },
  'fallen-angel': { name: 'Thiên Thần Sa Ngã', portrait: 'sprites/monsters/fallen-angel.png' },
};

const ADVANCE_KEYS = new Set(['Enter', ' ', 'ArrowRight']);

function speakerInfo(speaker: SpeakerId, heroName: string): SpeakerInfo {
  return speaker === 'hero' ? { name: heroName } : SPEAKERS[speaker];
}

/**
 * Hộp thoại DOM phủ trên canvas (chữ tiếng Việt sắc nét, đọc được trên điện thoại).
 * Bấm/chạm hoặc Enter để qua câu; "Bỏ qua" nhảy tới cuối (vẫn phải làm thử thách chữ nếu có).
 */
export class DialogRunner {
  private readonly overlay: HTMLElement;
  private readonly portrait: HTMLImageElement;
  private readonly speaker: HTMLElement;
  private readonly text: HTMLElement;
  private readonly teach: HTMLElement;
  private readonly footer: HTMLElement;
  private index = 0;
  private resolve: ((outcome: DialogOutcome) => void) | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly options: DialogRunOptions,
  ) {
    this.portrait = createElement('img', { className: 'story-portrait' });
    this.portrait.alt = '';
    this.speaker = createElement('div', { className: 'story-speaker' });
    this.text = createElement('p', { className: 'story-text' });
    this.teach = createElement('div', { className: 'story-teach' });
    this.footer = createElement('div', { className: 'story-footer' });
    const body = createElement('div', { className: 'story-body' }, [this.speaker, this.text, this.teach, this.footer]);
    const box = createElement('div', { className: 'story-box' }, [this.portrait, body]);
    this.overlay = createElement('div', { className: 'story-overlay' }, [box]);
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
  }

  /** Mở hộp thoại; xong hết câu (và thử thách chữ nếu có) thì gỡ khỏi DOM. */
  run(): Promise<DialogOutcome> {
    this.parent.appendChild(this.overlay);
    document.addEventListener('keydown', this.handleKey);
    this.showLine();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  /** Đóng ngay (scene bị tắt từ ngoài). */
  close(outcome: DialogOutcome = 'deferred'): void {
    document.removeEventListener('keydown', this.handleKey);
    this.overlay.remove();
    this.resolve?.(outcome);
    this.resolve = null;
  }

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    if (!ADVANCE_KEYS.has(event.key) || this.index >= this.options.lines.length) return;
    event.preventDefault();
    this.advance();
  };

  private advance(): void {
    this.index += 1;
    this.showLine();
  }

  private skip(): void {
    this.index = this.options.lines.length;
    this.showLine();
  }

  private showLine(): void {
    const line = this.options.lines[this.index];
    if (line === undefined) {
      this.finishLines();
      return;
    }
    const info = speakerInfo(line.speaker, this.options.heroName);
    const url = info.portrait === undefined ? undefined : spriteAssetUrl(info.portrait);
    this.portrait.hidden = url === undefined;
    if (url !== undefined) this.portrait.src = url;
    this.speaker.textContent = info.name;
    this.speaker.hidden = info.name === '';
    this.text.textContent = line.text;
    this.text.classList.toggle('is-narration', line.speaker === 'narrator');
    this.teach.textContent = line.teach === undefined ? '' : `${line.teach.word} · ${line.teach.meaning}`;
    this.teach.hidden = line.teach === undefined;
    const isLast = this.index === this.options.lines.length - 1;
    this.footer.replaceChildren(
      createButton('Bỏ qua', () => this.skip(), 'story-button is-quiet'),
      createButton(isLast ? 'Xong' : 'Tiếp ▸', () => this.advance(), 'story-button'),
    );
  }

  private finishLines(): void {
    const challenge = this.options.challenge;
    if (challenge === undefined) {
      this.close('finished');
      return;
    }
    this.showChallenge(challenge);
  }

  /** Thử thách chữ: gõ (bàn phím thật) hoặc chạm một trong vài lựa chọn (màn cảm ứng). */
  private showChallenge(challenge: WordChallenge): void {
    this.portrait.hidden = true;
    this.speaker.textContent = 'Chữ thánh bị xoá';
    this.speaker.hidden = false;
    this.text.textContent = `${challenge.emoji} Gõ lại chữ tiếng Anh nghĩa là "${challenge.meaning}".`;
    this.text.classList.remove('is-narration');
    this.teach.hidden = true;
    const status = createElement('div', { className: 'story-status' });
    const input = createElement('input', { className: 'story-input' });
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('aria-label', 'Chữ tiếng Anh');
    const send = (answer: string): void => void this.sendAnswer(challenge, answer, status);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') send(input.value);
    });
    const choices = buildWordChoices(challenge.word, storyTaughtWords()).map((word) =>
      createButton(word, () => send(word), 'story-button is-choice'),
    );
    this.footer.replaceChildren(
      createElement('div', { className: 'story-choices' }, choices),
      createElement('div', { className: 'story-answer' }, [input, createButton('Khắc chữ', () => send(input.value), 'story-button')]),
      status,
      createButton('Để sau', () => this.close('deferred'), 'story-button is-quiet'),
    );
    input.focus({ preventScroll: true });
  }

  private async sendAnswer(challenge: WordChallenge, answer: string, status: HTMLElement): Promise<void> {
    if (answer.trim() === '') return;
    this.overlay.classList.add('is-busy');
    status.textContent = '';
    const error = await challenge.submit(answer);
    this.overlay.classList.remove('is-busy');
    if (error === null) {
      this.close('finished');
      return;
    }
    status.textContent = error;
  }
}
