import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, asc, count, eq, isNull, max, ne, or, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { DEFAULT_PAYMENT_METHOD } from '../../common/constants/payment-method.constants';
import { AppException } from '../../common/exceptions';
import { normalizeHexColor } from '../../common/utils/color.util';
import { slugifyCode } from '../../common/utils/slug.util';
import type { Database } from '../../database/database.types';
import {
  paymentMethodsTable,
  transactionsTable,
  type PaymentMethod,
} from '../../database/schema';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { toPaymentMethodResponse } from './payment-method.mapper';

type Executor = Pick<Database, 'select'>;

@Injectable()
export class PaymentMethodsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async onModuleInit() {
    await this.seedDefault();
  }

  /** Phương thức mặc định + của user (S-01). */
  private visibleTo(userId: string): SQL {
    return or(
      isNull(paymentMethodsTable.userId),
      eq(paymentMethodsTable.userId, userId),
    )!;
  }

  async findAll(userId: string) {
    const rows = await this.db
      .select()
      .from(paymentMethodsTable)
      .where(this.visibleTo(userId))
      .orderBy(
        asc(paymentMethodsTable.sortOrder),
        asc(paymentMethodsTable.createdAt),
      );

    return rows.map(toPaymentMethodResponse);
  }

  async findVisible(
    userId: string,
    id: string,
    executor: Executor = this.db,
  ): Promise<PaymentMethod | null> {
    const [method] = await executor
      .select()
      .from(paymentMethodsTable)
      .where(and(eq(paymentMethodsTable.id, id), this.visibleTo(userId)));

    return method ?? null;
  }

  /** S-01 rule 4: phương thức phải là mặc định hoặc của user. */
  async assertPaymentMethodAllowed(id: string, userId: string) {
    const method = await this.findVisible(userId, id);
    if (!method) {
      throw AppException.invalidPaymentMethodReference();
    }
  }

  async create(userId: string, dto: CreatePaymentMethodDto) {
    const color = normalizeHexColor(dto.color);
    await this.assertColorAvailable(userId, color);

    const code = await this.generateCode(userId, dto.name);

    const [{ maxSortOrder }] = await this.db
      .select({ maxSortOrder: max(paymentMethodsTable.sortOrder) })
      .from(paymentMethodsTable)
      .where(this.visibleTo(userId));

    const [created] = await this.db
      .insert(paymentMethodsTable)
      .values({
        userId,
        code,
        name: dto.name,
        description: dto.description ?? null,
        iconKey: dto.iconKey,
        color,
        isDefault: false,
        sortOrder: (maxSortOrder ?? -1) + 1,
      })
      .returning();

    return toPaymentMethodResponse(created);
  }

  async update(userId: string, id: string, dto: UpdatePaymentMethodDto) {
    await this.requireEditable(userId, id);

    const color =
      dto.color !== undefined ? normalizeHexColor(dto.color) : undefined;
    if (color) {
      await this.assertColorAvailable(userId, color, id);
    }

    const [updated] = await this.db
      .update(paymentMethodsTable)
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
          eq(paymentMethodsTable.id, id),
          eq(paymentMethodsTable.userId, userId),
        ),
      )
      .returning();

    return toPaymentMethodResponse(updated);
  }

  async getDeleteImpact(userId: string, id: string) {
    await this.requireEditable(userId, id);
    const replacement = await this.requireFallback();

    const [row] = await this.db
      .select({ total: count() })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.paymentMethodId, id),
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

  /** N-08: chuyển giao dịch của user sang `cash` rồi xoá. */
  async remove(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await this.requireEditable(userId, id, tx);
      const replacement = await this.requireFallback(tx);

      const moved = await tx
        .update(transactionsTable)
        .set({ paymentMethodId: replacement.id, updatedAt: new Date() })
        .where(
          and(
            eq(transactionsTable.userId, userId),
            eq(transactionsTable.paymentMethodId, id),
          ),
        )
        .returning({ id: transactionsTable.id });

      await tx
        .delete(paymentMethodsTable)
        .where(
          and(
            eq(paymentMethodsTable.id, id),
            eq(paymentMethodsTable.userId, userId),
          ),
        );

      return { deleted: true, movedCount: moved.length };
    });
  }

  private async requireEditable(
    userId: string,
    id: string,
    executor: Executor = this.db,
  ) {
    const method = await this.findVisible(userId, id, executor);

    if (!method) {
      throw AppException.paymentMethodNotFound(id);
    }

    if (method.isDefault || method.userId === null) {
      throw AppException.defaultPaymentMethodReadOnly();
    }

    return method;
  }

  private async requireFallback(executor: Executor = this.db) {
    const [fallback] = await executor
      .select()
      .from(paymentMethodsTable)
      .where(
        and(
          isNull(paymentMethodsTable.userId),
          eq(paymentMethodsTable.code, DEFAULT_PAYMENT_METHOD.code),
        ),
      );

    if (!fallback) {
      throw AppException.fallbackPaymentMethodMissing();
    }

    return fallback;
  }

  private async assertColorAvailable(
    userId: string,
    color: string,
    excludeId?: string,
  ) {
    const filters: SQL[] = [
      this.visibleTo(userId),
      eq(paymentMethodsTable.color, color),
    ];
    if (excludeId) {
      filters.push(ne(paymentMethodsTable.id, excludeId));
    }

    const [clash] = await this.db
      .select({ id: paymentMethodsTable.id })
      .from(paymentMethodsTable)
      .where(and(...filters))
      .limit(1);

    if (clash) {
      throw AppException.paymentMethodColorInUse(color);
    }
  }

  /** `code` sinh từ name, thêm hậu tố `_2`, `_3`… nếu trùng trong tài khoản. */
  private async generateCode(userId: string, name: string) {
    const base = slugifyCode(name).slice(0, 45);
    const rows = await this.db
      .select({ code: paymentMethodsTable.code })
      .from(paymentMethodsTable)
      .where(this.visibleTo(userId));
    const taken = new Set(rows.map((row) => row.code));

    let code = base;
    for (let n = 2; taken.has(code); n++) {
      code = `${base}_${n}`;
    }
    return code;
  }

  private async seedDefault() {
    const { code, ...display } = DEFAULT_PAYMENT_METHOD;

    const [existing] = await this.db
      .select()
      .from(paymentMethodsTable)
      .where(
        and(
          isNull(paymentMethodsTable.userId),
          eq(paymentMethodsTable.code, code),
        ),
      );

    if (!existing) {
      await this.db
        .insert(paymentMethodsTable)
        .values({ code, ...display, isDefault: true });
      this.logger.log(`Seeded payment method: ${code}`);
    }
  }
}
