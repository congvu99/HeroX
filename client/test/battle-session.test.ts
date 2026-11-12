import { describe, expect, it } from 'vitest';
import { MIN_REACTION_MS, replayBattle, type BattleEvent, type BattleInput } from '@herox/shared';
import { BattleCueMapper, type BattleCue } from '../src/battle/battle-cues';
import { BattleSession } from '../src/battle/battle-session';
import { DEV_BATTLE_WORDS, devBattleSetup } from '../src/battle/dev-battle-fixture';

/** Delta khung hình 60 FPS thật (lẻ), để kiểm đồng hồ ms nguyên. */
const FRAME_MS = 1000 / 60;
const THINK_FRAMES = 15;

interface Played {
  readonly events: BattleEvent[];
  readonly cues: BattleCue[];
}

function runFrames(session: BattleSession, frames: number, played: Played, mapper: BattleCueMapper): void {
  for (let frame = 0; frame < frames; frame += 1) {
    for (const event of session.tick(FRAME_MS)) {
      played.events.push(event);
      played.cues.push(...mapper.cuesFor(event));
    }
  }
}

function promptAnswer(session: BattleSession, kind: BattleInput['kind']): BattleInput {
  const prompt = session.current.prompt;
  if (prompt === null) throw new Error('Không có đề');
  const word = session.wordById(prompt.wordId);
  if (word === undefined) throw new Error('Đề trỏ tới từ lạ');
  return kind === 'ring' ? { kind: 'ring', wordId: word.id } : { kind: 'type', text: word.word };
}

/** Trả lời theo `decide` (đúng/sai, gõ/vòng từ) sau ~250 ms mỗi đề cho tới khi trận kết thúc. */
function playBattle(decide: (turn: number) => BattleInput | 'answer-type' | 'answer-ring'): { session: BattleSession; played: Played } {
  const session = new BattleSession(devBattleSetup());
  const mapper = new BattleCueMapper();
  const played: Played = { events: [], cues: [] };
  for (let turn = 0; turn < 300 && !session.isOver; turn += 1) {
    runFrames(session, THINK_FRAMES, played, mapper);
    if (session.isOver) break;
    const choice = decide(turn);
    session.submit(choice === 'answer-type' ? promptAnswer(session, 'type') : choice === 'answer-ring' ? promptAnswer(session, 'ring') : choice);
    runFrames(session, 1, played, mapper);
  }
  return { session, played };
}

function fxPlayed(cues: readonly BattleCue[]): string[] {
  return cues.flatMap((cue) => (cue.type === 'fx' ? [cue.fx] : []));
}

describe('dev battle fixture', () => {
  it('có 20 từ, id không trùng, đủ 4 loại chiêu', () => {
    expect(DEV_BATTLE_WORDS).toHaveLength(20);
    expect(new Set(DEV_BATTLE_WORDS.map((word) => word.id)).size).toBe(20);
    expect(new Set(DEV_BATTLE_WORDS.map((word) => word.pos))).toEqual(new Set(['verb', 'adv', 'noun', 'adj', 'prep']));
  });
});

describe('BattleSession', () => {
  it('lần tick đầu trả sự kiện mở màn (quái hiện, đề đầu)', () => {
    const session = new BattleSession(devBattleSetup());
    const types = session.tick(FRAME_MS).map((event) => event.type);
    expect(types).toContain('enemySpawn');
    expect(types).toContain('prompt');
  });

  it('input trong 150 ms đầu bị bỏ qua và không vào log', () => {
    const session = new BattleSession(devBattleSetup());
    session.tick(FRAME_MS);
    expect(session.isInputLocked).toBe(true);
    session.submit(promptAnswer(session, 'type'));
    const events = session.tick(FRAME_MS);
    expect(events.some((event) => event.type === 'cast')).toBe(false);
    expect(session.resultRequest().entries).toHaveLength(0);
    runFrames(session, Math.ceil(MIN_REACTION_MS / FRAME_MS), { events: [], cues: [] }, new BattleCueMapper());
    expect(session.isInputLocked).toBe(false);
  });

  it('gõ đúng cả trận: thắng, có combo cùng loại hoặc chuỗi cụm, log chạy lại ở server ra cùng kết quả', () => {
    const { session, played } = playBattle(() => 'answer-type');
    expect(session.current.outcome).toBe('victory');
    const request = session.resultRequest();
    expect(request.entries.every((entry) => Number.isInteger(entry.atMs))).toBe(true);
    const replay = replayBattle(devBattleSetup(), request);
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.state.outcome).toBe('victory');
      expect(replay.state.goldEarned).toBe(session.current.goldEarned);
    }
    const combos = played.events.filter((event) => event.type === 'comboUp');
    expect(combos.some((event) => event.count >= 3)).toBe(true);
    // Mỗi lần tung chiêu đều có hiệu ứng tung và hiệu ứng trúng.
    const casts = played.events.filter((event) => event.type === 'cast').length;
    const castFx = played.cues.filter((cue) => cue.type === 'fx' && cue.target === 'hero' && /-cast-|dash-dust|blink-out/.test(cue.fx));
    expect(castFx.length).toBeGreaterThanOrEqual(casts);
  });

  it('chuỗi cụm ra đòn kết liễu có hiệu ứng riêng', () => {
    const { played } = playBattle(() => 'answer-type');
    const chainCombo = played.events.find((event) => event.type === 'comboUp' && event.chainId !== null);
    expect(chainCombo).toBeDefined();
    expect(fxPlayed(played.cues)).toContain('finisher');
  });

  it('vòng từ chơi được chỉ bằng chạm ô', () => {
    const { session, played } = playBattle(() => 'answer-ring');
    expect(session.current.outcome).toBe('victory');
    expect(session.resultRequest().entries.every((entry) => entry.kind === 'ring')).toBe(true);
    expect(played.events.some((event) => event.type === 'cast' && event.accuracy === 'ring')).toBe(true);
  });

  it('sai từ làm đứt chuỗi và quái đánh trả có hiệu ứng', () => {
    // Đúng 2 đề để có combo, rồi sai 1 đề, lặp lại.
    const { played } = playBattle((turn) => (turn % 3 === 2 ? { kind: 'type', text: 'zzzz' } : 'answer-type'));
    expect(played.events.some((event) => event.type === 'comboBreak')).toBe(true);
    expect(played.events.some((event) => event.type === 'miss' && event.reason === 'wrong')).toBe(true);
    expect(fxPlayed(played.cues)).toContain('enemy-strike');
  });

  it('không trả lời: hết giờ tính như sai, cuối cùng thua', () => {
    const session = new BattleSession(devBattleSetup());
    const mapper = new BattleCueMapper();
    const played: Played = { events: [], cues: [] };
    runFrames(session, 60 * 60 * 5, played, mapper);
    expect(session.current.outcome).toBe('defeat');
    expect(played.events.some((event) => event.type === 'miss' && event.reason === 'timeout')).toBe(true);
    expect(session.resultRequest().entries).toHaveLength(0);
  });

  it('không nhận input sau khi trận đã xong', () => {
    const { session } = playBattle(() => 'answer-type');
    const entries = session.resultRequest().entries.length;
    session.submit({ kind: 'type', text: 'run' });
    expect(session.tick(FRAME_MS)).toEqual([]);
    expect(session.resultRequest().entries).toHaveLength(entries);
  });
});
