export enum GroupStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum GroupMemberRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum GroupInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const GROUP_STATUSES = [
  GroupStatus.ACTIVE,
  GroupStatus.ARCHIVED,
] as const;
export const GROUP_MEMBER_ROLES = [
  GroupMemberRole.OWNER,
  GroupMemberRole.MEMBER,
] as const;
export const GROUP_INVITATION_STATUSES = [
  GroupInvitationStatus.PENDING,
  GroupInvitationStatus.ACCEPTED,
  GroupInvitationStatus.REJECTED,
  GroupInvitationStatus.CANCELLED,
  GroupInvitationStatus.EXPIRED,
] as const;

/** Hạn lời mời (ngày). */
export const GROUP_INVITATION_TTL_DAYS = Number(
  process.env.GROUP_INVITATION_TTL_DAYS || 7,
);
