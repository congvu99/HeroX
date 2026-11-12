import type { Queryable } from './pool.js';

/**
 * Xoá nhân vật (và dữ liệu con qua ON DELETE CASCADE) của tài khoản LingoBrain đã bị xoá.
 * Bỏ qua khi `public.users` rỗng: nhiều khả năng đang trỏ nhầm database, xoá lúc đó sẽ mất sạch dữ liệu game.
 * @returns số nhân vật đã xoá.
 */
export async function purgeHeroesOfDeletedUsers(db: Queryable): Promise<number> {
  const users = await db.query<{ has_users: boolean }>('SELECT EXISTS (SELECT 1 FROM public.users) AS has_users');
  if (users.rows[0]?.has_users !== true) return 0;
  const deleted = await db.query<{ user_id: number }>(
    `DELETE FROM herox.heroes AS hero
     WHERE NOT EXISTS (SELECT 1 FROM public.users AS account WHERE account.id = hero.user_id)
     RETURNING hero.user_id`,
  );
  return deleted.rows.length;
}
