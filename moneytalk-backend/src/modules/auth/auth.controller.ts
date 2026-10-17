import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthResponseDto,
  RefreshResponseDto,
  UserResponseDto,
} from '../../common/dto/api-responses.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản (role mặc định: user)' })
  @ApiCreatedResponse({
    description: 'Đăng ký thành công + token + user',
    type: AuthResponseDto,
  })
  @ApiConflictResponse({ description: 'EMAIL_IN_USE' })
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập, nhận JWT' })
  @ApiOkResponse({
    description: 'Đăng nhập thành công + token + user',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'INVALID_CREDENTIALS (cùng lỗi cho sai email và sai mật khẩu)',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới access token',
    description:
      'Gửi refreshToken, nhận cặp token mới. Refresh token cũ bị vô hiệu ngay (rotate).',
  })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_REFRESH_TOKEN' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin user từ JWT' })
  @ApiOkResponse({ description: 'Profile hiện tại', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Thiếu / sai token' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất, thu hồi token hiện tại' })
  @ApiOkResponse({
    description: 'Đăng xuất thành công, access + refresh token bị vô hiệu hóa',
  })
  @ApiUnauthorizedResponse({ description: 'Thiếu / sai token' })
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.jti);
  }
}
