import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNull,
  max,
  ne,
  or,
  SQL,
} from 'drizzle-orm';
import {
  DEFAULT_TRANSACTION_TYPES,
  FALLBACK_TRANSACTION_TYPE_CODE,
  TransactionFlow,
} from '../../common/constants/transaction.constants';
import { AppException } from '../../common/exceptions';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { normalizeHexColor } from '../../common/utils/color.util';
import { slugifyCode } from '../../common/utils/slug.util';
import type { Database } from '../../database/database.types';
import {
  receiptItemsTable,
  transactionsTable,
  transactionTypesTable,
  type TransactionType,
} from '../../database/schema';
import { CreateTransactionTypeDto } from './dto/create-transaction-type.dto';
import { ListTransactionTypesQueryDto } from './dto/list-transaction-types-query.dto';
import { UpdateTransactionTypeDto } from './dto/update-transaction-type.dto';
import { toTransactionTypeResponse } from './transaction-type.mapper';

/** Executor dùng được cả trong lẫn ngoài DB transaction. */
type Executor = Pick<Database, 'select'>;

@Injectable()
export class TransactionTypesService implements OnModuleInit {
  private readonly logger = new Logger(TransactionTypesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  /** Loại mặc định + loại custom của user (S-01). */
  private visibleTo(userId: string): SQL {
    return or(
      isNull(transactionTypesTable.userId),
      eq(transactionTypesTable.userId, userId),
    )!;
  }

  async findAll(userId: string, query: ListTransactionTypesQueryDto) {
    const filters: SQL[] = [this.visibleTo(userId)];

    if (query.flow) {
      filters.push(eq(transactionTypesTable.flow, query.flow));
    }

    const rows = await this.db
      .select()
      .from(transactionTypesTable)
      .where(and(...filters))
      .orderBy(
        asc(transactionTypesTable.sortOrder),
        asc(transactionTypesTable.createdAt),
      );

    return rows.map(toTransactionTypeResponse);
  }

  async findVisible(
    userId: string,
    id: string,
    executor: Executor = this.db,
  ): Promise<TransactionType | null> {
    const [type] = await executor
      .select()
      .from(transactionTypesTable)
      .where(and(eq(transactionTypesTable.id, id), this.visibleTo(userId)));

    return type ?? null;
  }

  async create(userId: string, dto: CreateTransactionTypeDto) {
    const code = dto.code?.trim() || slugifyCode(dto.name);

    const [existing] = await this.db
      .select({ id: transactionTypesTable.id })
      .from(transactionTypesTable)
      .where(
        and(
          eq(transactionTypesTable.code, code),
          eq(transactionTypesTable.flow, dto.flow),
          eq(transactionTypesTable.userId, userId),
        ),
      );

    if (existing) {
      throw AppException.transactionTypeDuplicate(code, dto.flow);
    }

    const color = normalizeHexColor(dto.color);
    await this.assertColorAvailable(userId, color);

    const [{ maxSortOrder }] = await this.db
      .select({ maxSortOrder: max(transactionTypesTable.sortOrder) })
      .from(transactionTypesTable)
      .where(this.visibleTo(userId));

    const [created] = await this.db
      .insert(transactionTypesTable)
      .values({
        userId,
        code,
        name: dto.name,
        flow: dto.flow,
        isDefault: false,
        description: dto.description ?? null,
        iconKey: dto.iconKey,
        color,
        sortOrder: (maxSortOrder ?? -1) + 1,
      })
      .returning();

    return toTransactionTypeResponse(created);
  }

  async update(userId: string, id: string, dto: UpdateTransactionTypeDto) {
    await this.requireEditable(userId, id);

    const color =
      dto.color !== undefined ? normalizeHexColor(dto.color) : undefined;
    if (color) {
      await this.assertColorAvailable(userId, color, id);
    }

    const [updated] = await this.db
      .update(transactionTypesTable)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.iconKey !== undefined ? { iconKey: dto.iconKey } : {}),
        ...(color ? { color } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactionTypesTable.id, id),
          eq(transactionTypesTable.userId, userId),
        ),
      )
      .returning();

    return toTransactionTypeResponse(updated);
  }

  async getDeleteImpact(userId: string, id: string) {
    const type = await this.requireEditable(userId, id);
    const replacement = await this.requireFallback(type.flow);

    const [row] = await this.db
      .select({ total: count() })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.typeId, id),
        ),
      );

    return {
      transactionCount: Number(row?.total ?? 0),
      replacement: {
        id: replacement.id,
        code: replacement.code,
        name: replacement.name,
      },
    };
  }

  /** N-04: chuyển giao dịch (và receipt item) của user sang `other` rồi xoá loại. */
  async remove(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const type = await this.requireEditable(userId, id, tx);
      const replacement = await this.requireFallback(type.flow, tx);

      const moved = await tx
        .update(transactionsTable)
        .set({ typeId: replacement.id, updatedAt: new Date() })
        .where(
          and(
            eq(transactionsTable.userId, userId),
            eq(transactionsTable.typeId, id),
          ),
        )
        .returning({ id: transactionsTable.id });

      const ownTransactionIds = tx
        .select({ id: transactionsTable.id })
        .from(transactionsTable)
        .where(eq(transactionsTable.userId, userId));

      await tx
        .update(receiptItemsTable)
        .set({ typeId: replacement.id })
        .where(
          and(
            eq(receiptItemsTable.typeId, id),
            inArray(receiptItemsTable.transactionId, ownTransactionIds),
          ),
        );

      await tx
        .delete(transactionTypesTable)
        .where(
          and(
            eq(transactionTypesTable.id, id),
            eq(transactionTypesTable.userId, userId),
          ),
        );

      return { deleted: true, movedCount: moved.length };
    });
  }

  /**
   * S-01 rule 4 + D1 (strict): loại phải là mặc định hoặc của user, và cùng flow.
   */
  async assertTypeAllowed(
    typeId: string,
    flow: TransactionFlow,
    userId: string,
  ) {
    const type = await this.findVisible(userId, typeId);

    if (!type) {
      throw AppException.invalidTypeReference();
    }

    if (type.flow !== flow) {
      throw AppException.transactionTypeFlowMismatch(
        type.name,
        type.flow,
        flow,
      );
    }
  }

  /** 404 nếu không thấy / của user khác; 403 nếu là loại mặc định. */
  private async requireEditable(
    userId: string,
    id: string,
    executor: Executor = this.db,
  ) {
    const type = await this.findVisible(userId, id, executor);

    if (!type) {
      throw AppException.transactionTypeNotFound(id);
    }

    if (type.isDefault || type.userId === null) {
      throw AppException.defaultTypeReadOnly();
    }

    return type;
  }

  private async requireFallback(
    flow: TransactionFlow,
    executor: Executor = this.db,
  ) {
    const [fallback] = await executor
      .select()
      .from(transactionTypesTable)
      .where(
        and(
          isNull(transactionTypesTable.userId),
          eq(transactionTypesTable.code, FALLBACK_TRANSACTION_TYPE_CODE),
          eq(transactionTypesTable.flow, flow),
        ),
      );

    if (!fallback) {
      throw AppException.fallbackTypeMissing(flow);
    }

    return fallback;
  }

  /** M-06: màu không trùng loại custom của user + loại mặc định. */
  private async assertColorAvailable(
    userId: string,
    color: string,
    excludeId?: string,
  ) {
    const filters: SQL[] = [
      this.visibleTo(userId),
      eq(transactionTypesTable.color, color),
    ];
    if (excludeId) {
      filters.push(ne(transactionTypesTable.id, excludeId));
    }

    const [clash] = await this.db
      .select({ id: transactionTypesTable.id })
      .from(transactionTypesTable)
      .where(and(...filters))
      .limit(1);

    if (clash) {
      throw AppException.transactionTypeColorInUse(color);
    }
  }

  /** Tạo mới hoặc cập nhật field hiển thị cho loại mặc định (M-07). */
  private async seedDefaults() {
    for (const item of DEFAULT_TRANSACTION_TYPES) {
      const display = {
        name: item.name,
        description: item.description,
        iconKey: item.iconKey,
        color: item.color,
        sortOrder: item.sortOrder,
        isDefault: true,
      };

      const [existing] = await this.db
        .select()
        .from(transactionTypesTable)
        .where(
          and(
            eq(transactionTypesTable.code, item.code),
            eq(transactionTypesTable.flow, item.flow),
            isNull(transactionTypesTable.userId),
          ),
        );

      if (!existing) {
        await this.db
          .insert(transactionTypesTable)
          .values({ code: item.code, flow: item.flow, ...display });
        this.logger.log(`Seeded transaction type: ${item.flow}/${item.code}`);
        continue;
      }

      const changed = (Object.keys(display) as (keyof typeof display)[]).some(
        (key) => existing[key] !== display[key],
      );

      if (changed) {
        await this.db
          .update(transactionTypesTable)
          .set({ ...display, updatedAt: new Date() })
          .where(eq(transactionTypesTable.id, existing.id));
        this.logger.log(`Updated transaction type: ${item.flow}/${item.code}`);
      }
    }
  }
}
