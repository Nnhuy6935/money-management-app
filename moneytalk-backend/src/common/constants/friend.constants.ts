export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export const FRIEND_REQUEST_STATUSES = [
  FriendRequestStatus.PENDING,
  FriendRequestStatus.ACCEPTED,
  FriendRequestStatus.REJECTED,
] as const;
