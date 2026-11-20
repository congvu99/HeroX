import { CHAPTER_1_BEATS, CHAPTER_1_STORY } from '../../shared/src/data/story/chapter-1.js';
import { FIELD_ENCOUNTER_ID, TUTORIAL_ENCOUNTER_ID } from '../../shared/src/combat/encounters.js';
import type { StoryResponse } from '../../shared/src/story/story-contract.js';
import { isChapterComplete, StoryProgress } from '../../shared/src/story/story-rules.js';
import { START_LEVEL_ID, winBattleAndExit, winBattleAndReturn, type BattlePlayer } from '../support/battle-flow.js';
import { waitForSceneActive, waitForWorldLevel } from '../support/game-driver.js';
import { attachScreenshot, expect, signInAs, test, useBattleInputMode } from '../support/herox-test.js';
import {
  openChest,
  skipDialog,
  skipDialogAndAnswer,
  storyDialog,
  talkTo,
  usePortal,
  waitForStoryBeat,
  walkIntoBattle,
} from '../support/story-flow.js';
import { SCENE_KEYS } from '../../client/src/scenes/scene-keys.js';

const B = CHAPTER_1_BEATS;
const FIELDS = 'Misty_Fields';
const VILLAGE = 'Misty_Village';
const CHAPEL = 'Misty_Chapel';
const LAIR = 'Scarecrow_Lair';
/** Chữ thánh của cánh cửa nhà nguyện (mốc loại `word`), lấy từ dữ liệu chương. */
const CHAPEL_DOOR_WORD = (() => {
  const completion = CHAPTER_1_STORY.beats.find((beat) => beat.id === B.chapelDoor)?.completion;
  if (completion?.kind !== 'word') throw new Error('Mốc cửa nhà nguyện không còn là thử thách chữ');
  return completion.word;
})();
/** Bốn trận, nhiều thoại, chuyển level: lâu hơn hẳn spec khác. */
const CHAPTER_TIMEOUT_MS = 15 * 60_000;

test.describe('Chương 1', () => {
  test.use({ purpose: 'chapter' });

  test('chơi chương 1 từ đầu tới kết chương, bỏ qua thoại bằng nút "Bỏ qua"', async ({ page, persona }, testInfo) => {
    test.setTimeout(CHAPTER_TIMEOUT_MS);
    await signInAs(page, persona);
    await useBattleInputMode(page, 'typing');
    const player: BattlePlayer = { page, mode: 'typing', useTouch: testInfo.project.use.hasTouch === true };

    await test.step('Lexhold: thoại mở đầu, trận hướng dẫn', async () => {
      const awaken = waitForStoryBeat(page, B.awaken);
      await page.goto('./');
      await storyDialog(page).waitFor();
      await skipDialog(page);
      expect((await awaken).status()).toBe(200);
      await waitForWorldLevel(page, START_LEVEL_ID);

      const gateImps = waitForStoryBeat(page, B.gateImps);
      await walkIntoBattle(page, START_LEVEL_ID, TUTORIAL_ENCOUNTER_ID, 'down');
      await winBattleAndReturn(player);
      expect((await gateImps).status()).toBe(200);
    });

    await test.step('Làng: hỏi chuyện dân làng', async () => {
      await usePortal(page, START_LEVEL_ID, FIELDS, 'down');
      await usePortal(page, FIELDS, VILLAGE, 'right');
      const arrival = waitForStoryBeat(page, B.villageArrival);
      await talkTo(page, VILLAGE, 'hollow-villager', 'up');
      await skipDialog(page);
      expect((await arrival).status()).toBe(200);
      await waitForWorldLevel(page, VILLAGE);
    });

    await test.step('Cánh đồng: quét lũ quỷ', async () => {
      await usePortal(page, VILLAGE, FIELDS, 'left');
      const cleared = waitForStoryBeat(page, B.fieldCleared);
      await walkIntoBattle(page, FIELDS, FIELD_ENCOUNTER_ID, 'left');
      await winBattleAndReturn(player);
      expect((await cleared).status()).toBe(200);
      await usePortal(page, FIELDS, VILLAGE, 'right');
    });

    await test.step('Làng: cứu thợ rèn', async () => {
      const rescued = waitForStoryBeat(page, B.smithRescued);
      await talkTo(page, VILLAGE, 'smith', 'up');
      await skipDialog(page);
      await waitForSceneActive(page, SCENE_KEYS.battle);
      await winBattleAndReturn(player);
      expect((await rescued).status()).toBe(200);
    });

    await test.step('Nhà nguyện: khắc chữ cửa, nhặt 3 mảnh, đặt lên bàn thờ', async () => {
      const door = waitForStoryBeat(page, B.chapelDoor);
      await talkTo(page, VILLAGE, 'chapel-door', 'up');
      await skipDialogAndAnswer(page, CHAPEL_DOOR_WORD);
      expect((await door).status()).toBe(200);
      await waitForWorldLevel(page, VILLAGE);

      await usePortal(page, VILLAGE, CHAPEL, 'up');
      expect((await openChest(page, CHAPEL, 'holy-fragment-1', B.fragment1, 'up')).status()).toBe(200);
      expect((await openChest(page, CHAPEL, 'holy-fragment-2', B.fragment2, 'up')).status()).toBe(200);
      expect((await openChest(page, CHAPEL, 'holy-fragment-3', B.fragment3, 'right')).status()).toBe(200);

      const restored = waitForStoryBeat(page, B.chapelRestored);
      await talkTo(page, CHAPEL, 'chapel-altar', 'up');
      await skipDialog(page);
      expect((await restored).status()).toBe(200);
      await waitForWorldLevel(page, CHAPEL);
      await usePortal(page, CHAPEL, VILLAGE, 'down');
    });

    await test.step('Hang: hạ Quỷ Bù Nhìn, nghe chuông kết chương', async () => {
      await usePortal(page, VILLAGE, LAIR, 'down');
      const defeated = waitForStoryBeat(page, B.scarecrowDefeated);
      const epilogue = waitForStoryBeat(page, B.epilogue);
      await talkTo(page, LAIR, 'scarecrow', 'down');
      await skipDialog(page);
      await waitForSceneActive(page, SCENE_KEYS.battle);
      await winBattleAndExit(player);
      expect((await defeated).status()).toBe(200);

      // Thắng trùm xong, thoại kết chương tự mở khi bản đồ chạy lại.
      await storyDialog(page).waitFor();
      await attachScreenshot(page, 'thoai-ket-chuong');
      await skipDialog(page);
      expect((await epilogue).status()).toBe(200);
    });

    await test.step('Server ghi đủ mốc, chương 1 hoàn thành', async () => {
      const response = await page.request.get('api/story', { headers: { Authorization: `Bearer ${persona.token}` } });
      expect(response.status()).toBe(200);
      const story = (await response.json()) as StoryResponse;
      expect(isChapterComplete(CHAPTER_1_STORY.chapter, new StoryProgress(story.beats))).toBe(true);
      await attachScreenshot(page, 'ket-chuong-1');
    });
  });
});
