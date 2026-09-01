import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from '../../../common/constants/friend.constants';
import { UserResponseDto } from '../../../common/dto/api-responses.dto';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

export class FriendRequestResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: FriendRequestStatus,
    example: FriendRequestStatus.PENDING,
  })
  status: FriendRequestStatus;

  @ApiProperty({ type: UserResponseDto })
  requester: UserResponseDto;

  @ApiProperty({ type: UserResponseDto })
  addressee: UserResponseDto;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  updatedAt: Date;
}

export class FriendResponseDto {
  @ApiProperty({
    example: UUID_EXAMPLE,
    format: 'uuid',
    description: 'ID bản ghi friend_requests',
  })
  friendshipId: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    example: '2026-09-01T10:00:00.000Z',
    description: 'Thời điểm trở thành bạn bè',
  })
  friendsSince: Date;
}
