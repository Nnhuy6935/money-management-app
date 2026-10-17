export const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;

/** `a1b2c3` | `#a1b2c3` → `#A1B2C3` */
export function normalizeHexColor(input: string): string {
  return `#${input.trim().replace(/^#/, '').toUpperCase()}`;
}
