import { Module } from '@nestjs/common';
import { R2_CONFIG, type R2Config } from './uploads.constants';
import { UploadsCleanupService } from './uploads-cleanup.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

function loadR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
  const bucket = process.env.R2_BUCKET_NAME ?? '';
  const publicUrl = process.env.R2_PUBLIC_URL ?? '';

  const missing = [
    ['R2_ACCOUNT_ID', accountId],
    ['R2_ACCESS_KEY_ID', accessKeyId],
    ['R2_SECRET_ACCESS_KEY', secretAccessKey],
    ['R2_BUCKET_NAME', bucket],
    ['R2_PUBLIC_URL', publicUrl],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    console.warn(
      `[UploadsModule] Thiếu env R2: ${missing.join(', ')}. Upload sẽ lỗi cho đến khi cấu hình đủ.`,
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
    endpoint:
      process.env.R2_ENDPOINT ||
      `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

@Module({
  controllers: [UploadsController],
  providers: [
    {
      provide: R2_CONFIG,
      useFactory: loadR2Config,
    },
    UploadsService,
    UploadsCleanupService,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
