import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from '../../common/dto/api-responses.dto';
import { UUID_EXAMPLE } from '../../common/constants/swagger.constants';
import { UserRole } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth.types';
import { AppException } from '../../common/exceptions';
import { FixedWindowRateLimiter } from '../../common/utils/rate-limiter.util';
import {
  LookupUserQueryDto,
  UserLookupResponseDto,
} from './dto/lookup-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/** Hạn chế dò mã mời hàng loạt. */
const lookupLimiter = new FixedWindowRateLimiter(20, 60_000);

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách users (admin)' })
  @ApiOkResponse({ description: 'Danh sách users', type: [UserResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  findAll() {
    return this.usersService.findAll();
  }

  // Phải khai báo trước GET :id để "lookup" không bị coi là id
  @Get('lookup')
  @ApiOperation({
    summary: 'Tìm user bằng mã mời (inviteId)',
    description:
      'Chỉ trả inviteId và tên hiển thị. Giới hạn 20 lần/phút mỗi user (vượt → 429 RATE_LIMITED).',
  })
  @ApiOkResponse({ type: UserLookupResponseDto })
  @ApiNotFoundResponse({ description: 'USER_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  lookup(
    @Query() query: LookupUserQueryDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    if (!lookupLimiter.consume(currentUser.id)) {
      throw AppException.rateLimited();
    }
    return this.usersService.lookupByInviteId(query.inviteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết user (chính mình hoặc admin)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid', example: UUID_EXAMPLE })
  @ApiOkResponse({ description: 'Chi tiết user', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User không tồn tại' })
  @ApiForbiddenResponse()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    this.assertCanAccessUser(currentUser, id);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật user (name/email cho chính mình; role chỉ admin)',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', example: UUID_EXAMPLE })
  @ApiOkResponse({
    description: 'User đã được cập nhật',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User không tồn tại' })
  @ApiForbiddenResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    this.assertCanAccessUser(currentUser, id);

    if (dto.role !== undefined && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Chỉ admin mới được đổi role');
    }

    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa user (admin)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid', example: UUID_EXAMPLE })
  @ApiOkResponse({ description: 'User đã được xóa', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User không tồn tại' })
  @ApiForbiddenResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  private assertCanAccessUser(currentUser: AuthUser, targetId: string) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== targetId) {
      throw new ForbiddenException('Bạn không có quyền truy cập user này');
    }
  }
}
