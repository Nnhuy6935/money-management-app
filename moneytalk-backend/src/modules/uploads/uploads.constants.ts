export const R2_CONFIG = Symbol('R2_CONFIG');

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  endpoint: string;
};

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Ảnh upload không gắn vào giao dịch sau khoảng này sẽ bị xoá (NF-4). */
export const ORPHAN_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
export const UPLOAD_CLEANUP_BATCH_SIZE = 200;
