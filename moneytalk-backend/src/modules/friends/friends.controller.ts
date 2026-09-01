import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UUID_EXAMPLE } from '../../common/constants/swagger.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import {
  FriendRequestResponseDto,
  FriendResponseDto,
} from './dto/friend-response.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendsService } from './friends.service';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách bạn bè' })
  @ApiOkResponse({ type: [FriendResponseDto] })
  @ApiUnauthorizedResponse()
  listFriends(@CurrentUser() user: AuthUser) {
    return this.friendsService.listFriends(user.id);
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: 'Lời mời kết bạn đang chờ (nhận được)' })
  @ApiOkResponse({ type: [FriendRequestResponseDto] })
  listIncoming(@CurrentUser() user: AuthUser) {
    return this.friendsService.listIncomingRequests(user.id);
  }

  @Get('requests/outgoing')
  @ApiOperation({ summary: 'Lời mời kết bạn đã gửi' })
  @ApiOkResponse({ type: [FriendRequestResponseDto] })
  listOutgoing(@CurrentUser() user: AuthUser) {
    return this.friendsService.listOutgoingRequests(user.id);
  }

  @Post('requests')
  @ApiOperation({
    summary: 'Gửi lời mời kết bạn',
    description:
      'Nếu đối phương đã gửi lời mời cho bạn trước đó, hệ thống tự accept.',
  })
  @ApiCreatedResponse({ type: FriendRequestResponseDto })
  sendRequest(
    @Body() dto: SendFriendRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.friendsService.sendRequest(user.id, dto.addresseeId);
  }

  @Patch('requests/:id/accept')
  @ApiOperation({ summary: 'Chấp nhận lời mời kết bạn' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: FriendRequestResponseDto })
  acceptRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Patch('requests/:id/reject')
  @ApiOperation({ summary: 'Từ chối lời mời kết bạn' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: FriendRequestResponseDto })
  rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.friendsService.rejectRequest(user.id, id);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Huỷ kết bạn' })
  @ApiParam({
    name: 'userId',
    type: String,
    format: 'uuid',
    description: 'ID bạn bè cần huỷ',
  })
  @ApiOkResponse({
    schema: { example: { removed: true, userId: UUID_EXAMPLE } },
  })
  removeFriend(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.friendsService.removeFriend(user.id, userId);
  }
}
