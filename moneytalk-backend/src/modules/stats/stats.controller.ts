import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StatsOverviewResponseDto } from '../../common/dto/api-responses.dto';
import { UserRole } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Thống kê tổng quan (chỉ admin)',
    description: 'Gửi Authorization: Bearer <token> của tài khoản admin.',
  })
  @ApiOkResponse({
    description: 'Thống kê hệ thống',
    type: StatsOverviewResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Thiếu / sai JWT' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  getOverview() {
    return this.statsService.getOverview();
  }
}
