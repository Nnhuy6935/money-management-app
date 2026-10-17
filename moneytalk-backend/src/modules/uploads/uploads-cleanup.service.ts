import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { and, asc, eq, lt } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import type { Database } from '../../database/database.types';
import { pendingUploadsTable, transactionsTable } from '../../database/schema';
import { UploadsService } from './uploads.service';
import {
  ORPHAN_UPLOAD_TTL_MS,
  UPLOAD_CLEANUP_BATCH_SIZE,
  UPLOAD_CLEANUP_INTERVAL_MS,
} from './uploads.constants';

/**
 * NF-4: xoá ảnh upload quá {@link ORPHAN_UPLOAD_TTL_MS} mà không gắn vào giao dịch nào.
 * Chạy lúc khởi động rồi mỗi {@link UPLOAD_CLEANUP_INTERVAL_MS} trong lúc app thức.
 * Tắt bằng UPLOAD_CLEANUP_ENABLED=false (mặc định tắt khi NODE_ENV=test).
 */
@Injectable()
export class UploadsCleanupService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(UploadsCleanupService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly uploadsService: UploadsService,
  ) {}

  onApplicationBootstrap() {
    const flag = process.env.UPLOAD_CLEANUP_ENABLED;
    const enabled =
      flag === undefined || flag === ''
        ? process.env.NODE_ENV !== 'test'
        : flag === 'true';
    if (!enabled) return;

    const tick = () => void this.runOnce();
    tick();
    this.timer = setInterval(tick, UPLOAD_CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Dọn 1 lượt. Trả về số ảnh đã xoá. Lỗi từng ảnh được bỏ qua, lượt sau thử lại. */
  async runOnce(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let removed = 0;

    try {
      const expired = await this.db
        .select()
        .from(pendingUploadsTable)
        .where(
          lt(
            pendingUploadsTable.createdAt,
            new Date(now.getTime() - ORPHAN_UPLOAD_TTL_MS),
          ),
        )
        .orderBy(asc(pendingUploadsTable.createdAt))
        .limit(UPLOAD_CLEANUP_BATCH_SIZE);

      for (const upload of expired) {
        try {
          // Phòng hờ: ảnh đã gắn vào giao dịch thì chỉ bỏ dòng theo dõi, giữ ảnh
          const [used] = await this.db
            .select({ id: transactionsTable.id })
            .from(transactionsTable)
            .where(
              and(
                eq(transactionsTable.userId, upload.userId),
                eq(transactionsTable.imageKey, upload.key),
              ),
            )
            .limit(1);

          if (!used) {
            await this.uploadsService.deleteObject(upload.userId, upload.key);
            removed++;
          }

          await this.db
            .delete(pendingUploadsTable)
            .where(eq(pendingUploadsTable.key, upload.key));
        } catch (error) {
          this.logger.warn(
            `Không dọn được ảnh ${upload.key}: ${(error as Error).message}`,
          );
        }
      }

      if (removed) {
        this.logger.log(`Đã xoá ${removed} ảnh không gắn vào giao dịch`);
      }
    } catch (error) {
      this.logger.error('Dọn ảnh upload thất bại', error);
    } finally {
      this.running = false;
    }

    return removed;
  }
}
