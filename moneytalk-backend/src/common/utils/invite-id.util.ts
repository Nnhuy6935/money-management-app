import { randomInt } from 'node:crypto';

/** Bỏ ký tự dễ nhầm: O, 0, I, 1. */
export const INVITE_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_ID_LENGTH = 8;
export const INVITE_ID_PATTERN = new RegExp(
  `^[${INVITE_ID_ALPHABET}]{${INVITE_ID_LENGTH}}$`,
);

/** Mã mời ngẫu nhiên, vd `SP8K4M2Q`. Không chứa thông tin cá nhân. */
export function generateInviteId(): string {
  let code = '';
  for (let i = 0; i < INVITE_ID_LENGTH; i++) {
    code += INVITE_ID_ALPHABET[randomInt(INVITE_ID_ALPHABET.length)];
  }
  return code;
}

/** ` sp8k-4m2q ` → `SP8K4M2Q` */
export function normalizeInviteId(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}
