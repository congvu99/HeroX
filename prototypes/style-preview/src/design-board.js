import { ASSET_BASE, DIRECTIONS } from './asset-catalog.js';
import { POS_SKILLS, SAMPLE_WORDS } from './sample-words.js';

const PALETTE = [
  ['Mực đêm', '#0b0a10'], ['Tro', '#1b1720'], ['Xương', '#d9d2c0'], ['Máu thánh', '#7a141c'],
  ['Than hồng', '#e0602a'], ['Vàng nến', '#e8c66a'], ['Thánh quang', '#fff1c2'], ['Vực câm', '#5a2a6a'],
];
const BESTIARY = [
  ['imp', 'Tiểu quỷ', 'Lính lác của Vực Câm Lặng, đi theo bầy'],
  ['shadow_imp', 'Quỷ bóng', 'Ẩn trong bóng tối, chỉ lộ ra dưới ánh đuốc'],
  ['red_devil', 'Quỷ đỏ (tinh anh)', 'Máu trâu, đánh mạnh, nhiều từ'],
  ['hellion', 'Hoả quỷ', 'Chương 4 · Vực Lửa'],
  ['fiend', 'Ác ma', 'Chương 3 · Hầm Mộ Thánh'],
  ['balrug', 'Quỷ Bù Nhìn (trùm chương 1)', 'Tạm dùng hình balrug'],
];
const ALLIES = [
  ['monk', 'Tu sĩ Giữ Thư', 'Dẫn truyện, dạy luật "gọi tên từ"'],
  ['cherub', 'Tiểu thiên thần', 'Canh bàn thờ, hồi máu ở điểm lưu'],
  ['ophan', 'Ophan', 'Thiên thần bánh xe, mở cổng Thiên Cung'],
];
const SKILL_FX = { verb: 'slash', noun: 'shield', adj: 'blessing', adv: 'blink_in' };

/** Một vòng requestAnimationFrame vẽ mọi canvas hoạt ảnh trên bảng thiết kế; dừng khi tab bị ẩn. */
class SheetAnimator {
  constructor() {
    this.items = [];
    const tick = (time) => {
      for (const item of this.items) item.draw(time);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  add(canvas, image, { frameWidth, frameHeight, cols, start = 0, count, fps, crop = null }) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.items.push({
      draw: (time) => {
        if (!canvas.isConnected || canvas.offsetParent === null || !image.complete) return;
        const frame = start + (Math.floor((time / 1000) * fps) % count);
        const sx = (frame % cols) * frameWidth;
        const sy = Math.floor(frame / cols) * frameHeight;
        const [cx, cy, cw, ch] = crop ?? [0, 0, frameWidth, frameHeight];
        const scale = Math.min(canvas.width / cw, canvas.height / ch);
        const dw = cw * scale;
        const dh = ch * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, sx + cx, sy + cy, cw, ch, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      },
    });
  }
}

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function heroCard(animator, manifest, anim, facing, title) {
  const cell = manifest.heroCell;
  const meta = manifest.hero[anim];
  const row = meta.rows === 1 ? 0 : DIRECTIONS.indexOf(facing);
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<canvas width="192" height="192"></canvas><h3>${title}</h3>`;
  // Kiếm và vệt chém vẽ trong ô 192; khung đứng/đi chỉ cần phần giữa ô.
  const crop = anim === 'slash' ? [0, 0, cell, cell] : [cell / 4, cell / 4, cell / 2, cell / 2];
  animator.add(card.querySelector('canvas'), loadImage(`${ASSET_BASE}sprites/hero_${anim}.png`), {
    frameWidth: cell, frameHeight: cell, cols: meta.cols, start: row * meta.cols, count: meta.cols, fps: 8, crop,
  });
  return card;
}

function fxCanvas(animator, manifest, key, size = 96) {
  const fx = manifest.fx[key];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const image = loadImage(`${ASSET_BASE}fx/${key}.png`);
  image.onload = () => animator.add(canvas, image, {
    frameWidth: fx.frameWidth, frameHeight: fx.frameHeight, cols: image.width / fx.frameWidth, count: fx.frames, fps: fx.fps,
  });
  return canvas;
}

function creatureCards(list) {
  return list.map(([key, name, note]) => `
    <div class="card"><img src="${ASSET_BASE}monsters/${key}.png" alt="" style="width:96px;height:96px;image-rendering:pixelated">
    <h3>${name}</h3><p>${note}</p></div>`).join('');
}

export function renderDesignBoard(root, manifest, showTab) {
  const animator = new SheetAnimator();
  const exampleWord = (pos) => SAMPLE_WORDS.find((entry) => entry.pos === pos);
  root.innerHTML = `
  <div class="design-inner">
    <span class="tag">Bản định hình phong cách · dữ liệu mẫu</span>
    <h1>HeroX · Thánh Ngôn chống Vực Câm Lặng</h1>
    <p class="lede">Nhập vai dark fantasy góc nhìn top-down 3/4. Hiệp sĩ thập tự dùng <b>từ tiếng Anh đã học</b> làm vũ khí:
    gọi đúng tên từ thì quỷ tan thành tro, gọi sai thì quỷ cắn trả.</p>
    <div class="cta-row"><button class="btn" data-go="explore">▶ Màn 1 · Khám phá</button><button class="btn ghost" data-go="battle">▶ Màn 2 · Trận chiến</button></div>

    <h2>Đích hình ảnh</h2>
    <p>Ảnh bạn gửi là chuẩn phong cách: tu viện đổ nát dưới mưa, nến và lửa vàng, vòng huyết đỏ, thập tự quân áo trắng khiên đỏ.
    Hình trong hai màn hiện là <b>bản tạm</b> ghép từ LPC và DCSS. Nhân vật và quái bản chính sẽ vẽ bằng PixelLab theo ảnh này.</p>
    <img src="${ASSET_BASE}reference/style-target.png" alt="Ảnh mẫu phong cách" style="width:100%;border:1px solid #4a3236">

    <h2>Bối cảnh</h2>
    <p>Vực Câm Lặng mở ra dưới thánh địa. Quỷ từ đó <b>nuốt mất lời nói</b>: nơi chúng đi qua, người dân quên cả tên đồ vật.
    Hội Thánh Ngôn giữ lửa ở tiền đồn <b>Lexhold</b>, mỗi hiệp sĩ mang theo những từ đã học như thánh tích.</p>
    <div class="flow">
      <div class="step"><b>Ch.1 Làng Sương Sớm</b>Trùm: Quỷ Bù Nhìn</div>
      <div class="step"><b>Ch.2 Rừng Tro</b></div>
      <div class="step"><b>Ch.3 Hầm Mộ Thánh</b></div>
      <div class="step"><b>Ch.4 Vực Lửa</b></div>
      <div class="step"><b>Ch.5 Thiên Cung Vỡ</b>Trùm cuối: Thiên Thần Sa Ngã Câm Lặng</div>
    </div>
    <div class="swatches">${PALETTE.map(([name, hex]) => `<div class="swatch"><i style="background:${hex}"></i>${name}<br><small>${hex}</small></div>`).join('')}</div>

    <h2>Nhân vật chính: Hiệp sĩ Thánh Ngôn</h2>
    <p>Giáp tấm bạc, mũ bascinet có mặt nạ nhọn, giáp vai, khiên thập tự lớn, áo choàng đỏ, kiếm dài (kiểu Crusader của Sorthen).
    Ngoại trang ở Lexhold đổi màu áo choàng, hoạ tiết khiên, mũ.</p>
    <div class="grid" data-hero></div>

    <h2>Đồng minh</h2>
    <div class="grid">${creatureCards(ALLIES)}</div>

    <h2>Bầy quỷ</h2>
    <div class="grid" data-bestiary>${creatureCards(BESTIARY)}</div>

    <h2>Luật chiến đấu</h2>
    <p>Trên đầu mỗi quỷ hiện <b>nghĩa tiếng Việt, emoji và từ loại</b>. Người chơi gọi từ tiếng Anh bằng cách gõ (PC) hoặc chọn trên vòng 6 từ (iPhone).
    Từ loại quyết định chiêu. Đúng 3 từ liên tiếp trong 4 giây thì ra <b>Thánh Phạt</b> đánh cả bầy.</p>
    <table class="rules"><thead><tr><th>Từ loại</th><th>Chiêu</th><th>Hiệu ứng</th><th>Ví dụ</th><th>Hình</th></tr></thead><tbody data-rules></tbody></table>

    <h2>Vòng chơi</h2>
    <div class="flow">
      <div class="step"><b>Lexhold</b>Nâng trang bị, skill, ngoại trang theo số từ đã học</div>
      <div class="step"><b>Khám phá</b>Đi, lướt, nói chuyện, tìm quỷ</div>
      <div class="step"><b>Trận</b>Gọi tên từ, ghép chuỗi</div>
      <div class="step"><b>Kết quả</b>Vàng, pha lê, danh sách từ cần ôn</div>
    </div>

    <div class="feedback"><h2>Điều cần bạn phản hồi</h2><ul>
      <li>Hero kiểu Crusader này đã đủ "bá khí" chưa, hay chờ bản PixelLab?</li>
      <li>Tông tối, mưa, ánh lửa ở Màn 1 có đúng không khí bạn muốn?</li>
      <li>Hiện nghĩa tiếng Việt trên đầu quỷ (người chơi nhớ ra từ tiếng Anh) hay hiện từ tiếng Anh để gõ lại?</li>
      <li>Tốc độ thanh đe doạ (quỷ tự đánh sau 7–10 giây) nhanh hay chậm?</li>
    </ul></div>
    <p class="sample">Nguồn hình: LPC (OGA-BY/CC-BY-SA, chi tiết ở assets/lpc-credits.csv), DCSS tiles (CC0), pixelfx (MIT). Xem CREDITS.txt.</p>
  </div>`;

  const heroGrid = root.querySelector('[data-hero]');
  heroGrid.append(
    heroCard(animator, manifest, 'walk', 'down', 'Đi · hướng xuống'),
    heroCard(animator, manifest, 'walk', 'right', 'Đi · ngang'),
    heroCard(animator, manifest, 'slash', 'right', 'Chém'),
    heroCard(animator, manifest, 'spellcast', 'down', 'Niệm Thánh Ngôn'),
  );

  const skeletonCard = document.createElement('div');
  skeletonCard.className = 'card';
  skeletonCard.innerHTML = '<canvas width="96" height="96"></canvas><h3>Xương kỵ sĩ</h3><p>Tuần tra theo đường cố định</p>';
  const cell = manifest.heroCell;
  animator.add(skeletonCard.querySelector('canvas'), loadImage(`${ASSET_BASE}sprites/skeleton_walk.png`), {
    frameWidth: cell, frameHeight: cell, cols: manifest.skeleton.walk.cols, start: 3 * manifest.skeleton.walk.cols,
    count: manifest.skeleton.walk.cols, fps: 8, crop: [cell / 4, cell / 4, cell / 2, cell / 2],
  });
  root.querySelector('[data-bestiary]').prepend(skeletonCard);

  const rules = root.querySelector('[data-rules]');
  for (const [pos, skill] of Object.entries(POS_SKILLS)) {
    const example = exampleWord(pos);
    const row = document.createElement('tr');
    row.innerHTML = `<td><span class="pos-${pos}" style="padding:0 4px;color:#000">${skill.label}</span></td>
      <td>${skill.skill}</td><td>${skill.effect}</td><td>${example.emoji} ${example.vi} → <b>${example.word}</b></td><td></td>`;
    row.lastElementChild.append(fxCanvas(animator, manifest, SKILL_FX[pos], 72));
    rules.append(row);
  }
  for (const [label, effect, keys] of [
    ['Chuỗi 3', 'Thánh Phạt: cột sáng + giáng phạt cả bầy', ['smite', 'pillar']],
    ['Gọi sai', 'Quỷ cắn trả, hiện đáp án đúng, từ vào danh sách ôn', ['curse']],
    ['Quỷ chết', 'Tan thành tro / nổ bóng tối (tinh anh)', ['dissolve', 'dark_explosion']],
  ]) {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${label}</td><td colspan="3">${effect}</td><td></td>`;
    for (const key of keys) row.lastElementChild.append(fxCanvas(animator, manifest, key, 72));
    rules.append(row);
  }

  for (const button of root.querySelectorAll('[data-go]')) button.addEventListener('click', () => showTab(button.dataset.go));
}
