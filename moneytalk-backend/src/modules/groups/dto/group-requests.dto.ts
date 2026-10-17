import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GroupInvitationStatus } from '../../../common/constants/group.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';
import { trimString, trimToNull } from '../../../common/utils/string.util';

export class CreateGroupDto {
  @ApiProperty({ example: 'Đi Đà Lạt' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Chi tiêu cho chuyến đi',
    type: String,
    nullable: true,
    description: 'Chuỗi rỗng → null',
  })
  @IsOptional()
  @Transform(({ value }) => trimToNull(value))
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

export class TransferOwnershipDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  @IsUUID()
  newOwnerId: string;
}

export class CreateInvitationDto {
  @ApiProperty({
    example: 'SP8K4M2Q',
    description: 'Mã mời của người nhận (không phân biệt hoa thường)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  inviteId: string;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ListInvitationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: GroupInvitationStatus,
    description: 'Lọc theo trạng thái; bỏ trống = tất cả',
  })
  @IsOptional()
  @IsEnum(GroupInvitationStatus)
  status?: GroupInvitationStatus;
}
