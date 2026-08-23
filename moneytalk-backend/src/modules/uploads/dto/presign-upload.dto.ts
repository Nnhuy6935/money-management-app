import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ALLOWED_IMAGE_MIME_TYPES } from '../uploads.constants';

export class PresignUploadDto {
  @ApiProperty({
    example: 'image/jpeg',
    enum: ALLOWED_IMAGE_MIME_TYPES,
    description: 'MIME type của ảnh sẽ upload (PUT lên uploadUrl)',
  })
  @IsIn([...ALLOWED_IMAGE_MIME_TYPES])
  contentType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
}
