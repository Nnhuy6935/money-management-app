import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, lt, SQL, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { TransactionFlow } from '../../common/constants/transaction.constants';
import {
  getPeriodBounds,
  getPreviousPeriodBounds,
  startOfVnDay,
  VN_TIMEZONE_NAME,
} from '../../common/utils/date.util';
import type { Database } from '../../database/database.types';
import {
  transactionsTable,
  transactionTypesTable,
} from '../../database/schema';
import { InsightsSummaryQueryDto } from './dto/insights-summary-query.dto';
import type { InsightsSummaryResponseDto } from './dto/insights-summary-response.dto';

/** sum(bigint) trả numeric (string) — ép về number. */
const sumAmount = sql<string>`coalesce(sum(${transactionsTable.amount}), 0)`;

@Injectable()
export class InsightsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * N-09. Chỉ giao dịch của user (S-01), theo `spentAt` giờ VN.
   * Receipt item không bao giờ được cộng — chỉ dùng `transactions.amount`.
   */
  async getSummary(
    userId: string,
    query: InsightsSummaryQueryDto,
  ): Promise<InsightsSummaryResponseDto> {
    const period = getPeriodBounds(query.periodType, query.date);
    const previous = getPreviousPeriodBounds(query.periodType, query.date);
    const granularity = query.periodType === 'year' ? 'month' : 'day';

    const inPeriod = (bounds: { start: string; end: string }): SQL =>
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.spentAt, startOfVnDay(bounds.start)),
        lt(transactionsTable.spentAt, startOfVnDay(bounds.end)),
      )!;
    const isExpense = eq(transactionsTable.flow, TransactionFlow.EXPENSE);

    // unit lấy từ whitelist cố định → an toàn khi dùng sql.raw
    const bucket = sql<string>`to_char(date_trunc('${sql.raw(granularity)}', ${transactionsTable.spentAt} at time zone '${sql.raw(VN_TIMEZONE_NAME)}'), 'YYYY-MM-DD')`;

    const [totals, [previousTotals], buckets, typeTotals] = await Promise.all([
      this.db
        .select({ flow: transactionsTable.flow, amount: sumAmount })
        .from(transactionsTable)
        .where(inPeriod(period))
        .groupBy(transactionsTable.flow),
      this.db
        .select({ amount: sumAmount })
        .from(transactionsTable)
        .where(and(inPeriod(previous), isExpense)),
      this.db
        .select({ date: bucket, amount: sumAmount })
        .from(transactionsTable)
        .where(and(inPeriod(period), isExpense))
        .groupBy(bucket)
        .orderBy(asc(bucket)),
      this.db
        .select({
          typeId: transactionsTable.typeId,
          code: transactionTypesTable.code,
          name: transactionTypesTable.name,
          iconKey: transactionTypesTable.iconKey,
          color: transactionTypesTable.color,
          amount: sumAmount,
        })
        .from(transactionsTable)
        .leftJoin(
          transactionTypesTable,
          eq(transactionsTable.typeId, transactionTypesTable.id),
        )
        .where(and(inPeriod(period), isExpense))
        .groupBy(
          transactionsTable.typeId,
          transactionTypesTable.code,
          transactionTypesTable.name,
          transactionTypesTable.iconKey,
          transactionTypesTable.color,
        )
        .orderBy(desc(sumAmount)),
    ]);

    const totalFor = (flow: TransactionFlow) =>
      Number(totals.find((row) => row.flow === flow)?.amount ?? 0);

    return {
      periodType: query.periodType,
      periodStart: period.start,
      periodEnd: period.end,
      granularity,
      totalSpent: totalFor(TransactionFlow.EXPENSE),
      previousPeriodSpent: Number(previousTotals?.amount ?? 0),
      totalIncome: totalFor(TransactionFlow.INCOME),
      buckets: buckets
        .map((row) => ({ date: row.date, amount: Number(row.amount) }))
        .filter((row) => row.amount !== 0),
      typeTotals: typeTotals.map((row) => ({
        typeId: row.typeId,
        code: row.code,
        name: row.name,
        iconKey: row.iconKey,
        color: row.color,
        amount: Number(row.amount),
      })),
    };
  }
}
