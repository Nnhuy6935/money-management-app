import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'node:dns';

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > 254) {
    return false;
  }

  return EMAIL_REGEX.test(email);
}

/**
 * Kiểm tra domain email có MX record (có thể nhận thư).
 * Không chứng minh mailbox thật sự tồn tại — cần gửi OTP/link để verify ownership.
 */
export async function assertEmailDomainExists(email: string): Promise<void> {
  const domain = email.split('@')[1];

  if (!domain) {
    throw new BadRequestException('Email không hợp lệ');
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords?.length) {
      throw new BadRequestException(
        'Domain email không tồn tại hoặc không nhận được thư',
      );
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      'Domain email không tồn tại hoặc không nhận được thư',
    );
  }
}

export async function validateRegisterEmail(email: string): Promise<string> {
  const normalized = normalizeEmail(email);

  if (!isValidEmailFormat(normalized)) {
    throw new BadRequestException('Định dạng email không hợp lệ');
  }

  await assertEmailDomainExists(normalized);

  return normalized;
}
