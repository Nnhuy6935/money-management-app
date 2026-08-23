import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/constants/roles';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    example: 'nguyenvana@gmail.com',
    description: 'Email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.USER,
    description: 'Vai trò: admin | user (chỉ admin được đổi)',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role phải là admin hoặc user' })
  role?: UserRole;
}
