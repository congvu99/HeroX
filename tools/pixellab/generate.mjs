// Sinh asset game bằng PixelLab theo job khai báo trong jobs.mjs, ghép vào đúng khung/sheet mà
// client mong đợi, rồi cập nhật assets/credits.json và tools/pixellab/art-recipes.json.
//
// Chạy:  node tools/pixellab/generate.mjs [--force] [--dry] [jobId ...]
//   --force  sinh lại cả asset đã có file PNG (mặc định bỏ qua để tiết kiệm generations và cho resume)
//   --dry    chỉ liệt kê job sẽ chạy, không gọi API
//   jobId    chỉ chạy các job có id khớp (mặc định: tất cả)
//
// Hết quota generations: dừng êm, giữ nguyên asset đã sinh, in phần còn thiếu để bổ sung sau.
// Không ghi khoá API ra file/log. Khoá đọc từ env PIXELLAB_API_KEY.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { encodePng, writePng, createImage, blit } from '../lib/png.mjs';
import { fitBottomCenter } from '../lib/image-ops.mjs';
import { REPO_ROOT, ASSETS_DIR, upsertCredits } from '../lib/credits-store.mjs';
import { generateImage, rotateImage, animateWithText, getBalance, PixelLabApiError } from './api-client.mjs';
import { ASSET_JOBS } from './jobs.mjs';

const RECIPES_PATH = join(REPO_ROOT, 'tools', 'pixellab', 'art-recipes.json');
const TODAY = new Date().toISOString().slice(0, 10);

// Lỗi hết quota/tiền: PixelLab trả 402 (payment) hoặc 429 (rate/quota). Gặp thì dừng êm.
const QUOTA_STATUSES = new Set([402, 429]);

/** Hướng client dùng (hàng sheet) → Direction của PixelLab. */
const FACING_TO_PL_DIRECTION = { up: 'north', left: 'west', down: 'south', right: 'east' };
const SHEET_ROW_ORDER = ['up', 'left', 'down', 'right'];

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const ids = argv.filter((arg) => !arg.startsWith('--'));
  return { force: flags.has('--force'), dry: flags.has('--dry'), ids };
}

function readRecipes() {
  if (!existsSync(RECIPES_PATH)) return { version: 1, assets: [] };
  return JSON.parse(readFileSync(RECIPES_PATH, 'utf8'));
}

/** Thêm/thay recipe theo path, sắp theo path để diff ổn định. */
function upsertRecipe(recipe) {
  const data = readRecipes();
  const byPath = new Map(data.assets.map((item) => [item.path, item]));
  byPath.set(recipe.path, recipe);
  const assets = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(RECIPES_PATH, `${JSON.stringify({ version: 1, assets }, null, 2)}\n`);
}

function assetFsPath(assetPath) {
  return join(ASSETS_DIR, assetPath);
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

/** Đặt một sprite PixelLab (kích thước bất kỳ) vào khung vuông, chân chạm đáy, canh giữa. */
function frameSprite(image, frameSize) {
  return fitBottomCenter(image, frameSize, 1);
}

/**
 * Ghép sheet nhân vật kiểu LPC: ô vuông cellSize, các hàng theo SHEET_ROW_ORDER (up/left/down/right),
 * mỗi hàng có `columns` cột. frames[facing] là mảng ảnh đã đặt khung cellSize.
 */
function assembleSheet(framesByFacing, cellSize, columns, singleRow) {
  const rows = singleRow ? 1 : SHEET_ROW_ORDER.length;
  const sheet = createImage(columns * cellSize, rows * cellSize);
  const order = singleRow ? ['down'] : SHEET_ROW_ORDER;
  order.forEach((facing, rowIndex) => {
    const frames = framesByFacing[facing] ?? [];
    for (let col = 0; col < columns; col++) {
      const frame = frames[Math.min(col, frames.length - 1)];
      if (frame) blit(sheet, frame, col * cellSize, rowIndex * cellSize);
    }
  });
  return sheet;
}

/** Sinh base + xoay ra 4 hướng cho hero. Trả { up,left,down,right } ảnh RGBA gốc (chưa đặt khung). */
async function generateHeroDirections(job) {
  const base = await generateImage({
    description: job.prompt,
    width: job.size.width,
    height: job.size.height,
    view: 'high top-down',
    direction: 'south',
    seed: job.seed,
    negative: job.negative,
  });
  const byFacing = { down: base };
  for (const facing of ['up', 'left', 'right']) {
    byFacing[facing] = await rotateImage(
      base,
      {
        fromDirection: 'south',
        toDirection: FACING_TO_PL_DIRECTION[facing],
        width: job.size.width,
        height: job.size.height,
        seed: job.seed,
      },
      encodePng,
    );
  }
  return byFacing;
}

/**
 * Hero walk sheet: cột 0 đứng, cột 1..8 bước, 4 hàng hướng. Sinh base+xoay rồi animate "walk" mỗi hướng.
 */
async function buildHeroWalk(job, dirs) {
  const columns = job.columns; // 9
  const cell = job.cellSize; // 192
  const framesByFacing = {};
  for (const facing of SHEET_ROW_ORDER) {
    const walk = await animateWithText(
      dirs[facing],
      {
        width: job.size.width,
        height: job.size.height,
        description: job.prompt,
        action: 'walk cycle',
        direction: FACING_TO_PL_DIRECTION[facing],
        frames: columns - 1,
        seed: job.seed,
      },
      encodePng,
    );
    const idle = frameSprite(dirs[facing], cell);
    framesByFacing[facing] = [idle, ...walk.map((f) => frameSprite(f, cell))];
  }
  return assembleSheet(framesByFacing, cell, columns, false);
}

/** Một sheet động tác trận (idle/strike/cast): chỉ hàng hướng lên (up), `columns` khung. */
async function buildHeroBattleMove(job, dirs, move) {
  const cell = job.cellSize;
  const columns = move.columns;
  const frames = await animateWithText(
    dirs.up,
    {
      width: job.size.width,
      height: job.size.height,
      description: `${job.prompt}, ${move.actionPrompt}`,
      action: move.action,
      direction: 'north',
      frames: columns,
      seed: job.seed,
    },
    encodePng,
  );
  const framed = frames.slice(0, columns).map((f) => frameSprite(f, cell));
  // Battle sheet dùng row0; dựng sheet 1 hàng với đủ cột.
  return assembleSheet({ down: framed }, cell, columns, true);
}

async function runHeroSheetJob(job, usage) {
  const dirs = await generateHeroDirections(job);
  usage.generations += 4;
  // walk
  const walkSheet = await buildHeroWalk(job, dirs);
  usage.generations += SHEET_ROW_ORDER.length;
  writeSheet(job.walk, walkSheet, job, ['walk'], usage);
  // battle moves
  for (const move of job.battleMoves) {
    const sheet = await buildHeroBattleMove(job, dirs, move);
    usage.generations += 1;
    writeSheet(move, sheet, job, [move.action], usage);
  }
}

function writeSheet(target, sheet, job, animations, usage) {
  const fsPath = assetFsPath(target.path);
  ensureDir(fsPath);
  writePng(fsPath, sheet);
  upsertRecipe({
    id: target.id,
    path: target.path,
    prompt: job.prompt,
    seed: job.seed,
    size: { width: sheet.width, height: sheet.height },
    directions: job.directions ?? 4,
    animations,
    reference: job.reference,
    createdAt: TODAY,
  });
  upsertCredits([{ ...job.credit, path: target.path }]);
  usage.written.push(target.path);
}

function assetFsPathForSingle(job) {
  return assetFsPath(job.path);
}

async function runSingleJob(job, usage) {
  const image = await generateImage({
    description: job.prompt,
    width: job.size.width,
    height: job.size.height,
    view: job.view ?? 'high top-down',
    direction: job.direction ?? 'south',
    seed: job.seed,
    negative: job.negative,
  });
  usage.generations += 1;
  const framed = job.frameSize ? frameSprite(image, job.frameSize) : image;
  const fsPath = assetFsPathForSingle(job);
  ensureDir(fsPath);
  writePng(fsPath, framed);
  upsertRecipe({
    id: job.id,
    path: job.path,
    prompt: job.prompt,
    seed: job.seed,
    size: { width: framed.width, height: framed.height },
    directions: job.directions ?? 4,
    animations: job.animations ?? ['still'],
    reference: job.reference,
    createdAt: TODAY,
  });
  upsertCredits([{ ...job.credit, path: job.path }]);
  usage.written.push(job.path);
}

/** File đích đã có chưa (để resume/bỏ qua). Hero-sheet coi là có khi tất cả sheet con tồn tại. */
function jobOutputsExist(job) {
  if (job.kind === 'hero-sheet') {
    const targets = [job.walk, ...job.battleMoves];
    return targets.every((t) => existsSync(assetFsPath(t.path)));
  }
  return existsSync(assetFsPath(job.path));
}

async function main() {
  const { force, dry, ids } = parseArgs(process.argv.slice(2));
  const jobs = ASSET_JOBS.filter((job) => ids.length === 0 || ids.includes(job.id));
  const usage = { generations: 0, written: [], skipped: [], stoppedByQuota: false };

  if (dry) {
    for (const job of jobs) console.log(`${job.kind}\t${job.id}\t${job.path ?? job.walk?.path}`);
    console.log(`\n${jobs.length} job.`);
    return;
  }

  try {
    const balance = await getBalance();
    console.log(`PixelLab balance: ${JSON.stringify(balance)} (có thể chạy bằng quota generations dù $0).`);
  } catch (error) {
    console.error(`Không đọc được balance: ${error.message}`);
  }

  for (const job of jobs) {
    if (!force && jobOutputsExist(job)) {
      usage.skipped.push(job.id);
      continue;
    }
    try {
      console.log(`→ ${job.id} (${job.kind})…`);
      if (job.kind === 'hero-sheet') await runHeroSheetJob(job, usage);
      else await runSingleJob(job, usage);
    } catch (error) {
      if (error instanceof PixelLabApiError && QUOTA_STATUSES.has(error.status)) {
        console.error(`HẾT QUOTA tại job ${job.id} (HTTP ${error.status}). Dừng êm, giữ asset đã sinh.`);
        usage.stoppedByQuota = true;
        break;
      }
      throw error;
    }
  }

  console.log(`\nĐã sinh ${usage.written.length} file, ${usage.generations} generations. Bỏ qua ${usage.skipped.length} job đã có.`);
  if (usage.stoppedByQuota) {
    const done = new Set([...usage.written]);
    const remaining = jobs.filter((job) => {
      const paths = job.kind === 'hero-sheet' ? [job.walk, ...job.battleMoves].map((t) => t.path) : [job.path];
      return paths.some((p) => !done.has(p) && !existsSync(assetFsPath(p)));
    });
    console.log(`CÒN THIẾU (bổ sung sau): ${remaining.map((j) => j.id).join(', ')}`);
    process.exitCode = 3; // mã riêng cho "hết quota", để orchestrator phân biệt
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
