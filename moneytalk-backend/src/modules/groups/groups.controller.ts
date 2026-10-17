import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UUID_EXAMPLE } from '../../common/constants/swagger.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import {
  CreateGroupDto,
  CreateInvitationDto,
  PaginationQueryDto,
  TransferOwnershipDto,
  UpdateGroupDto,
} from './dto/group-requests.dto';
import {
  GroupInvitationResponseDto,
  GroupMemberResponseDto,
  GroupResponseDto,
  PaginatedGroupsResponseDto,
} from './dto/group-responses.dto';
import { GroupInvitationsService } from './group-invitations.service';
import { GroupsService } from './groups.service';

const ACCESS_ERRORS =
  '404 GROUP_NOT_FOUND (không tồn tại / bạn không phải thành viên) · 409 GROUP_ARCHIVED';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly invitationsService: GroupInvitationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo nhóm',
    description: 'Người tạo là OWNER. Nhóm mới ở trạng thái ACTIVE.',
  })
  @ApiCreatedResponse({ type: GroupResponseDto })
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthUser) {
    return this.groupsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Nhóm của tôi',
    description:
      'Chỉ nhóm ACTIVE mà bạn đang là thành viên; mới cập nhật trước.',
  })
  @ApiOkResponse({ type: PaginatedGroupsResponseDto })
  findMine(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    return this.groupsService.findMine(user.id, query);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Chi tiết nhóm', description: ACCESS_ERRORS })
  @ApiParam({ name: 'groupId', format: 'uuid', example: UUID_EXAMPLE })
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiNotFoundResponse({ description: 'GROUP_NOT_FOUND' })
  @ApiConflictResponse({ description: 'GROUP_ARCHIVED' })
  findOne(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.findOne(user.id, groupId);
  }

  @Patch(':groupId')
  @ApiOperation({
    summary: 'Cập nhật nhóm (chỉ owner)',
    description: `Chỉ đổi name, description. ${ACCESS_ERRORS} · 403 GROUP_OWNER_ONLY`,
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiForbiddenResponse({ description: 'GROUP_OWNER_ONLY' })
  update(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.update(user.id, groupId, dto);
  }

  @Delete(':groupId')
  @ApiOperation({
    summary: 'Giải tán nhóm (chỉ owner)',
    description:
      'Chuyển sang ARCHIVED, không xoá dữ liệu. Lời mời đang chờ bị huỷ. ' +
      'Sau đó nhóm không còn truy cập được qua API (kể cả owner).',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ schema: { example: { archived: true, id: UUID_EXAMPLE } } })
  @ApiForbiddenResponse({ description: 'GROUP_OWNER_ONLY' })
  archive(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.archive(user.id, groupId);
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'Thành viên nhóm', description: ACCESS_ERRORS })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: [GroupMemberResponseDto] })
  listMembers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.listMembers(user.id, groupId);
  }

  @Delete(':groupId/members/:userId')
  @ApiOperation({
    summary: 'Xoá thành viên (chỉ owner)',
    description:
      'Không xoá được owner (400 GROUP_CANNOT_REMOVE_OWNER). Giao dịch của người đó được giữ lại.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({
    schema: { example: { removed: true, userId: UUID_EXAMPLE } },
  })
  @ApiNotFoundResponse({
    description: 'GROUP_NOT_FOUND | GROUP_MEMBER_NOT_FOUND',
  })
  removeMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.removeMember(user.id, groupId, targetUserId);
  }

  @Post(':groupId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rời nhóm',
    description:
      'Owner không rời được (409 GROUP_OWNER_CANNOT_LEAVE) — chuyển quyền hoặc giải tán trước.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ schema: { example: { left: true, id: UUID_EXAMPLE } } })
  leave(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.leave(user.id, groupId);
  }

  @Post(':groupId/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chuyển quyền sở hữu (chỉ owner)',
    description:
      'Người nhận phải là thành viên. Owner cũ thành MEMBER. Trả về nhóm (myRole = MEMBER).',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiNotFoundResponse({ description: 'GROUP_MEMBER_NOT_FOUND' })
  transferOwnership(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.transferOwnership(
      user.id,
      groupId,
      dto.newOwnerId,
    );
  }

  @Post(':groupId/invitations')
  @ApiOperation({
    summary: 'Mời thành viên bằng inviteId (chỉ owner)',
    description:
      'Tạo lời mời PENDING, hết hạn sau 7 ngày. Lỗi: 404 USER_NOT_FOUND · 400 GROUP_INVITE_SELF · ' +
      '409 GROUP_ALREADY_MEMBER · 409 INVITATION_ALREADY_PENDING.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiCreatedResponse({ type: GroupInvitationResponseDto })
  invite(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitationsService.send(user.id, groupId, dto.inviteId);
  }
}
