// Nhập hình TẠM cho chương 1 khi chưa có PixelLab: hero LPC, quái/NPC/tile DCSS (CC0), rương vẽ bằng script.
// Chạy: node tools/lib/import-placeholder-art.mjs --dcss "<crawl-tiles Oct-5-2010>" --lpc <checkout LPC> --prototype <prototypes/style-preview/public/assets>
// Ghi vào assets/sprites/**, assets/tiles/dcss/*, cập nhật assets/credits.json; sau đó chạy `node tools/build-credits.mjs`.
// Sprite và tile được chỉnh tông ngay (palette-harmonize); riêng sheet hero LPC giữ nguyên, lý do ghi trong credits.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { crop, composite, fitBottomCenter, mapPixels, hexToRgb, luminance, mixRgb } from './image-ops.mjs';
import { readPng, writePng } from './png.mjs';
import { harmonizeImage, PALETTE } from './palette.mjs';
import { ASSETS_DIR, isGplLicense, readLpcCsv, REPO_ROOT, SOURCES, upsertCredits } from './credits-store.mjs';
import { drawChest } from './prop-painters.mjs';

const HERO_RECIPES = join(REPO_ROOT, 'tools', 'lpc', 'hero-recipes.json');
const HARMONIZED_NOTE = 'palette-harmonize';
/** Khung theo docs/art-direction.md: quái thường/NPC 64, tinh anh 64–96, trùm 128. */
const FRAME = { normal: 64, elite: 96, boss: 128, prop: 32 };
/** Tile DCSS 32px; phóng nguyên lần để thân cao gần hero LPC (~48–56px trong khung 64). */
const DCSS_SCALE = { normal: 2, elite: 3, boss: 4, prop: 1 };
const LPC_CELL = 64;
const LPC_ROW_RIGHT = 3; // hàng LPC: lên, trái, xuống, phải

const DCSS_SPRITES = [
  { out: 'sprites/monsters/imp.png', title: 'Tiểu quỷ (imp)', layers: ['dc-mon/demons/imp.png'], kind: 'normal' },
  { out: 'sprites/monsters/ghoul.png', title: 'Ghoul', layers: ['dc-mon/undead/ghoul.png'], kind: 'normal' },
  { out: 'sprites/monsters/elite-demon.png', title: 'Quỷ tinh anh (red devil)', layers: ['dc-mon/demons/red_devil.png'], kind: 'elite' },
  { out: 'sprites/monsters/scarecrow-demon.png', title: 'Trùm Quỷ Bù Nhìn (balrug)', layers: ['dc-mon/demons/balrug.png'], kind: 'boss' },
  { out: 'sprites/npc/keeper.png', title: 'Tu sĩ Giữ Thư (doll người + áo tu sĩ)', layers: ['player/base/human_m.png', 'player/body/monk_black.png'], kind: 'normal' },
  {
    out: 'sprites/npc/smith.png',
    title: 'Thợ rèn (doll người + giáp da + búa)',
    layers: ['player/base/human_m.png', 'player/legs/pants_brown.png', 'player/body/leather_heavy.png', 'player/hair/brown1.png', 'player/hand1/hammer.png'],
    kind: 'normal',
  },
  {
    out: 'sprites/npc/villager.png',
    title: 'Dân làng vỏ rỗng (doll người, nhuộm xám nhạt)',
    layers: ['player/base/human_m.png', 'player/legs/pants_short_gray.png', 'player/body/shirt_white1.png', 'player/hair/brown1.png'],
    kind: 'normal',
    hollow: true,
  },
  { out: 'sprites/props/chapel-door.png', title: 'Cửa nhà nguyện', layers: ['dc-dngn/dngn_closed_door.png'], kind: 'prop', copy: true },
  { out: 'sprites/props/altar.png', title: 'Bàn thờ', layers: ['dc-dngn/altars/dngn_altar.png'], kind: 'prop', copy: true },
];

/** Tile nguồn cho atlas chương 1 (tên file giữ nguyên tên gốc DCSS). */
const DCSS_TILES = [
  'dc-dngn/floor/cobble_blood1.png', 'dc-dngn/floor/cobble_blood2.png', 'dc-dngn/floor/rect_gray0.png',
  'dc-dngn/floor/rect_gray1.png', 'dc-dngn/floor/grey_dirt0.png', 'dc-dngn/floor/grey_dirt3.png',
  'dc-dngn/floor/grass/grass0.png', 'dc-dngn/floor/grass/grass1.png', 'dc-dngn/floor/marble_floor1.png',
  'dc-dngn/floor/marble_floor2.png', 'dc-dngn/floor/tomb0.png', 'dc-dngn/floor/volcanic_floor0.png',
  'dc-dngn/floor/volcanic_floor1.png', 'dc-dngn/floor/lava0.png', 'dc-dngn/floor/lava1.png',
  'dc-dngn/wall/brick_dark0.png', 'dc-dngn/wall/brick_dark3.png', 'dc-dngn/wall/brick_brown0.png',
  'dc-dngn/wall/stone2_dark0.png', 'dc-dngn/wall/volcanic_wall0.png', 'dc-dngn/wall/tree1_red.png',
  'dc-dngn/wall/tree2_red.png', 'dc-dngn/crumbled_column.png', 'dc-dngn/dngn_granite_statue.png',
  'dc-dngn/gate_closed_middle.png', 'dc-dngn/dngn_closed_door.png', 'dc-dngn/altars/dngn_altar.png',
  'dc-dngn/dngn_blood_fountain.png',
];

const HERO_LPC_NOTE = 'giữ nguyên sheet ghép từ prototype (ô 192); không chỉnh tông bảng màu vì làm bệt chi tiết giáp bạc '
  + 'và lệch màu áo choàng Máu thánh đã nhuộm sẵn';

function readOptions() {
  const { values } = parseArgs({ options: { dcss: { type: 'string' }, lpc: { type: 'string' }, prototype: { type: 'string' } } });
  if (!values.dcss || !values.lpc || !values.prototype) {
    throw new Error('Cần --dcss <thư mục crawl-tiles Oct-5-2010> --lpc <checkout LPC> --prototype <style-preview/public/assets>');
  }
  return values;
}

function writeAsset(relPath, image) {
  const target = join(ASSETS_DIR, relPath);
  mkdirSync(dirname(target), { recursive: true });
  writePng(target, image);
}

function dcssCredit(path, title, sources, modified) {
  return { ...SOURCES.dcss, path, title: `${title} (${sources.join(' + ')})`, modified };
}

/** Dân làng mất tiếng: xám nhạt gần màu Xương, như bị rút hết sắc. */
function hollowTint(image) {
  const bone = hexToRgb(PALETTE.bone);
  return mapPixels(image, ([red, green, blue, alpha]) => {
    // Giữ tương phản sáng tối để còn đọc ra quần áo, chỉ rút sắc.
    const gray = Math.round(24 + luminance([red, green, blue]) * 215);
    return [...mixRgb([gray, gray, gray], bone, 0.15), alpha];
  });
}

function importDcssSprites(dcssDir) {
  return DCSS_SPRITES.map((spec) => {
    let image = composite(spec.layers.map((layer) => readPng(join(dcssDir, layer))));
    if (spec.hollow) image = hollowTint(image);
    const scale = DCSS_SCALE[spec.kind];
    if (!spec.copy) image = fitBottomCenter(image, FRAME[spec.kind], scale);
    writeAsset(spec.out, harmonizeImage(image));
    const steps = [spec.layers.length > 1 ? 'ghép doll' : null, spec.hollow ? 'nhuộm xám' : null,
      spec.copy ? null : `cắt sát, phóng x${scale}, đặt khung ${FRAME[spec.kind]} chân chạm đáy`, HARMONIZED_NOTE];
    return dcssCredit(spec.out, spec.title, spec.layers, steps.filter(Boolean).join('; '));
  });
}

function importDcssTiles(dcssDir) {
  return DCSS_TILES.map((source) => {
    const path = `tiles/dcss/${basename(source)}`;
    writeAsset(path, harmonizeImage(readPng(join(dcssDir, source))));
    return dcssCredit(path, `Tile ${basename(source, '.png')}`, [source], HARMONIZED_NOTE);
  });
}

function drawProps() {
  return [false, true].map((open) => {
    const path = `sprites/props/${open ? 'chest-open' : 'chest-closed'}.png`;
    writeAsset(path, harmonizeImage(drawChest(open)));
    return { ...SOURCES.herox, path, title: open ? 'Rương mở' : 'Rương đóng', modified: `tools/lib/prop-painters.mjs; ${HARMONIZED_NOTE}` };
  });
}

/** Lấy dòng CSV của các layer dùng tới; layer chỉ có license GPL thì dừng ngay. */
function lpcRowsFor(csv, filenames) {
  return filenames.map((filename) => {
    const row = csv.rows.get(filename);
    if (!row) throw new Error(`CREDITS.csv của LPC không có dòng "${filename}"`);
    if (!row.licenses.some((license) => !isGplLicense(license))) throw new Error(`${filename} chỉ có license GPL`);
    return { filename, ...row };
  });
}

function lpcCredit(recipes, { path, title, rows, modified }) {
  const unique = (values) => [...new Set(values)];
  return {
    ...SOURCES.lpc,
    // Ghim commit LPC đã dùng để tra lại đúng phiên bản layer.
    url: `${recipes.source.repo}/tree/${recipes.source.commit}`,
    path,
    title,
    authors: unique(rows.flatMap((row) => row.authors)).join(', '),
    // Chỉ liệt kê nhánh license không phải GPL: asset dùng theo các license này (xem hero/lpc-credits.csv).
    license: unique(rows.flatMap((row) => row.licenses.filter((license) => !isGplLicense(license)))).join(' / '),
    modified,
  };
}

function importLpc(lpcDir, prototypeDir) {
  const recipes = JSON.parse(readFileSync(HERO_RECIPES, 'utf8'));
  const csv = readLpcCsv(join(lpcDir, 'CREDITS.csv'));
  const credits = [];
  const usedRows = new Map();
  for (const [anim, info] of Object.entries(recipes.animations)) {
    const rows = lpcRowsFor(csv, recipes.layers.map((layer) => layer.credits[anim]).filter(Boolean));
    rows.forEach((row) => usedRows.set(row.filename, row));
    mkdirSync(join(ASSETS_DIR, 'sprites', 'hero'), { recursive: true });
    copyFileSync(join(prototypeDir, 'sprites', `hero_${anim}.png`), join(ASSETS_DIR, info.file));
    credits.push(lpcCredit(recipes, {
      path: info.file,
      title: `Hero Hiệp sĩ Thánh Ngôn tạm: ${anim} (${info.cols}x${info.rows} ô ${recipes.heroCell})`,
      rows,
      modified: `ghép layer theo tools/lpc/hero-recipes.json, nhuộm áo choàng; ${HERO_LPC_NOTE}`,
    }));
  }
  for (const [path, filenames] of Object.entries(recipes.extraCredits)) {
    const rows = lpcRowsFor(csv, filenames);
    rows.forEach((row) => usedRows.set(row.filename, row));
    // LPC bản mới tách thân và đầu thành layer riêng; ghép theo thứ tự trong recipe rồi cắt khung đứng.
    const sheet = composite(filenames.map((filename) => readPng(join(lpcDir, 'spritesheets', filename))));
    const standing = crop(sheet, { x: 0, y: LPC_ROW_RIGHT * LPC_CELL, width: LPC_CELL, height: LPC_CELL });
    writeAsset(path, harmonizeImage(fitBottomCenter(standing, FRAME.normal)));
    credits.push(lpcCredit(recipes, {
      path,
      title: 'Xương khô (thân + đầu, khung đứng hướng phải của walk)',
      rows,
      modified: `ghép thân + đầu, cắt sát, khung 64 chân chạm đáy; ${HARMONIZED_NOTE}`,
    }));
  }
  const csvLines = [csv.header, ...[...usedRows.values()].map((row) => row.line)];
  writeFileSync(join(ASSETS_DIR, 'sprites', 'hero', 'lpc-credits.csv'), `${csvLines.join('\n')}\n`);
  return credits;
}

const options = readOptions();
upsertCredits([
  ...importLpc(options.lpc, options.prototype),
  ...importDcssSprites(options.dcss),
  ...importDcssTiles(options.dcss),
  ...drawProps(),
]);
process.stdout.write('Đã nhập hình tạm và cập nhật assets/credits.json. Chạy tiếp: node tools/build-credits.mjs\n');
