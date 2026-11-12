import { WORD_CHAINS, type WordChain } from '../data/word-chains.js';
import { matchAnswer, normalizeAnswer } from './answer-matching.js';
import type { BattleInput, BattleOutcome, BattleSetup, BattleWord } from './battle-types.js';
import {
  comboExpiresAtMs,
  EMPTY_COMBO,
  extendCombo,
  MIN_VISIBLE_COMBO,
  type ComboBonus,
  type ComboState,
} from './combo-chain.js';
import {
  computeCastDamage,
  computeEnemyHitDamage,
  computeShieldGain,
  maxShieldFor,
  type CastAccuracy,
} from './damage-formula.js';
import { buildRingOptions } from './ring-options.js';
import { SeededRandom } from './seeded-random.js';
import { skillKindForPartOfSpeech, type SkillKind } from './skill-kind.js';
import { availableChains, pickPromptWord, RECENT_PROMPT_MEMORY } from './word-pool.js';

// Quái tinh anh: thỉnh thoảng một từ hay sai hoá thành quái nhiều máu hơn, thưởng gấp đôi.
export const ELITE_CHANCE = 0.25;
export const ELITE_HP_MULTIPLIER = 2;
export const ELITE_REWARD_MULTIPLIER = 2;
// Đòn kết liễu của chuỗi cụm hạ luôn quái còn dưới 25% máu sau cú đánh.
export const FINISHER_EXECUTE_RATIO = 0.25;
const MAX_WEAKENED_HITS = 2;
const MAX_EVADE_CHARGES = 1;

export interface HeroBattleState {
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  /** Số đòn quái sắp tới được né hoàn toàn. */
  readonly evadeCharges: number;
}

export interface EnemyBattleState {
  readonly index: number;
  readonly kind: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly rewardGold: number;
  readonly elite: boolean;
  /** Số đòn tới của quái bị giảm sát thương. */
  readonly weakenedHits: number;
  /** Khiên lửa pha 2 đang dựng (chỉ trùm). */
  readonly shielded: boolean;
}

export interface PromptState {
  readonly wordId: string;
  /** Id từ trên vòng từ, đã xáo. */
  readonly options: readonly string[];
  readonly shownAtMs: number;
  readonly deadlineMs: number;
}

/** Dữ liệu tra cứu dựng một lần lúc bắt đầu trận, dùng chung qua mọi bước. */
export interface BattleIndex {
  readonly wordsById: ReadonlyMap<string, BattleWord>;
  readonly chains: readonly WordChain[];
}

export interface BattleState {
  readonly setup: BattleSetup;
  readonly index: BattleIndex;
  readonly rngState: number;
  readonly elapsedMs: number;
  readonly hero: HeroBattleState;
  readonly enemy: EnemyBattleState | null;
  readonly prompt: PromptState | null;
  readonly recentWordIds: readonly string[];
  /** Từ đã sai trong trận, ra lại nhiều hơn tới khi trả lời đúng. */
  readonly retryWordIds: readonly string[];
  readonly combo: ComboState;
  /** Số lần sai theo id từ, gửi về server cuối trận để ghi `word_misses`. */
  readonly misses: ReadonlyMap<string, number>;
  readonly goldEarned: number;
  readonly outcome: BattleOutcome;
}

export type MissReason = 'wrong' | 'timeout';

export type BattleEvent =
  | { readonly type: 'enemySpawn'; readonly enemyIndex: number; readonly kind: string; readonly maxHp: number; readonly elite: boolean }
  | { readonly type: 'prompt'; readonly wordId: string; readonly options: readonly string[]; readonly deadlineMs: number }
  | {
      readonly type: 'cast';
      readonly wordId: string;
      readonly skill: SkillKind;
      readonly accuracy: CastAccuracy;
      readonly mastered: boolean;
    }
  | {
      readonly type: 'comboUp';
      readonly count: number;
      readonly bonus: ComboBonus;
      readonly multiplier: number;
      readonly chainId: string | null;
    }
  | {
      readonly type: 'hit';
      readonly damage: number;
      readonly enemyHp: number;
      /** Đòn kết liễu của chuỗi cụm. */
      readonly finisher: boolean;
      readonly shield: number;
      readonly evadeCharges: number;
      readonly enemyWeakenedHits: number;
    }
  /** Trùm sang pha 2 và dựng khiên lửa. */
  | { readonly type: 'enemyShieldUp'; readonly enemyIndex: number; readonly minCombo: number }
  /** Chiêu bị khiên lửa chặn: combo chưa đủ dài; `comboNeeded` là số chiêu đúng nữa cần nối thêm. */
  | { readonly type: 'shieldBlocked'; readonly comboNeeded: number }
  | { readonly type: 'miss'; readonly wordId: string; readonly reason: MissReason }
  | { readonly type: 'comboBreak'; readonly count: number }
  | {
      readonly type: 'enemyAttack';
      readonly damage: number;
      readonly absorbed: number;
      readonly evaded: boolean;
      readonly heroHp: number;
      readonly shield: number;
    }
  | { readonly type: 'enemyDefeated'; readonly enemyIndex: number; readonly rewardGold: number }
  | { readonly type: 'victory'; readonly goldEarned: number }
  | { readonly type: 'defeat' };

export interface StepResult {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}

/** Setup sai (bộ từ rỗng, không có quái...) là lỗi lập trình phía server, không phải lỗi người chơi. */
export class InvalidBattleSetupError extends Error {
  constructor(reason: string) {
    super(`Setup trận không hợp lệ: ${reason}`);
    this.name = 'InvalidBattleSetupError';
  }
}

function assertValidSetup(setup: BattleSetup): void {
  if (setup.words.length === 0) throw new InvalidBattleSetupError('bộ từ rỗng');
  if (setup.enemies.length === 0) throw new InvalidBattleSetupError('không có quái');
  if (!(setup.promptTimeMs > 0)) throw new InvalidBattleSetupError('thời gian trả lời phải dương');
  if (!(setup.hero.maxHp > 0)) throw new InvalidBattleSetupError('máu anh hùng phải dương');
  if (setup.enemies.some((enemy) => !(enemy.maxHp > 0))) throw new InvalidBattleSetupError('máu quái phải dương');
}

/**
 * Bản nháp có thể sửa của một bước. Mỗi lần `step` tạo một bản từ trạng thái cũ, sửa, rồi đóng thành trạng thái mới;
 * trạng thái truyền vào không bao giờ bị đổi.
 */
class BattleDraft {
  private readonly rng: SeededRandom;
  private readonly events: BattleEvent[] = [];
  private elapsedMs: number;
  private hero: HeroBattleState;
  private enemy: EnemyBattleState | null;
  private prompt: PromptState | null;
  private recentWordIds: readonly string[];
  private retryWordIds: readonly string[];
  private combo: ComboState;
  private misses: ReadonlyMap<string, number>;
  private goldEarned: number;
  private outcome: BattleOutcome;

  constructor(private readonly base: BattleState) {
    this.rng = new SeededRandom(base.rngState);
    this.elapsedMs = base.elapsedMs;
    this.hero = base.hero;
    this.enemy = base.enemy;
    this.prompt = base.prompt;
    this.recentWordIds = base.recentWordIds;
    this.retryWordIds = base.retryWordIds;
    this.combo = base.combo;
    this.misses = base.misses;
    this.goldEarned = base.goldEarned;
    this.outcome = base.outcome;
  }

  private get setup(): BattleSetup {
    return this.base.setup;
  }

  finish(): StepResult {
    const state: BattleState = {
      setup: this.setup,
      index: this.base.index,
      rngState: this.rng.state,
      elapsedMs: this.elapsedMs,
      hero: this.hero,
      enemy: this.enemy,
      prompt: this.prompt,
      recentWordIds: this.recentWordIds,
      retryWordIds: this.retryWordIds,
      combo: this.combo,
      misses: this.misses,
      goldEarned: this.goldEarned,
      outcome: this.outcome,
    };
    return { state, events: this.events };
  }

  /**
   * Cho thời gian trôi tới `targetMs`, xử lý lần lượt các mốc (combo hết hạn, đề hết giờ) đúng thời điểm của chúng,
   * nên chia một khoảng thời gian thành nhiều bước nhỏ hay một bước lớn đều cho cùng kết quả.
   */
  advanceTo(targetMs: number): void {
    while (this.outcome === 'ongoing') {
      const comboDeadline = comboExpiresAtMs(this.combo) ?? Number.POSITIVE_INFINITY;
      const promptDeadline = this.prompt?.deadlineMs ?? Number.POSITIVE_INFINITY;
      const nextDeadline = Math.min(comboDeadline, promptDeadline);
      if (nextDeadline > targetMs) break;
      this.elapsedMs = nextDeadline;
      if (comboDeadline <= promptDeadline) this.breakCombo();
      else this.timeOutPrompt();
    }
    if (this.outcome === 'ongoing') this.elapsedMs = Math.max(this.elapsedMs, targetMs);
  }

  applyInput(input: BattleInput): void {
    if (this.outcome !== 'ongoing' || this.prompt === null) return;
    const word = this.wordById(this.prompt.wordId);
    const accuracy = this.judge(input, word);
    if (accuracy === null) this.miss(word, 'wrong');
    else this.cast(word, accuracy);
  }

  spawnEnemy(enemyIndex: number): void {
    const spec = this.setup.enemies[enemyIndex];
    if (spec === undefined) return;
    const weakWords = this.setup.words.filter((word) => word.weak);
    const elite = this.setup.allowElite && weakWords.length > 0 && this.rng.chance(ELITE_CHANCE);
    // Quái tinh anh mở màn bằng chính từ yếu nó mang theo; tránh lặp từ vừa hỏi khi còn từ yếu khác.
    const freshWeakWords = weakWords.filter((word) => !this.recentWordIds.includes(word.id));
    const eliteWord = elite ? this.rng.pick(freshWeakWords.length > 0 ? freshWeakWords : weakWords) : undefined;
    const maxHp = elite ? spec.maxHp * ELITE_HP_MULTIPLIER : spec.maxHp;
    this.enemy = {
      index: enemyIndex,
      kind: spec.kind,
      hp: maxHp,
      maxHp,
      attack: spec.attack,
      rewardGold: elite ? spec.rewardGold * ELITE_REWARD_MULTIPLIER : spec.rewardGold,
      elite,
      weakenedHits: 0,
      shielded: false,
    };
    this.events.push({ type: 'enemySpawn', enemyIndex, kind: spec.kind, maxHp, elite });
    this.showPrompt(eliteWord);
  }

  private wordById(wordId: string): BattleWord {
    const word = this.base.index.wordsById.get(wordId);
    if (word === undefined) throw new InvalidBattleSetupError(`đề trỏ tới từ không có trong bộ (${wordId})`);
    return word;
  }

  private judge(input: BattleInput, word: BattleWord): CastAccuracy | null {
    if (input.kind === 'ring') return input.wordId === word.id ? 'ring' : null;
    const match = matchAnswer(input.text, word.word);
    return match === 'wrong' ? null : match;
  }

  private showPrompt(forcedWord?: BattleWord): void {
    const word =
      forcedWord ??
      pickPromptWord(
        {
          words: this.setup.words,
          recentWordIds: this.recentWordIds,
          retryWordIds: this.retryWordIds,
          combo: this.combo,
          chains: this.base.index.chains,
        },
        this.rng,
      );
    const options = buildRingOptions(word, this.setup.words, this.setup.loadout, this.rng);
    const deadlineMs = this.elapsedMs + this.setup.promptTimeMs;
    this.prompt = { wordId: word.id, options, shownAtMs: this.elapsedMs, deadlineMs };
    this.recentWordIds = [...this.recentWordIds, word.id].slice(-RECENT_PROMPT_MEMORY);
    this.events.push({ type: 'prompt', wordId: word.id, options, deadlineMs });
  }

  private cast(word: BattleWord, accuracy: CastAccuracy): void {
    const enemy = this.enemy;
    if (enemy === null) return;
    const skill = skillKindForPartOfSpeech(word.pos);
    const combo = extendCombo(this.combo, { word: normalizeAnswer(word.word), pos: word.pos }, this.elapsedMs, this.base.index.chains);
    this.combo = combo.combo;
    this.retryWordIds = this.retryWordIds.filter((id) => id !== word.id);
    this.events.push({ type: 'cast', wordId: word.id, skill, accuracy, mastered: word.mastered });
    if (combo.count >= MIN_VISIBLE_COMBO) {
      this.events.push({
        type: 'comboUp',
        count: combo.count,
        bonus: combo.bonus,
        multiplier: combo.multiplier,
        chainId: combo.chainId,
      });
    }

    const power = {
      power: this.setup.hero.power,
      accuracy,
      mastered: word.mastered,
      skill,
      tier: this.setup.skillTiers[skill],
      comboMultiplier: combo.multiplier,
    };
    this.applySkillEffect(skill, computeShieldGain(power));
    const minCombo = enemy.shielded ? (this.setup.enemies[enemy.index]?.fireShield?.minCombo ?? 0) : 0;
    if (combo.count < minCombo) {
      // Khiên lửa chặn sát thương, hiệu ứng chiêu (khiên, né, làm yếu) vẫn có; combo vẫn nối để lần sau xuyên được.
      this.events.push({ type: 'shieldBlocked', comboNeeded: minCombo - combo.count });
      this.showPrompt();
      return;
    }
    const finisher = combo.chainId !== null;
    let damage = Math.min(enemy.hp, computeCastDamage(power));
    if (finisher && enemy.hp - damage <= enemy.maxHp * FINISHER_EXECUTE_RATIO) damage = enemy.hp;
    const hp = enemy.hp - damage;
    this.enemy = { ...this.currentEnemy(), hp };
    this.events.push({
      type: 'hit',
      damage,
      enemyHp: hp,
      finisher,
      shield: this.hero.shield,
      evadeCharges: this.hero.evadeCharges,
      enemyWeakenedHits: this.currentEnemy().weakenedHits,
    });
    if (hp === 0) {
      this.defeatEnemy();
      return;
    }
    this.raiseFireShieldIfDue();
    this.showPrompt();
  }

  private raiseFireShieldIfDue(): void {
    const enemy = this.currentEnemy();
    const fireShield = this.setup.enemies[enemy.index]?.fireShield;
    if (fireShield === undefined || enemy.shielded || enemy.hp > enemy.maxHp * fireShield.belowHpRatio) return;
    this.enemy = { ...enemy, shielded: true };
    this.events.push({ type: 'enemyShieldUp', enemyIndex: enemy.index, minCombo: fireShield.minCombo });
    // Khiên dựng lên dập tắt combo đang có: người chơi phải nối chuỗi mới để xuyên khiên.
    this.breakCombo();
  }

  private currentEnemy(): EnemyBattleState {
    if (this.enemy === null) throw new InvalidBattleSetupError('không có quái đang đánh');
    return this.enemy;
  }

  private applySkillEffect(skill: SkillKind, shieldGain: number): void {
    if (skill === 'guard') {
      this.hero = { ...this.hero, shield: Math.min(maxShieldFor(this.hero.maxHp), this.hero.shield + shieldGain) };
    } else if (skill === 'evade') {
      this.hero = { ...this.hero, evadeCharges: Math.min(MAX_EVADE_CHARGES, this.hero.evadeCharges + 1) };
    } else if (skill === 'empower') {
      const enemy = this.currentEnemy();
      this.enemy = { ...enemy, weakenedHits: Math.min(MAX_WEAKENED_HITS, enemy.weakenedHits + 1) };
    }
  }

  private defeatEnemy(): void {
    const enemy = this.currentEnemy();
    this.goldEarned += enemy.rewardGold;
    this.events.push({ type: 'enemyDefeated', enemyIndex: enemy.index, rewardGold: enemy.rewardGold });
    if (enemy.index + 1 < this.setup.enemies.length) {
      this.spawnEnemy(enemy.index + 1);
      return;
    }
    this.outcome = 'victory';
    this.prompt = null;
    this.events.push({ type: 'victory', goldEarned: this.goldEarned });
  }

  private timeOutPrompt(): void {
    if (this.prompt === null) return;
    this.miss(this.wordById(this.prompt.wordId), 'timeout');
  }

  private miss(word: BattleWord, reason: MissReason): void {
    const misses = new Map(this.misses);
    misses.set(word.id, (misses.get(word.id) ?? 0) + 1);
    this.misses = misses;
    if (!this.retryWordIds.includes(word.id)) this.retryWordIds = [...this.retryWordIds, word.id];
    this.events.push({ type: 'miss', wordId: word.id, reason });
    this.breakCombo();
    this.enemyAttack();
    if (this.outcome === 'ongoing') this.showPrompt();
  }

  private breakCombo(): void {
    if (this.combo.count >= MIN_VISIBLE_COMBO) this.events.push({ type: 'comboBreak', count: this.combo.count });
    this.combo = EMPTY_COMBO;
  }

  private enemyAttack(): void {
    const enemy = this.currentEnemy();
    if (this.hero.evadeCharges > 0) {
      this.hero = { ...this.hero, evadeCharges: this.hero.evadeCharges - 1 };
      this.events.push({ type: 'enemyAttack', damage: 0, absorbed: 0, evaded: true, heroHp: this.hero.hp, shield: this.hero.shield });
      return;
    }
    const weakened = enemy.weakenedHits > 0;
    if (weakened) this.enemy = { ...enemy, weakenedHits: enemy.weakenedHits - 1 };
    const damage = computeEnemyHitDamage(enemy.attack, weakened);
    const absorbed = Math.min(this.hero.shield, damage);
    const hp = Math.max(0, this.hero.hp - (damage - absorbed));
    this.hero = { ...this.hero, hp, shield: this.hero.shield - absorbed };
    this.events.push({ type: 'enemyAttack', damage, absorbed, evaded: false, heroHp: hp, shield: this.hero.shield });
    if (hp > 0) return;
    this.outcome = 'defeat';
    this.prompt = null;
    this.events.push({ type: 'defeat' });
  }
}

/** Bắt đầu trận: dựng trạng thái đầu, ra quái đầu tiên và đề đầu tiên. */
export function createBattle(setup: BattleSetup, chains: readonly WordChain[] = WORD_CHAINS): StepResult {
  assertValidSetup(setup);
  const initial: BattleState = {
    setup,
    index: {
      wordsById: new Map(setup.words.map((word) => [word.id, word])),
      chains: availableChains(setup.words, chains),
    },
    rngState: setup.seed >>> 0,
    elapsedMs: 0,
    hero: { hp: setup.hero.maxHp, maxHp: setup.hero.maxHp, shield: 0, evadeCharges: 0 },
    enemy: null,
    prompt: null,
    recentWordIds: [],
    retryWordIds: [],
    combo: EMPTY_COMBO,
    misses: new Map(),
    goldEarned: 0,
    outcome: 'ongoing',
  };
  const draft = new BattleDraft(initial);
  draft.spawnEnemy(0);
  return draft.finish();
}

/**
 * Một bước thuần của trận: cho thời gian trôi `dtMs` rồi áp dụng `input` (nếu có) tại thời điểm cuối bước.
 * Cùng setup + cùng chuỗi (input, thời điểm) luôn cho cùng kết quả, bất kể chia bước thế nào.
 * Thời gian trận là số nguyên ms: `dtMs` lẻ bị làm tròn xuống (client dùng `BattleFrameClock` để giữ phần lẻ).
 */
export function step(state: BattleState, input: BattleInput | null, dtMs: number): StepResult {
  if (state.outcome !== 'ongoing') return { state, events: [] };
  const draft = new BattleDraft(state);
  draft.advanceTo(state.elapsedMs + (Number.isFinite(dtMs) && dtMs > 0 ? Math.floor(dtMs) : 0));
  if (input !== null) draft.applyInput(input);
  return draft.finish();
}
