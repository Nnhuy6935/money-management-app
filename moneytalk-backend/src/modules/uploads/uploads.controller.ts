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
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  ORPHAN_UPLOAD_TTL_MS,
} from './uploads.constants';
import { UploadsService } from './uploads.service';
import { assertImageFile } from './uploads.utils';

const UPLOAD_RULES =
  `**Giới hạn:** tối đa ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB; chỉ nhận ${ALLOWED_IMAGE_MIME_TYPES.join(', ')} (sai định dạng → 400 INVALID_IMAGE; quá dung lượng → 413 khi upload qua backend, 400 INVALID_IMAGE khi tạo giao dịch với ảnh presign). ` +
  `Ảnh không được gắn vào giao dịch nào trong ${ORPHAN_UPLOAD_TTL_MS / 3_600_000} giờ sẽ bị xoá. ` +
  'Ảnh được phục vụ qua URL public; key chứa UUID ngẫu nhiên nên không đoán được.';

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
      'Tránh lỗi ảnh hỏng so với PUT presigned + FormData.\n\n' +
      UPLOAD_RULES,
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
      'Nếu không chắc PUT đúng format → dùng POST /api/uploads/image thay thế.\n\n' +
      UPLOAD_RULES,
  })
  @ApiCreatedResponse({ type: PresignUploadResponseDto })
  @ApiUnauthorizedResponse()
  presign(@Body() dto: PresignUploadDto, @CurrentUser() user: AuthUser) {
    return this.uploadsService.createPresignedUpload(user.id, dto.contentType);
  }
}
