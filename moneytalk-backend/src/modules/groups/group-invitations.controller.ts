import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { ListInvitationsQueryDto } from './dto/group-requests.dto';
import {
  GroupInvitationResponseDto,
  PaginatedInvitationsResponseDto,
} from './dto/group-responses.dto';
import { GroupInvitationsService } from './group-invitations.service';

@ApiTags('group-invitations')
@ApiBearerAuth()
@Controller('group-invitations')
export class GroupInvitationsController {
  constructor(private readonly invitationsService: GroupInvitationsService) {}

  @Get('received')
  @ApiOperation({
    summary: 'Lời mời tôi nhận được',
    description: 'Mới nhất trước.',
  })
  @ApiOkResponse({ type: PaginatedInvitationsResponseDto })
  listReceived(
    @Query() query: ListInvitationsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitationsService.listReceived(user.id, query);
  }

  @Get('sent')
  @ApiOperation({
    summary: 'Lời mời tôi đã gửi',
    description: 'Mới nhất trước.',
  })
  @ApiOkResponse({ type: PaginatedInvitationsResponseDto })
  listSent(
    @Query() query: ListInvitationsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitationsService.listSent(user.id, query);
  }

  @Post(':invitationId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chấp nhận lời mời (người nhận)',
    description:
      'Thêm bạn vào nhóm với role MEMBER. Lỗi: 409 INVITATION_NOT_PENDING · 409 INVITATION_EXPIRED · ' +
      '409 GROUP_ARCHIVED · 409 GROUP_ALREADY_MEMBER · 403 INVITATION_ACCESS_DENIED.',
  })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiOkResponse({ type: GroupInvitationResponseDto })
  @ApiNotFoundResponse({ description: 'INVITATION_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'INVITATION_ACCESS_DENIED' })
  @ApiConflictResponse({
    description: 'INVITATION_NOT_PENDING | INVITATION_EXPIRED',
  })
  accept(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitationsService.accept(user.id, invitationId);
  }

  @Post(':invitationId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối lời mời (người nhận)' })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiOkResponse({ type: GroupInvitationResponseDto })
  reject(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitationsService.reject(user.id, invitationId);
  }

  @Delete(':invitationId')
  @ApiOperation({
    summary: 'Huỷ lời mời (người gửi)',
    description:
      'Chỉ lời mời PENDING. Bản ghi được giữ với trạng thái CANCELLED.',
  })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiOkResponse({ type: GroupInvitationResponseDto })
  cancel(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitationsService.cancel(user.id, invitationId);
  }
}
