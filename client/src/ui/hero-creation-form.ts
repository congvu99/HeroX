import { HERO_NAME_MAX_LENGTH, normalizeHeroName, type CreateHeroRequest, type HeroGender } from '@herox/shared';
import { createButton, createElement } from './panels/panel-dom';
import '../story/story.css';

const GENDER_LABELS: Readonly<Record<HeroGender, string>> = { male: 'Nam', female: 'Nữ' };
const NAME_INVALID_MESSAGE = `Tên dài 1–${HERO_NAME_MAX_LENGTH} ký tự, không chứa ký tự ẩn`;

/**
 * Màn tạo nhân vật lần đầu: tên và giới tính. Giáp khởi đầu là bộ đồ mặc định (đổi sau ở Thợ May).
 * `submit` trả `null` khi tạo được, hoặc câu báo lỗi để hiện ngay dưới form.
 */
export class HeroCreationForm {
  private readonly overlay: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly status: HTMLElement;
  private gender: HeroGender = 'male';

  constructor(
    parent: HTMLElement,
    private readonly submit: (request: CreateHeroRequest) => Promise<string | null>,
  ) {
    this.nameInput = createElement('input', { className: 'story-input' });
    this.nameInput.maxLength = HERO_NAME_MAX_LENGTH;
    this.nameInput.autocomplete = 'off';
    this.nameInput.setAttribute('aria-label', 'Tên hiệp sĩ');
    this.nameInput.placeholder = 'Tên hiệp sĩ';
    this.status = createElement('div', { className: 'story-status' });
    const form = createElement('form', { className: 'hero-creation-form' }, [
      createElement('h2', { className: 'hero-creation-title', text: 'Hiệp sĩ Thánh Ngôn' }),
      createElement('p', { className: 'hero-creation-note', text: 'Lexhold đã sụp. Hãy cho biết tên người sẽ khắc lại chữ thánh.' }),
      this.nameInput,
      this.createGenderPicker(),
      createElement('p', { className: 'hero-creation-note', text: 'Giáp khởi đầu: áo vải hành hương. Đổi trang phục sau ở Thợ May.' }),
      this.status,
      createButton('Lên đường', () => void this.send(), 'story-button'),
    ]);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.send();
    });
    this.overlay = createElement('div', { className: 'hero-creation' }, [form]);
    parent.appendChild(this.overlay);
    this.nameInput.focus({ preventScroll: true });
  }

  close(): void {
    this.overlay.remove();
  }

  private createGenderPicker(): HTMLElement {
    const options = (Object.keys(GENDER_LABELS) as HeroGender[]).map((gender) => {
      const radio = createElement('input');
      radio.type = 'radio';
      radio.name = 'hero-gender';
      radio.value = gender;
      radio.checked = gender === this.gender;
      radio.addEventListener('change', () => {
        this.gender = gender;
      });
      return createElement('label', {}, [radio, document.createTextNode(GENDER_LABELS[gender])]);
    });
    return createElement('div', { className: 'hero-creation-genders' }, options);
  }

  private async send(): Promise<void> {
    if (this.overlay.classList.contains('is-busy')) return;
    const name = normalizeHeroName(this.nameInput.value);
    if (name === null) {
      this.status.textContent = NAME_INVALID_MESSAGE;
      return;
    }
    this.overlay.classList.add('is-busy');
    this.status.textContent = '';
    const error = await this.submit({ name, gender: this.gender });
    this.overlay.classList.remove('is-busy');
    if (error !== null) this.status.textContent = error;
  }
}
