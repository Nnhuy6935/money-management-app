import { HttpException, Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  SQL,
  sql,
} from 'drizzle-orm';
import { AppErrorCode, AppException } from '../../common/exceptions';
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
  usersTable,
  type PaymentMethod,
  type Transaction,
  type TransactionType,
} from '../../database/schema';
import {
  GroupAccessService,
  type Executor,
} from '../groups/group-access.service';
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
  createdBy: { id: string; name: string | null };
};

/** Giao dịch cá nhân: của user và không thuộc nhóm nào. */
const personalScope = (userId: string) =>
  and(eq(transactionsTable.userId, userId), isNull(transactionsTable.groupId))!;

const groupScope = (groupId: string) => eq(transactionsTable.groupId, groupId);

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly uploadsService: UploadsService,
    private readonly transactionTypesService: TransactionTypesService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly groupAccess: GroupAccessService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const typeId = dto.typeId ?? null;
    const groupId = dto.groupId ?? null;
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
      // Giao dịch nhóm: phải là thành viên của nhóm ACTIVE; khoá share để không chen với giải tán
      if (groupId !== null) {
        await this.requireGroupForCreate(userId, groupId, tx);
      }

      const [transaction] = await tx
        .insert(transactionsTable)
        .values({
          userId,
          groupId,
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

    return this.findOneWhere(
      eq(transactionsTable.id, transactionId),
      transactionId,
    );
  }

  /** Chỉ giao dịch cá nhân — không lẫn giao dịch nhóm. */
  async findMine(userId: string, query: ListTransactionsQueryDto) {
    return this.list(personalScope(userId), query);
  }

  /** Chỉ admin (RolesGuard kiểm tra ở controller). Giao dịch cá nhân của user đó. */
  async findByUser(targetUserId: string, query: ListTransactionsQueryDto) {
    return this.list(personalScope(targetUserId), query);
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<TransactionResponseDto> {
    return this.findOneWhere(
      and(eq(transactionsTable.id, id), personalScope(userId))!,
      id,
    );
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.requireTransaction(
      this.db,
      and(eq(transactionsTable.id, id), personalScope(userId))!,
      id,
    );

    await this.applyUpdate(this.db, current, userId, dto);
    return this.findOneForUser(userId, id);
  }

  async remove(userId: string, id: string) {
    const transaction = await this.requireTransaction(
      this.db,
      and(eq(transactionsTable.id, id), personalScope(userId))!,
      id,
    );

    await this.uploadsService.deleteObject(userId, transaction.imageKey);

    // receipt_items xoá theo ON DELETE CASCADE
    await this.db
      .delete(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id));

    return { deleted: true, id };
  }

  /** Giao dịch của nhóm — chỉ thành viên đang hoạt động của nhóm ACTIVE. */
  async findInGroup(
    userId: string,
    groupId: string,
    query: ListTransactionsQueryDto,
  ) {
    await this.groupAccess.requireActiveMembership(userId, groupId);
    return this.list(groupScope(groupId), query);
  }

  async findOneInGroup(userId: string, groupId: string, id: string) {
    await this.groupAccess.requireActiveMembership(userId, groupId);
    return this.findOneWhere(
      and(eq(transactionsTable.id, id), groupScope(groupId))!,
      id,
    );
  }

  /** Chỉ người tạo được sửa; nhóm phải ACTIVE. Không đổi được groupId. */
  async updateInGroup(
    userId: string,
    groupId: string,
    id: string,
    dto: UpdateTransactionDto,
  ) {
    await this.db.transaction(async (tx) => {
      const current = await this.requireGroupTransactionForWrite(
        tx,
        userId,
        groupId,
        id,
      );
      await this.applyUpdate(tx, current, userId, dto);
    });

    return this.findOneInGroup(userId, groupId, id);
  }

  /** Chỉ người tạo được xoá; nhóm phải ACTIVE. */
  async removeInGroup(userId: string, groupId: string, id: string) {
    const transaction = await this.db.transaction(async (tx) => {
      const current = await this.requireGroupTransactionForWrite(
        tx,
        userId,
        groupId,
        id,
      );
      await tx
        .delete(transactionsTable)
        .where(eq(transactionsTable.id, current.id));
      return current;
    });

    // Xoá ảnh sau khi xoá giao dịch thành công (ảnh do chính người tạo upload)
    await this.uploadsService.deleteObject(userId, transaction.imageKey);

    return { deleted: true, id };
  }

  private async requireGroupForCreate(
    userId: string,
    groupId: string,
    tx: Executor,
  ) {
    try {
      await this.groupAccess.requireActiveMembership(userId, groupId, {
        executor: tx,
        lock: 'share',
      });
    } catch (error) {
      // groupId gửi trong body: cùng kiểu lỗi với typeId / paymentMethodId sai
      if (
        error instanceof HttpException &&
        (error.getResponse() as { code?: string }).code ===
          AppErrorCode.GROUP_NOT_FOUND
      ) {
        throw AppException.invalidGroupReference();
      }
      throw error;
    }
  }

  private async requireGroupTransactionForWrite(
    tx: Executor,
    userId: string,
    groupId: string,
    id: string,
  ) {
    await this.groupAccess.requireActiveMembership(userId, groupId, {
      executor: tx,
      lock: 'share',
    });

    const current = await this.requireTransaction(
      tx,
      and(eq(transactionsTable.id, id), groupScope(groupId))!,
      id,
    );

    if (current.userId !== userId) {
      throw AppException.transactionNotCreator();
    }
    return current;
  }

  private async applyUpdate(
    executor: Pick<Database, 'update'>,
    current: Transaction,
    userId: string,
    dto: UpdateTransactionDto,
  ) {
    const nextFlow = dto.flow ?? current.flow;
    const nextTypeId = dto.typeId !== undefined ? dto.typeId : current.typeId;

    // Loại phải là mặc định hoặc của người tạo giao dịch (= user hiện tại)
    if (nextTypeId !== null) {
      await this.transactionTypesService.assertTypeAllowed(
        nextTypeId,
        nextFlow,
        userId,
      );
    }

    await executor
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
      .where(eq(transactionsTable.id, current.id));
  }

  private async findOneWhere(
    where: SQL,
    id: string,
  ): Promise<TransactionResponseDto> {
    const [row] = await this.selectRows().where(where);

    if (!row) {
      throw AppException.transactionNotFound(id);
    }

    const items = row.hasReceiptItems
      ? await this.db
          .select()
          .from(receiptItemsTable)
          .where(eq(receiptItemsTable.transactionId, row.transaction.id))
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

  private async list(scope: SQL, query: ListTransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [scope];

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
        createdBy: { id: usersTable.id, name: usersTable.name },
      })
      .from(transactionsTable)
      .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
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

  private async requireTransaction(executor: Executor, where: SQL, id: string) {
    const [current] = await executor
      .select()
      .from(transactionsTable)
      .where(where);

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
      groupId: transaction.groupId,
      createdBy: row.createdBy,
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
