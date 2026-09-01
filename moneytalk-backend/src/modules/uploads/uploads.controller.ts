import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { PresignUploadResponseDto } from './dto/presign-upload-response.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { UploadImageResponseDto } from './dto/upload-image-response.dto';
import { MAX_IMAGE_SIZE_BYTES } from './uploads.constants';
import { UploadsService } from './uploads.service';
import { assertImageFile } from './uploads.utils';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @ApiOperation({
    summary: 'Upload ảnh qua backend (khuyên dùng)',
    description:
      'Gửi multipart `file` — backend upload đúng format lên R2. ' +
      'Dùng `url` trả về làm `imageUrl` khi tạo transaction. ' +
      'Tránh lỗi ảnh hỏng so với PUT presigned + FormData.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: UploadImageResponseDto })
  @ApiUnauthorizedResponse()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    const validFile = assertImageFile(file);
    return this.uploadsService.uploadImage(user.id, validFile);
  }

  @Post('presign')
  @ApiOperation({
    summary: 'Lấy presigned URL để upload ảnh (client PUT trực tiếp)',
    description:
      '1. Gọi API này → nhận `publicUrl` (hoặc `url`)\n' +
      '2. Client **PUT** file binary thô lên `uploadUrl` (header `Content-Type` phải khớp, **không** gửi FormData)\n' +
      '3. Sau PUT thành công, `imageUrl` = `publicUrl` cho POST /api/transactions\n\n' +
      'Nếu không chắc PUT đúng format → dùng POST /api/uploads/image thay thế.',
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  @ApiUnauthorizedResponse()
  presign(@Body() dto: PresignUploadDto, @CurrentUser() user: AuthUser) {
    return this.uploadsService.createPresignedUpload(user.id, dto.contentType);
  }
}
