import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, lte, SQL, sql } from 'drizzle-orm';
import { AppException } from '../../common/exceptions';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import {
  getDateRangeInUtc,
  getDayRangeInUtc,
} from '../../common/utils/date.util';
import type { Database } from '../../database/database.types';
import {
  paymentMethodsTable,
  pendingUploadsTable,
  receiptItemsTable,
  transactionTypesTable,
  transactionsTable,
  type PaymentMethod,
  type Transaction,
  type TransactionType,
} from '../../database/schema';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import type {
  ReceiptItemResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { toTransactionTypeResponse } from './transaction-type.mapper';
import { TransactionTypesService } from './transaction-types.service';

type TransactionRow = {
  transaction: Transaction;
  type: TransactionType | null;
  paymentMethod: PaymentMethod | null;
  hasReceiptItems: boolean;
};

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly uploadsService: UploadsService,
    private readonly transactionTypesService: TransactionTypesService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const typeId = dto.typeId ?? null;
    const paymentMethodId = dto.paymentMethodId ?? null;
    const receiptItems = dto.receiptItems ?? [];

    // S-01 rule 4: mọi id tham chiếu phải là mặc định hoặc của user
    if (typeId !== null) {
      await this.transactionTypesService.assertTypeAllowed(
        typeId,
        dto.flow,
        userId,
      );
    }

    if (paymentMethodId !== null) {
      await this.paymentMethodsService.assertPaymentMethodAllowed(
        paymentMethodId,
        userId,
      );
    }

    const itemTypeIds = new Set(
      receiptItems
        .map((item) => item.typeId)
        .filter((id): id is string => !!id),
    );
    for (const itemTypeId of itemTypeIds) {
      await this.transactionTypesService.assertTypeAllowed(
        itemTypeId,
        dto.flow,
        userId,
      );
    }

    // S-01 rule 5: ảnh phải do chính user upload
    const upload = await this.uploadsService.resolveUploadedImage(
      userId,
      dto.imageUrl,
    );

    const transactionId = await this.db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(transactionsTable)
        .values({
          userId,
          typeId,
          paymentMethodId,
          flow: dto.flow,
          amount: dto.amount,
          description: dto.description ?? null,
          spentAt: new Date(dto.spentAt),
          imageKey: upload.key,
          imageUrl: upload.url,
          contentType: upload.contentType,
          fileSize: upload.size,
        })
        .returning({ id: transactionsTable.id });

      // Ảnh đã được dùng → không còn là ảnh chờ dọn (NF-4)
      await tx
        .delete(pendingUploadsTable)
        .where(
          and(
            eq(pendingUploadsTable.key, upload.key),
            eq(pendingUploadsTable.userId, userId),
          ),
        );

      if (receiptItems.length) {
        await tx.insert(receiptItemsTable).values(
          receiptItems.map((item, position) => ({
            transactionId: transaction.id,
            name: item.name,
            amount: item.amount ?? null,
            typeId: item.typeId ?? null,
            position,
          })),
        );
      }

      return transaction.id;
    });

    return this.findOneForUser(userId, transactionId);
  }

  async findMine(userId: string, query: ListTransactionsQueryDto) {
    return this.findByUserId(userId, query);
  }

  /** Chỉ admin (RolesGuard kiểm tra ở controller). */
  async findByUser(targetUserId: string, query: ListTransactionsQueryDto) {
    return this.findByUserId(targetUserId, query);
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<TransactionResponseDto> {
    const [row] = await this.selectRows().where(
      and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
    );

    if (!row) {
      throw AppException.transactionNotFound(id);
    }

    const items = row.hasReceiptItems
      ? await this.db
          .select()
          .from(receiptItemsTable)
          .where(eq(receiptItemsTable.transactionId, id))
          .orderBy(asc(receiptItemsTable.position))
      : [];

    return {
      ...this.toResponse(row),
      receiptItems: items.map((item): ReceiptItemResponseDto => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        typeId: item.typeId,
      })),
    };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.requireOwnedTransaction(userId, id);

    const nextFlow = dto.flow ?? current.flow;
    const nextTypeId = dto.typeId !== undefined ? dto.typeId : current.typeId;

    if (nextTypeId !== null) {
      await this.transactionTypesService.assertTypeAllowed(
        nextTypeId,
        nextFlow,
        userId,
      );
    }

    await this.db
      .update(transactionsTable)
      .set({
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.flow !== undefined ? { flow: dto.flow } : {}),
        ...(dto.typeId !== undefined ? { typeId: dto.typeId } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      );

    return this.findOneForUser(userId, id);
  }

  async remove(userId: string, id: string) {
    const transaction = await this.requireOwnedTransaction(userId, id);

    await this.uploadsService.deleteObject(userId, transaction.imageKey);

    // receipt_items xoá theo ON DELETE CASCADE
    await this.db
      .delete(transactionsTable)
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      );

    return { deleted: true, id };
  }

  private async findByUserId(
    targetUserId: string,
    query: ListTransactionsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [eq(transactionsTable.userId, targetUserId)];

    if (query.flow) {
      filters.push(eq(transactionsTable.flow, query.flow));
    }

    if (query.typeId) {
      filters.push(eq(transactionsTable.typeId, query.typeId));
    }

    if (query.date) {
      const { start, end } = getDayRangeInUtc(query.date);
      filters.push(gte(transactionsTable.spentAt, start));
      filters.push(lte(transactionsTable.spentAt, end));
    } else if (query.from && query.to) {
      const { start, end } = getDateRangeInUtc(query.from, query.to);
      filters.push(gte(transactionsTable.spentAt, start));
      filters.push(lte(transactionsTable.spentAt, end));
    } else if (query.from || query.to) {
      throw AppException.transactionDateRangeRequired();
    }

    const whereClause = and(...filters);

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(transactionsTable)
      .where(whereClause);

    const rows = await this.selectRows()
      .where(whereClause)
      .orderBy(
        desc(transactionsTable.spentAt),
        desc(transactionsTable.createdAt),
      )
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map((row) => this.toResponse(row)),
      meta: {
        page,
        limit,
        total: Number(totalRow?.total ?? 0),
        ...(query.date ? { date: query.date } : {}),
        ...(query.from && query.to ? { from: query.from, to: query.to } : {}),
      },
    };
  }

  private selectRows() {
    return this.db
      .select({
        transaction: transactionsTable,
        type: transactionTypesTable,
        paymentMethod: paymentMethodsTable,
        hasReceiptItems: sql<boolean>`exists (select 1 from ${receiptItemsTable} where ${receiptItemsTable.transactionId} = ${transactionsTable.id})`,
      })
      .from(transactionsTable)
      .leftJoin(
        transactionTypesTable,
        eq(transactionsTable.typeId, transactionTypesTable.id),
      )
      .leftJoin(
        paymentMethodsTable,
        eq(transactionsTable.paymentMethodId, paymentMethodsTable.id),
      )
      .$dynamic();
  }

  private async requireOwnedTransaction(userId: string, id: string) {
    const [current] = await this.db
      .select()
      .from(transactionsTable)
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      );

    if (!current) {
      throw AppException.transactionNotFound(id);
    }

    return current;
  }

  private toResponse(row: TransactionRow): TransactionResponseDto {
    const { transaction, type, paymentMethod } = row;

    return {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description,
      flow: transaction.flow,
      spentAt: transaction.spentAt,
      type: type ? toTransactionTypeResponse(type) : null,
      paymentMethod: paymentMethod
        ? {
            id: paymentMethod.id,
            code: paymentMethod.code,
            name: paymentMethod.name,
            iconKey: paymentMethod.iconKey,
            color: paymentMethod.color,
          }
        : null,
      hasReceiptItems: Boolean(row.hasReceiptItems),
      imageKey: transaction.imageKey,
      imageUrl: transaction.imageUrl,
      contentType: transaction.contentType,
      fileSize: transaction.fileSize,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
