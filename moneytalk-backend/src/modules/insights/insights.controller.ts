import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { InsightsSummaryQueryDto } from './dto/insights-summary-query.dto';
import { InsightsSummaryResponseDto } from './dto/insights-summary-response.dto';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@ApiBearerAuth()
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Tổng hợp chi tiêu cho Home / Insights',
    description:
      'Kỳ theo giờ VN (UTC+7): week = thứ Hai → thứ Hai kế; month = mùng 1 → mùng 1 tháng sau; year = 1/1 → 1/1 năm sau. ' +
      'totalSpent, previousPeriodSpent, buckets, typeTotals chỉ tính flow=expense; totalIncome chỉ flow=income. ' +
      'Tính theo `spentAt`. Receipt item không được cộng.',
  })
  @ApiOkResponse({ type: InsightsSummaryResponseDto })
  @ApiUnauthorizedResponse()
  getSummary(
    @Query() query: InsightsSummaryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.insightsService.getSummary(user.id, query);
  }
}
