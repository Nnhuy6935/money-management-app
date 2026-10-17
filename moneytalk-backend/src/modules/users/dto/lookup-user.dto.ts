import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LookupUserQueryDto {
  @ApiProperty({
    example: 'SP8K4M2Q',
    description:
      'Mã mời; không phân biệt hoa thường, bỏ qua khoảng trắng và dấu -',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  inviteId: string;
}

export class UserLookupResponseDto {
  @ApiProperty({ example: 'SP8K4M2Q' })
  inviteId: string;

  @ApiProperty({ example: 'Lena', type: String, nullable: true })
  name: string | null;
}
