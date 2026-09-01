import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

export class SendFriendRequestDto {
  @ApiProperty({
    example: UUID_EXAMPLE,
    format: 'uuid',
    description: 'ID user muốn kết bạn',
  })
  @IsUUID()
  addresseeId: string;
}
