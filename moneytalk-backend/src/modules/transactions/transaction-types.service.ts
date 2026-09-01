import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { and, asc, eq, isNull, or, SQL } from 'drizzle-orm';
import {
  DEFAULT_EXPENSE_TRANSACTION_TYPES,
  DEFAULT_INCOME_TRANSACTION_TYPES,
  TransactionFlow,
} from '../../common/constants/transaction.constants';
import { AppException } from '../../common/exceptions';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { slugifyCode } from '../../common/utils/slug.util';
import type { Database } from '../../database/database.types';
import { transactionTypesTable } from '../../database/schema';
import { CreateTransactionTypeDto } from './dto/create-transaction-type.dto';
import { ListTransactionTypesQueryDto } from './dto/list-transaction-types-query.dto';

@Injectable()
export class TransactionTypesService implements OnModuleInit {
  private readonly logger = new Logger(TransactionTypesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  findAll(userId: string, query: ListTransactionTypesQueryDto) {
    const filters: SQL[] = [
      or(
        isNull(transactionTypesTable.userId),
        eq(transactionTypesTable.userId, userId),
      )!,
    ];

    if (query.flow) {
      filters.push(eq(transactionTypesTable.flow, query.flow));
    }

    return this.db
      .select()
      .from(transactionTypesTable)
      .where(and(...filters))
      .orderBy(
        asc(transactionTypesTable.isDefault),
        asc(transactionTypesTable.flow),
        asc(transactionTypesTable.id),
      );
  }

  async findById(id: string) {
    const [type] = await this.db
      .select()
      .from(transactionTypesTable)
      .where(eq(transactionTypesTable.id, id));

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

    const [created] = await this.db
      .insert(transactionTypesTable)
      .values({
        userId,
        code,
        name: dto.name.trim(),
        flow: dto.flow,
        isDefault: false,
      })
      .returning();

    return created;
  }

  async assertTypeAllowed(
    typeId: string,
    flow: TransactionFlow,
    userId: string,
  ) {
    const type = await this.findById(typeId);

    if (!type) {
      throw AppException.transactionTypeNotFound();
    }

    if (type.flow !== flow) {
      throw AppException.transactionTypeFlowMismatch(type.name, type.flow, flow);
    }

    if (!type.isDefault && type.userId !== userId) {
      throw AppException.transactionTypeAccessDenied();
    }
  }

  private async seedDefaults() {
    await this.seedFlowDefaults(
      TransactionFlow.EXPENSE,
      DEFAULT_EXPENSE_TRANSACTION_TYPES,
    );
    await this.seedFlowDefaults(
      TransactionFlow.INCOME,
      DEFAULT_INCOME_TRANSACTION_TYPES,
    );
  }

  private async seedFlowDefaults(
    flow: TransactionFlow,
    items: ReadonlyArray<{ code: string; name: string }>,
  ) {
    for (const item of items) {
      const existing = await this.db
        .select({ id: transactionTypesTable.id })
        .from(transactionTypesTable)
        .where(
          and(
            eq(transactionTypesTable.code, item.code),
            eq(transactionTypesTable.flow, flow),
            isNull(transactionTypesTable.userId),
          ),
        );

      if (!existing.length) {
        await this.db.insert(transactionTypesTable).values({
          code: item.code,
          name: item.name,
          flow,
          isDefault: true,
        });
        this.logger.log(`Seeded transaction type: ${flow}/${item.code}`);
      }
    }
  }
}
