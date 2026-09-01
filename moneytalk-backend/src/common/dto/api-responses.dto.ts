import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/roles';
import { UUID_EXAMPLE } from '../../common/constants/swagger.constants';

export class UserResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A', nullable: true })
  name: string | null;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: '2026-08-23T05:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-23T05:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;
}

export class StatsOverviewResponseDto {
  @ApiProperty({ example: 10 })
  totalUsers: number;

  @ApiProperty({ example: 1 })
  adminCount: number;

  @ApiProperty({ example: 9 })
  userCount: number;
}
