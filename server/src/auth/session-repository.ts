import type { Queryable } from '../db/pool.js';
import { ENG_SESSION_IDLE_DAYS, type SessionLookup, type SessionUser } from './eng-session.js';

interface SessionUserRow {
  readonly user_id: number;
  readonly username: string;
}

/** Đọc phiên LingoBrain ở `public.sessions` + `public.users`; chỉ SELECT. */
export class PgSessionRepository implements SessionLookup {
  constructor(private readonly db: Queryable) {}

  async findActiveSessionUser(tokenHash: string): Promise<SessionUser | null> {
    const result = await this.db.query<SessionUserRow>(
      `SELECT session.user_id, account.username
       FROM public.sessions AS session
       JOIN public.users AS account ON account.id = session.user_id
       WHERE session.token_hash = $1
         AND session.last_used_at > now() - make_interval(days => $2)`,
      [tokenHash, ENG_SESSION_IDLE_DAYS],
    );
    const row = result.rows[0];
    return row === undefined ? null : { userId: row.user_id, username: row.username };
  }
}
