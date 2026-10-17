import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { AppException } from '../../common/exceptions';
import type { Database } from '../../database/database.types';
import { idempotencyKeysTable } from '../../database/schema';

/** Kết quả được giữ để replay trong 24h. */
const RETENTION_MS = 24 * 60 * 60 * 1000;
/** Request "đang xử lý" quá lâu coi như đã chết (vd server restart giữa chừng). */
const STALE_IN_PROGRESS_MS = 60 * 1000;

@Injectable()
export class IdempotencyService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * NF-3. Chạy `handler` tối đa 1 lần cho mỗi (user, key).
   * - Cùng key + cùng body, đã xong → trả lại kết quả cũ, không chạy lại.
   * - Cùng key + khác body → 422 IDEMPOTENCY_KEY_REUSED.
   * - Cùng key, request trước chưa xong → 409 IDEMPOTENCY_KEY_IN_PROGRESS.
   * - `handler` lỗi → giải phóng key để client gửi lại được.
   */
  async run<T>(
    userId: string,
    key: string,
    body: unknown,
    handler: () => Promise<T>,
  ): Promise<T> {
    const requestHash = createHash('sha256')
      .update(JSON.stringify(body ?? null))
      .digest('hex');

    await this.purgeExpired(userId, key);

    const [claimed] = await this.db
      .insert(idempotencyKeysTable)
      .values({ userId, key, requestHash })
      .onConflictDoNothing()
      .returning({ id: idempotencyKeysTable.id });

    if (!claimed) {
      const [existing] = await this.db
        .select()
        .from(idempotencyKeysTable)
        .where(this.matchKey(userId, key));

      if (!existing) {
        // Bản ghi vừa bị giải phóng giữa 2 câu query — coi như đang bận
        throw AppException.idempotencyKeyInProgress();
      }
      if (existing.requestHash !== requestHash) {
        throw AppException.idempotencyKeyReused();
      }
      if (existing.response === null) {
        throw AppException.idempotencyKeyInProgress();
      }
      return existing.response as T;
    }

    try {
      const result = await handler();
      await this.db
        .update(idempotencyKeysTable)
        .set({ response: result })
        .where(eq(idempotencyKeysTable.id, claimed.id));
      return result;
    } catch (error) {
      await this.db
        .delete(idempotencyKeysTable)
        .where(eq(idempotencyKeysTable.id, claimed.id));
      throw error;
    }
  }

  private matchKey(userId: string, key: string) {
    return and(
      eq(idempotencyKeysTable.userId, userId),
      eq(idempotencyKeysTable.key, key),
    );
  }

  /** Xoá key này nếu đã hết hạn giữ, hoặc đang "xử lý" quá lâu. */
  private async purgeExpired(userId: string, key: string) {
    const now = Date.now();

    await this.db
      .delete(idempotencyKeysTable)
      .where(
        and(
          this.matchKey(userId, key),
          lt(idempotencyKeysTable.createdAt, new Date(now - RETENTION_MS)),
        ),
      );

    await this.db
      .delete(idempotencyKeysTable)
      .where(
        and(
          this.matchKey(userId, key),
          isNull(idempotencyKeysTable.response),
          lt(
            idempotencyKeysTable.createdAt,
            new Date(now - STALE_IN_PROGRESS_MS),
          ),
        ),
      );
  }
}
