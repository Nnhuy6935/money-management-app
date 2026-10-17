import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token từ login / register / refresh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}
