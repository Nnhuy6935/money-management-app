import { ApiProperty } from '@nestjs/swagger';

export class PresignUploadResponseDto {
  @ApiProperty({
    example:
      'https://account.r2.cloudflarestorage.com/bucket/transactions/1/uuid.jpg?X-Amz-...',
    description: 'URL presigned — client PUT file binary trực tiếp lên đây',
  })
  uploadUrl: string;

  @ApiProperty({
    example: 'transactions/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg',
    description: 'Object key trên R2',
  })
  key: string;

  @ApiProperty({
    example:
      'https://pub-00f5cd8f888d4655ba64f3ea956a8aa4.r2.dev/transactions/1/uuid.jpg',
    description:
      'URL công khai để xem ảnh + dùng cho POST /api/transactions (`imageUrl`). ' +
      'Chỉ dùng field này, KHÔNG dùng `uploadUrl`.',
  })
  url: string;

  @ApiProperty({
    example:
      'https://pub-00f5cd8f888d4655ba64f3ea956a8aa4.r2.dev/transactions/1/uuid.jpg',
    description: 'Alias của `url` — URL public sau khi PUT upload xong',
  })
  publicUrl: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType: string;

  @ApiProperty({
    example: 900,
    description: 'Thời gian hết hạn presigned URL (giây)',
  })
  expiresIn: number;
}
