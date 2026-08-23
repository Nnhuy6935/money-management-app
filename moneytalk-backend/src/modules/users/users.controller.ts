import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from '../../common/dto/api-responses.dto';
import { UserRole } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth.types';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách users (admin)' })
  @ApiOkResponse({ description: 'Danh sách users', type: [UserResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết user (chính mình hoặc admin)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Chi tiết user', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User không tồn tại' })
  @ApiForbiddenResponse()
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthUser,
  ) {
    this.assertCanAccessUser(currentUser, id);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật user (name/email cho chính mình; role chỉ admin)',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({
    description: 'User đã được cập nhật',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User không tồn tại' })
  @ApiForbiddenResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    this.assertCanAccessUser(currentUser, id);

    if (dto.role !== undefined && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Chỉ admin mới được đổi role');
    }

    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa user (admin)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'User đã được xóa', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User không tồn tại' })
  @ApiForbiddenResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  private assertCanAccessUser(currentUser: AuthUser, targetId: number) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== targetId) {
      throw new ForbiddenException('Bạn không có quyền truy cập user này');
    }
  }
}
