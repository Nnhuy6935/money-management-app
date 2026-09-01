import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({
    example: 'uploads/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg',
    description: 'Object key trên R2',
  })
  key: string;

  @ApiProperty({
    example:
      'https://pub-00f5cd8f888d4655ba64f3ea956a8aa4.r2.dev/transactions/1/uuid.jpg',
    description: 'URL công khai — dùng làm `imageUrl` khi tạo transaction',
  })
  url: string;

  @ApiProperty({
    example:
      'https://pub-00f5cd8f888d4655ba64f3ea956a8aa4.r2.dev/transactions/1/uuid.jpg',
    description: 'Alias của `url`',
  })
  publicUrl: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType: string;

  @ApiProperty({ example: 245678, description: 'Kích thước file (bytes)' })
  size: number;
}
