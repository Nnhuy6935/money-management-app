import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { TransactionFlow } from '../../common/constants/transaction.constants';
import {
  formatDateInVn,
  getPeriodBounds,
  startOfVnDay,
} from '../../common/utils/date.util';
import type { Database } from '../../database/database.types';
import {
  transactionsTable,
  transactionTypesTable,
  usersTable,
} from '../../database/schema';
import type { GroupSummaryDto } from './dto/group-responses.dto';

/**
 * Số liệu chi tiêu cho card nhóm / header chi tiết.
 * Chỉ tính flow=expense; "tháng này" theo giờ VN. Cố định 2 query cho cả trang, không N+1.
 */
@Injectable()
export class GroupSummaryService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async loadSummaries(
    groupIds: string[],
    now = new Date(),
  ): Promise<Map<string, GroupSummaryDto>> {
    const month = getPeriodBounds('month', formatDateInVn(now));
    const monthStart = startOfVnDay(month.start);
    const monthEnd = startOfVnDay(month.end);

    const summaries = new Map<string, GroupSummaryDto>(
      groupIds.map((id) => [
        id,
        {
          monthStart: month.start,
          monthSpent: 0,
          totalSpent: 0,
          expenseCount: 0,
          latestExpense: null,
        },
      ]),
    );
    if (!groupIds.length) return summaries;

    const scope = and(
      inArray(transactionsTable.groupId, groupIds),
      eq(transactionsTable.flow, TransactionFlow.EXPENSE),
    );

    const [totals, latest] = await Promise.all([
      this.db
        .select({
          groupId: transactionsTable.groupId,
          totalSpent: sql<string>`coalesce(sum(${transactionsTable.amount}), 0)`,
          monthSpent: sql<string>`coalesce(sum(${transactionsTable.amount}) filter (where ${and(
            gte(transactionsTable.spentAt, monthStart),
            lt(transactionsTable.spentAt, monthEnd),
          )}), 0)`,
          expenseCount: sql<number>`count(*)::int`,
        })
        .from(transactionsTable)
        .where(scope)
        .groupBy(transactionsTable.groupId),
      // Khoản chi mới nhất của mỗi nhóm
      this.db
        .selectDistinctOn([transactionsTable.groupId], {
          groupId: transactionsTable.groupId,
          id: transactionsTable.id,
          description: transactionsTable.description,
          amount: transactionsTable.amount,
          spentAt: transactionsTable.spentAt,
          typeId: transactionTypesTable.id,
          typeCode: transactionTypesTable.code,
          typeName: transactionTypesTable.name,
          creatorId: usersTable.id,
          creatorName: usersTable.name,
        })
        .from(transactionsTable)
        .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
        .leftJoin(
          transactionTypesTable,
          eq(transactionsTable.typeId, transactionTypesTable.id),
        )
        .where(scope)
        .orderBy(
          transactionsTable.groupId,
          desc(transactionsTable.spentAt),
          desc(transactionsTable.createdAt),
        ),
    ]);

    for (const row of totals) {
      const summary = row.groupId && summaries.get(row.groupId);
      if (!summary) continue;
      summary.totalSpent = Number(row.totalSpent);
      summary.monthSpent = Number(row.monthSpent);
      summary.expenseCount = Number(row.expenseCount);
    }

    for (const row of latest) {
      const summary = row.groupId && summaries.get(row.groupId);
      if (!summary) continue;
      summary.latestExpense = {
        id: row.id,
        description: row.description,
        type: row.typeId
          ? { id: row.typeId, code: row.typeCode!, name: row.typeName! }
          : null,
        amount: row.amount,
        spentAt: row.spentAt,
        createdBy: { id: row.creatorId, name: row.creatorName },
      };
    }

    return summaries;
  }
}
