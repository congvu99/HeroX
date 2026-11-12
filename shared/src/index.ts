export { API_PREFIX, APP_BASE_PATH, apiPath } from './app-paths.js';
export {
  HERO_GENDERS,
  HERO_NAME_MAX_LENGTH,
  HERO_NAME_MIN_LENGTH,
  PART_OF_SPEECH_GROUPS,
  isHeroGender,
  normalizeHeroName,
} from './me-contract.js';
export type {
  ApiErrorBody,
  CreateHeroRequest,
  HeroGender,
  HeroState,
  LearningStats,
  MeResponse,
  PartOfSpeechGroup,
  WeakWord,
} from './me-contract.js';
export { levenshteinDistance, matchAnswer, normalizeAnswer } from './combat/answer-matching.js';
export { BattleFrameClock } from './combat/battle-frame-clock.js';
export type { AnswerMatch } from './combat/answer-matching.js';
export type {
  BattleResultRequest,
  BattleResultResponse,
  SettledBattleOutcome,
  StartBattleRequest,
  StartBattleResponse,
} from './combat/battle-contract.js';
export {
  isInputTooFast,
  MAX_BATTLE_DURATION_MS,
  MAX_BATTLE_LOG_ENTRIES,
  MAX_TYPED_ANSWER_LENGTH,
  MIN_REACTION_MS,
  replayBattle,
  stepRecorded,
} from './combat/battle-replay.js';
export type { BattleLog, BattleLogEntry, RecordedStepResult, ReplayResult, ReplayViolation } from './combat/battle-replay.js';
export {
  createBattle,
  ELITE_CHANCE,
  ELITE_HP_MULTIPLIER,
  ELITE_REWARD_MULTIPLIER,
  FINISHER_EXECUTE_RATIO,
  InvalidBattleSetupError,
  step,
} from './combat/battle-state.js';
export type {
  BattleEvent,
  BattleIndex,
  BattleState,
  EnemyBattleState,
  HeroBattleState,
  MissReason,
  PromptState,
  StepResult,
} from './combat/battle-state.js';
export type {
  BattleInput,
  BattleOutcome,
  BattleSetup,
  BattleWord,
  EnemySpec,
  HeroCombatStats,
} from './combat/battle-types.js';
export {
  CHAIN_COMBO_MULTIPLIER,
  COMBO_WINDOW_MS,
  comboExpiresAtMs,
  EMPTY_COMBO,
  extendCombo,
  MIN_VISIBLE_COMBO,
  nextChainWord,
  SAME_POS_COMBO_LENGTH,
  SAME_POS_COMBO_MULTIPLIER,
} from './combat/combo-chain.js';
export type { ComboBonus, ComboLink, ComboResult, ComboState } from './combat/combo-chain.js';
export {
  ACCURACY_DAMAGE_FACTORS,
  computeCastDamage,
  computeEnemyHitDamage,
  computeShieldGain,
  MASTERED_DAMAGE_FACTOR,
  maxShieldFor,
  UTILITY_SKILL_DAMAGE_FACTOR,
  WEAKENED_ENEMY_DAMAGE_FACTOR,
} from './combat/damage-formula.js';
export type { CastAccuracy, CastPower } from './combat/damage-formula.js';
export {
  ENCOUNTERS,
  FIELD_ENCOUNTER_ID,
  findEncounter,
  scaleEncounterEnemies,
  TUTORIAL_ENCOUNTER_ID,
} from './combat/encounters.js';
export type { Encounter, EnemyTemplate } from './combat/encounters.js';
export { buildRingOptions, RING_LOADOUT_SLOTS, RING_SIZE } from './combat/ring-options.js';
export { SeededRandom } from './combat/seeded-random.js';
export { SKILL_KINDS, skillKindForPartOfSpeech } from './combat/skill-kind.js';
export type { SkillKind } from './combat/skill-kind.js';
export {
  availableChains,
  BATTLE_POOL_SIZE,
  MIN_LEARNED_WORDS_FOR_BATTLE,
  pickPromptWord,
  RECENT_PROMPT_MEMORY,
  selectBattleWords,
  TUTORIAL_WORD_IDS,
} from './combat/word-pool.js';
export type { PromptContext } from './combat/word-pool.js';
export { WORD_CHAINS } from './data/word-chains.js';
export type { WordChain } from './data/word-chains.js';
export {
  CHAPTER_UNLOCKS,
  heroLevelForLearned,
  heroStatsForLevel,
  highestUnlockedChapter,
  isChapterUnlocked,
  learnedWordsForLevel,
  MAX_HERO_LEVEL,
} from './progression/level-curve.js';
export type { ChapterUnlock, WordCounts } from './progression/level-curve.js';
export {
  advPrepWordCount,
  BASE_SKILL_TIER,
  isMovementSkillUnlocked,
  MOVEMENT_SKILL_IDS,
  MOVEMENT_SKILLS,
  SKILL_CATALOG,
  SKILL_TIERS,
  skillVariantFor,
  SYSTEM_FX,
} from './data/skill-catalog.js';
export type { MovementSkill, MovementSkillId, SkillTier, SkillVariant } from './data/skill-catalog.js';
export { BASE_SKILL_TIERS, isSkillTier, MAX_SKILL_TIER, SKILL_TIER_POWER_FACTORS } from './data/skill-catalog.js';
export type { SkillTiers } from './data/skill-catalog.js';
export {
  BASE_FORGE_LEVEL,
  BUILDING_IDS,
  BUILDINGS,
  CITADEL_STAGE_NAMES,
  CITADEL_STAGE_THRESHOLDS,
  CITADEL_STAGES,
  citadelStageFor,
  DAILY_CRYSTAL_RETENTION_BONUS,
  DAILY_CRYSTAL_STREAK_CAP,
  FORGE_LEVELS,
  forgeLevelInfo,
  isBuildingId,
  MAX_FORGE_LEVEL,
  SKILL_TIER_UPGRADES,
} from './data/citadel-catalog.js';
export type { BuildingId, BuildingInfo, CitadelStage, ForgeLevel, SkillTierUpgrade } from './data/citadel-catalog.js';
export {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SLOTS,
  equipmentBonusAt,
  findEquipmentItem,
  MAX_ITEM_LEVEL,
} from './data/equipment-catalog.js';
export type { EquipmentItem, EquipmentSlot } from './data/equipment-catalog.js';
export { DEFAULT_OUTFIT_ID, findOutfit, OUTFIT_CATALOG } from './data/outfit-catalog.js';
export type { OutfitVariant } from './data/outfit-catalog.js';
export {
  applyCitadelAction,
  buildCitadelResponse,
  canUpgrade,
  CITADEL_REJECTION_MESSAGES,
  dailyCrystalReward,
  equipmentStatBonus,
  hasClaimedCrystalsOn,
  heroStatsWithGear,
  isOutfitUnlocked,
  isValidLoadout,
  localDayKey,
} from './progression/citadel-rules.js';
export type { CitadelActionContext, CitadelActionResult, CitadelRejection, CitadelResponseInput, UpgradeCheck } from './progression/citadel-rules.js';
export type {
  CitadelAction,
  CitadelLearningStats,
  CitadelResponse,
  CitadelState,
  CitadelWord,
  DailyCrystalsRequest,
  DailyCrystalStatus,
  EquipRequest,
  LoadoutRequest,
  OutfitRequest,
  OwnedItem,
  StoryBeatRecord,
  UpgradeRequest,
  UpgradeTarget,
} from './citadel-contract.js';
