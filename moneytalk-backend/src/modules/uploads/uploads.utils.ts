import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  type AllowedImageMimeType,
  MAX_IMAGE_SIZE_BYTES,
} from './uploads.constants';

export function assertImageFile(
  file?: Express.Multer.File,
): Express.Multer.File {
  if (!file) {
    throw new BadRequestException('Thiếu file upload (field name: file)');
  }

  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as AllowedImageMimeType)
  ) {
    throw new BadRequestException(
      `Định dạng không hỗ trợ. Chỉ nhận: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException(
      `File quá lớn. Tối đa ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
    );
  }

  return file;
}

export function assertAllowedR2ContentType(contentType: string): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType as AllowedImageMimeType)) {
    throw new BadRequestException(
      contentType.startsWith('multipart/')
        ? 'Ảnh upload sai format (FormData). PUT binary trực tiếp lên uploadUrl, hoặc dùng POST /api/uploads/image.'
        : `File trên R2 không phải ảnh hợp lệ (${contentType}). Upload lại.`,
    );
  }
}

export function extensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}
