import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, Matches } from 'class-validator';
import type { PeriodType } from '../../../common/utils/date.util';

export const PERIOD_TYPES: readonly PeriodType[] = ['week', 'month', 'year'];

export class InsightsSummaryQueryDto {
  @ApiProperty({ enum: PERIOD_TYPES, example: 'month' })
  @IsIn(PERIOD_TYPES)
  periodType: PeriodType;

  @ApiProperty({
    example: '2026-10-16',
    description: 'Ngày bất kỳ trong kỳ (YYYY-MM-DD, giờ VN)',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date phải có dạng YYYY-MM-DD' })
  date: string;
}
