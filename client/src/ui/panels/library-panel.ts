import { findBeat, type CitadelResponse, type CitadelWord, type StoryBeatRecord } from '@herox/shared';
import { fetchPronunciation, PronunciationPlayer, TTS_FAILED_MESSAGE } from '../../audio/word-pronunciation';
import { filterWords } from '../../citadel/citadel-view';
import { bundledCredits, groupCredits } from '../asset-credits';
import { createButton, createElement, createSearchInput, type PanelBody, type PanelContext } from './panel-dom';

/** Danh sách dài trên điện thoại vẽ chậm; quá ngưỡng thì nhắc người chơi tìm. */
const MAX_VISIBLE_WORDS = 200;

/** Mốc truyện hiện theo mục tiêu đã làm; mốc không còn trong dữ liệu thì hiện id. */
function beatLabel(record: StoryBeatRecord): string {
  return `Chương ${record.chapter}: ${findBeat(record.chapter, record.beat)?.objective ?? record.beat}`;
}

/** Thư viện: nhật ký truyện, danh sách từ đã thu (có ô tìm), nghe phát âm qua LingoBrain và ghi công hình ảnh. */
export class LibraryPanel implements PanelBody {
  readonly element = createElement('div', { className: 'citadel-body' });
  private readonly search = createSearchInput('Tìm từ hoặc nghĩa', 'Tìm từ đã thu', () => this.drawWords());
  private readonly wordList = createElement('ul', { className: 'citadel-list' });
  private readonly story = createElement('div');
  private words: readonly CitadelWord[] = [];
  private readonly player = new PronunciationPlayer();
  /** Đang tải phát âm: bỏ qua lần bấm mới để không tốn lượt TTS của LingoBrain. */
  private speaking = false;

  constructor(private readonly context: PanelContext) {
    this.element.append(
      createElement('h3', { className: 'citadel-heading', text: 'Nhật ký hành trình' }),
      this.story,
      createElement('h3', { className: 'citadel-heading', text: 'Từ đã thu' }),
      this.search,
      this.wordList,
      createElement('h3', { className: 'citadel-heading', text: 'Ghi công hình ảnh' }),
      LibraryPanel.renderCredits(),
    );
  }

  /** Tác giả và giấy phép của hình trong game (LPC, DCSS, pixelfx…), gộp theo nguồn. */
  private static renderCredits(): HTMLElement {
    const groups = groupCredits(bundledCredits());
    if (groups.length === 0) return createElement('p', { className: 'citadel-muted', text: 'Chưa có dữ liệu ghi công.' });
    return createElement('ul', { className: 'citadel-list' }, groups.map((group) =>
      createElement('li', { className: 'citadel-row' }, [
        createElement('div', { className: 'citadel-info' }, [
          createElement('strong', { text: `${group.source} · ${group.license}` }),
          createElement('span', { className: 'citadel-muted', text: group.authors.join(', ') }),
          group.url === '' ? null : createElement('span', { className: 'citadel-description', text: group.url }),
        ]),
      ])));
  }

  render(view: CitadelResponse): void {
    this.words = view.words;
    this.story.replaceChildren(
      view.story.length === 0
        ? createElement('p', { className: 'citadel-muted', text: 'Trang nhật ký còn trống. Hành trình sẽ được ghi lại khi qua từng chặng truyện.' })
        : createElement('ol', { className: 'citadel-list' }, view.story.map((beat) =>
          createElement('li', { className: 'citadel-row', text: beatLabel(beat) }))),
    );
    this.drawWords();
  }

  dispose(): void {
    this.player.dispose();
  }

  private drawWords(): void {
    const matches = filterWords(this.words, this.search.value);
    const rows = matches.slice(0, MAX_VISIBLE_WORDS).map((word) => this.renderWord(word));
    const note = matches.length > MAX_VISIBLE_WORDS
      ? createElement('li', { className: 'citadel-muted', text: `Còn ${matches.length - MAX_VISIBLE_WORDS} từ nữa, gõ để tìm.` })
      : null;
    const empty = matches.length === 0 ? createElement('li', { className: 'citadel-muted', text: 'Không có từ nào khớp.' }) : null;
    this.wordList.replaceChildren(...rows, ...[note, empty].filter((item): item is HTMLLIElement => item !== null));
  }

  private renderWord(word: CitadelWord): HTMLElement {
    const detail = [word.ipa, word.meaning].filter((part) => part !== '').join(' · ');
    return createElement('li', { className: 'citadel-row' }, [
      createElement('div', { className: 'citadel-info' }, [
        createElement('strong', { text: `${word.emoji} ${word.word}${word.mastered ? ' ★' : ''}` }),
        createElement('span', { className: 'citadel-muted', text: detail }),
      ]),
      createButton('Nghe', () => {
        // Mở âm thanh ngay trong lần chạm, trước khi chờ mạng.
        this.player.unlock();
        void this.speak(word.word);
      }),
    ]);
  }

  private async speak(text: string): Promise<void> {
    if (this.speaking) return;
    this.speaking = true;
    try {
      const result = await fetchPronunciation(text, window.fetch.bind(window));
      if (result.kind === 'unavailable') this.context.notify(result.message, 'info');
      else if (!(await this.player.play(result.audio))) this.context.notify(TTS_FAILED_MESSAGE, 'info');
    } finally {
      this.speaking = false;
    }
  }
}
