import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { AppException } from '../../common/exceptions';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { UserRole } from '../../common/constants/roles';
import {
  getDateRangeInUtc,
  getDayRangeInUtc,
} from '../../common/utils/date.util';
import type { Database } from '../../database/database.types';
import {
  transactionTypesTable,
  transactionsTable,
} from '../../database/schema';
import { UploadsService } from '../uploads/uploads.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionTypesService } from './transaction-types.service';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly uploadsService: UploadsService,
    private readonly transactionTypesService: TransactionTypesService,
  ) {}

  async create(userId: number, dto: CreateTransactionDto) {
    const typeId = dto.typeId ?? null;

    if (typeId !== null) {
      await this.transactionTypesService.assertTypeAllowed(
        typeId,
        dto.flow,
        userId,
      );
    }

    const upload = await this.uploadsService.resolveUploadedImage(
      userId,
      dto.imageUrl,
    );

    const [transaction] = await this.db
      .insert(transactionsTable)
      .values({
        userId,
        typeId,
        flow: dto.flow,
        amount: dto.amount.toFixed(2),
        description: dto.description,
        imageKey: upload.key,
        imageUrl: upload.url,
        contentType: upload.contentType,
        fileSize: upload.size,
      })
      .returning();

    return this.findOneForUser(userId, transaction.id);
  }

  async findMine(userId: number, query: ListTransactionsQueryDto) {
    return this.findByUserId(userId, userId, UserRole.USER, query);
  }

  async findByUser(
    requesterId: number,
    requesterRole: UserRole,
    targetUserId: number,
    query: ListTransactionsQueryDto,
  ) {
    return this.findByUserId(requesterId, targetUserId, requesterRole, query);
  }

  async findOneForUser(userId: number, id: number) {
    const rows = await this.db
      .select({
        transaction: transactionsTable,
        type: transactionTypesTable,
      })
      .from(transactionsTable)
      .leftJoin(
        transactionTypesTable,
        eq(transactionsTable.typeId, transactionTypesTable.id),
      )
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      );

    const row = rows[0];
    if (!row) {
      throw AppException.transactionNotFound(id);
    }

    return this.toResponse(row.transaction, row.type);
  }

  async update(userId: number, id: number, dto: UpdateTransactionDto) {
    const current = await this.requireOwnedTransaction(userId, id);

    const nextFlow = dto.flow ?? current.flow;
    const nextTypeId =
      dto.typeId !== undefined ? dto.typeId : current.typeId;

    if (nextTypeId !== null) {
      await this.transactionTypesService.assertTypeAllowed(
        nextTypeId,
        nextFlow,
        userId,
      );
    }

    const [updated] = await this.db
      .update(transactionsTable)
      .set({
        ...(dto.amount !== undefined ? { amount: dto.amount.toFixed(2) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.flow !== undefined ? { flow: dto.flow } : {}),
        ...(dto.typeId !== undefined ? { typeId: dto.typeId } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      )
      .returning();

    return this.findOneForUser(userId, updated.id);
  }

  async remove(userId: number, id: number) {
    const transaction = await this.findOneForUser(userId, id);

    await this.uploadsService.deleteObject(userId, transaction.imageKey);

    await this.db
      .delete(transactionsTable)
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      );

    return { deleted: true, id };
  }

  private async findByUserId(
    requesterId: number,
    targetUserId: number,
    requesterRole: UserRole,
    query: ListTransactionsQueryDto,
  ) {
    if (requesterRole !== UserRole.ADMIN && requesterId !== targetUserId) {
      throw AppException.transactionAccessDenied();
    }

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
      filters.push(gte(transactionsTable.createdAt, start));
      filters.push(lte(transactionsTable.createdAt, end));
    } else if (query.from && query.to) {
      const { start, end } = getDateRangeInUtc(query.from, query.to);
      filters.push(gte(transactionsTable.createdAt, start));
      filters.push(lte(transactionsTable.createdAt, end));
    } else if (query.from || query.to) {
      throw AppException.transactionDateRangeRequired();
    }

    const whereClause = and(...filters);

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(transactionsTable)
      .where(whereClause);

    const rows = await this.db
      .select({
        transaction: transactionsTable,
        type: transactionTypesTable,
      })
      .from(transactionsTable)
      .leftJoin(
        transactionTypesTable,
        eq(transactionsTable.typeId, transactionTypesTable.id),
      )
      .where(whereClause)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map((row) => this.toResponse(row.transaction, row.type)),
      meta: {
        page,
        limit,
        total: Number(totalRow?.total ?? 0),
        ...(query.date ? { date: query.date } : {}),
        ...(query.from && query.to ? { from: query.from, to: query.to } : {}),
      },
    };
  }

  private async requireOwnedTransaction(userId: number, id: number) {
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

  private toResponse(
    transaction: typeof transactionsTable.$inferSelect,
    type: typeof transactionTypesTable.$inferSelect | null,
  ) {
    return {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description,
      flow: transaction.flow,
      type: type
        ? {
            id: type.id,
            code: type.code,
            name: type.name,
            flow: type.flow,
            isDefault: type.isDefault,
          }
        : null,
      imageKey: transaction.imageKey,
      imageUrl: transaction.imageUrl,
      contentType: transaction.contentType,
      fileSize: transaction.fileSize,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
