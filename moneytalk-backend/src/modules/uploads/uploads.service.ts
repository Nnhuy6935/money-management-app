import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DRIZZLE } from '../../common/constants/injection-tokens';
import { AppException } from '../../common/exceptions';
import type { Database } from '../../database/database.types';
import { pendingUploadsTable } from '../../database/schema';
import type { R2Config } from './uploads.constants';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  R2_CONFIG,
} from './uploads.constants';
import { extensionFromMime, assertAllowedR2ContentType } from './uploads.utils';

const PRESIGN_EXPIRES_IN_SECONDS = 900;

export type UploadedImage = {
  key: string;
  url: string;
  publicUrl?: string;
  contentType: string;
  size: number;
};

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private client!: S3Client;

  constructor(
    @Inject(R2_CONFIG) private readonly config: R2Config,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  onModuleInit() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId || 'missing',
        secretAccessKey: this.config.secretAccessKey || 'missing',
      },
    });
  }

  async uploadImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UploadedImage> {
    this.assertConfigured();

    const ext = extensionFromMime(file.mimetype);
    const key = `transactions/${userId}/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          ContentType: file.mimetype,
          Body: file.buffer,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      this.logger.error('Upload to R2 failed', error);
      throw new InternalServerErrorException('Upload ảnh thất bại');
    }

    await this.trackPending(userId, key);

    const publicUrl = this.buildPublicUrl(key);

    return {
      key,
      url: publicUrl,
      publicUrl,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  async createPresignedUpload(
    userId: string,
    contentType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
  ) {
    this.assertConfigured();

    const ext = extensionFromMime(contentType);
    const key = `transactions/${userId}/${randomUUID()}.${ext}`;

    try {
      const uploadUrl = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
        { expiresIn: PRESIGN_EXPIRES_IN_SECONDS },
      );

      await this.trackPending(userId, key);

      const publicUrl = this.buildPublicUrl(key);

      return {
        uploadUrl,
        key,
        url: publicUrl,
        publicUrl,
        contentType,
        expiresIn: PRESIGN_EXPIRES_IN_SECONDS,
      };
    } catch (error) {
      this.logger.error('Create presigned URL failed', error);
      throw new InternalServerErrorException('Không tạo được URL upload');
    }
  }

  async deleteObject(userId: string, key: string) {
    this.assertConfigured();

    if (!key?.startsWith(`transactions/${userId}/`)) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error('Delete from R2 failed', error);
      throw new InternalServerErrorException('Xóa ảnh thất bại');
    }

    return { deleted: true, key };
  }

  async resolveUploadedImage(
    userId: string,
    imageUrl: string,
  ): Promise<UploadedImage> {
    this.assertConfigured();

    const key = this.extractKeyFromUrl(imageUrl);

    if (!key.startsWith(`transactions/${userId}/`)) {
      throw AppException.invalidImage('Ảnh không thuộc về bạn');
    }

    try {
      const head = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      if (!head.ContentType || head.ContentLength === undefined) {
        throw AppException.invalidImage('Không đọc được metadata ảnh trên R2');
      }

      assertAllowedR2ContentType(head.ContentType);

      if (head.ContentLength > MAX_IMAGE_SIZE_BYTES) {
        throw AppException.invalidImage(
          `File quá lớn. Tối đa ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
        );
      }

      return {
        key,
        url: this.buildPublicUrl(key),
        contentType: head.ContentType,
        size: head.ContentLength,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error('Head object from R2 failed', error);
      throw AppException.invalidImage(
        'Ảnh không tồn tại hoặc URL không hợp lệ',
      );
    }
  }

  /** NF-4: ghi nhận ảnh chưa gắn vào giao dịch để dọn nếu bị bỏ rơi. */
  private async trackPending(userId: string, key: string) {
    await this.db
      .insert(pendingUploadsTable)
      .values({ key, userId })
      .onConflictDoNothing();
  }

  private extractKeyFromUrl(imageUrl: string): string {
    const base = this.config.publicUrl.replace(/\/$/, '');

    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw AppException.invalidImage('URL ảnh không hợp lệ');
    }

    const baseUrl = new URL(base);
    if (parsed.origin !== baseUrl.origin) {
      throw AppException.invalidImage('URL ảnh không thuộc hệ thống lưu trữ');
    }

    const basePath = baseUrl.pathname.replace(/\/$/, '');
    const objectPath = parsed.pathname.replace(/^\//, '');

    if (basePath && basePath !== '/') {
      if (!parsed.pathname.startsWith(`${basePath}/`)) {
        throw AppException.invalidImage('URL ảnh không hợp lệ');
      }

      return parsed.pathname.slice(basePath.length + 1);
    }

    return objectPath;
  }

  private assertConfigured() {
    if (
      !this.config.accountId ||
      !this.config.accessKeyId ||
      !this.config.secretAccessKey ||
      !this.config.bucket ||
      !this.config.publicUrl
    ) {
      throw new ServiceUnavailableException(
        'R2 chưa được cấu hình. Kiểm tra biến môi trường R2_* trong .env',
      );
    }
  }

  private buildPublicUrl(key: string): string {
    const base = this.config.publicUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }
}
