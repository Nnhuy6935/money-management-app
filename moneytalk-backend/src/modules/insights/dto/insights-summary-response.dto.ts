import { ApiProperty } from '@nestjs/swagger';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';
import { PERIOD_TYPES } from './insights-summary-query.dto';

export class InsightsBucketDto {
  @ApiProperty({ example: '2026-10-01', description: 'Ngày đầu của bucket' })
  date: string;

  @ApiProperty({ example: 120000 })
  amount: number;
}

export class InsightsTypeTotalDto {
  @ApiProperty({
    example: UUID_EXAMPLE,
    type: String,
    nullable: true,
    description: 'null = chưa phân loại',
  })
  typeId: string | null;

  @ApiProperty({ example: 'food', type: String, nullable: true })
  code: string | null;

  @ApiProperty({ example: 'Food & Dining', type: String, nullable: true })
  name: string | null;

  @ApiProperty({ example: 'food', type: String, nullable: true })
  iconKey: string | null;

  @ApiProperty({ example: '#55C995', type: String, nullable: true })
  color: string | null;

  @ApiProperty({ example: 1800000 })
  amount: number;
}

export class InsightsSummaryResponseDto {
  @ApiProperty({ enum: PERIOD_TYPES, example: 'month' })
  periodType: string;

  @ApiProperty({ example: '2026-10-01', description: 'Bao gồm' })
  periodStart: string;

  @ApiProperty({ example: '2026-11-01', description: 'Không bao gồm' })
  periodEnd: string;

  @ApiProperty({ enum: ['day', 'month'], example: 'day' })
  granularity: 'day' | 'month';

  @ApiProperty({ example: 4250000, description: 'Tổng chi (flow=expense)' })
  totalSpent: number;

  @ApiProperty({ example: 3900000, description: 'Tổng chi kỳ trước' })
  previousPeriodSpent: number;

  @ApiProperty({ example: 15000000, description: 'Tổng thu (flow=income)' })
  totalIncome: number;

  @ApiProperty({
    type: [InsightsBucketDto],
    description: 'Chi theo ngày/tháng, bỏ qua bucket = 0',
  })
  buckets: InsightsBucketDto[];

  @ApiProperty({
    type: [InsightsTypeTotalDto],
    description: 'Chi theo loại, giảm dần',
  })
  typeTotals: InsightsTypeTotalDto[];
}
