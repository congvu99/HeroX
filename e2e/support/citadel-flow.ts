import type { Locator, Page } from '@playwright/test';
import { BUILDINGS, type BuildingId } from '../../shared/src/data/citadel-catalog.js';
import { START_LEVEL_ID } from './battle-flow.js';
import { buildingDoor, walkInto, waitForWorldLevel } from './game-driver.js';

/** Bước tới cửa công trình ở Lexhold (level hero xuất hiện khi vào game); trả hộp thoại panel vừa mở. */
export async function openBuilding(page: Page, buildingId: BuildingId): Promise<Locator> {
  await waitForWorldLevel(page, START_LEVEL_ID);
  const dialog = page.getByRole('dialog', { name: BUILDINGS[buildingId].name });
  await walkInto(page, buildingDoor(START_LEVEL_ID, buildingId), 'up', () => dialog.waitFor());
  return dialog;
}
