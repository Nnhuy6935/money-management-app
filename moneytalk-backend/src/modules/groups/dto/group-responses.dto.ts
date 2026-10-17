import { ApiProperty } from '@nestjs/swagger';
import {
  GroupInvitationStatus,
  GroupMemberRole,
  GroupStatus,
} from '../../../common/constants/group.constants';
import { UUID_EXAMPLE } from '../../../common/constants/swagger.constants';

export class GroupUserSummaryDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Lena', type: String, nullable: true })
  name: string | null;

  @ApiProperty({ example: 'SP8K4M2Q' })
  inviteId: string;
}

export class GroupLatestExpenseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Lẩu gà lá é', type: String, nullable: true })
  description: string | null;

  @ApiProperty({
    example: { id: UUID_EXAMPLE, code: 'food', name: 'Food & Dining' },
    nullable: true,
  })
  type: { id: string; code: string; name: string } | null;

  @ApiProperty({ example: 450000, description: 'VND, số nguyên' })
  amount: number;

  @ApiProperty({ example: '2026-10-16T12:30:00.000Z' })
  spentAt: Date;

  @ApiProperty({ example: { id: UUID_EXAMPLE, name: 'Minh' } })
  createdBy: { id: string; name: string | null };
}

export class GroupSummaryDto {
  @ApiProperty({
    example: '2026-10-01',
    description: 'Mùng 1 của tháng hiện tại (giờ VN) — kỳ của `monthSpent`',
  })
  monthStart: string;

  @ApiProperty({
    example: 1250000,
    description:
      'Tổng chi (flow=expense) của nhóm trong tháng hiện tại, theo spentAt giờ VN',
  })
  monthSpent: number;

  @ApiProperty({
    example: 4800000,
    description: 'Tổng chi (flow=expense) từ trước tới nay',
  })
  totalSpent: number;

  @ApiProperty({
    example: 27,
    description: 'Số khoản chi (flow=expense) từ trước tới nay',
  })
  expenseCount: number;

  @ApiProperty({
    type: GroupLatestExpenseDto,
    nullable: true,
    description:
      'Khoản chi có spentAt mới nhất; null nếu nhóm chưa có khoản chi',
  })
  latestExpense: GroupLatestExpenseDto | null;
}

export class GroupResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Đi Đà Lạt' })
  name: string;

  @ApiProperty({
    example: 'Chi tiêu cho chuyến đi',
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ enum: GroupStatus, example: GroupStatus.ACTIVE })
  status: GroupStatus;

  @ApiProperty({ type: GroupUserSummaryDto })
  owner: GroupUserSummaryDto;

  @ApiProperty({
    enum: GroupMemberRole,
    description: 'Vai trò của bạn trong nhóm',
  })
  myRole: GroupMemberRole;

  @ApiProperty({ example: 3 })
  memberCount: number;

  @ApiProperty({ example: '2026-10-17T05:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-17T05:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    type: GroupSummaryDto,
    description: 'Số liệu chi tiêu của nhóm. Chỉ tính flow=expense.',
  })
  summary: GroupSummaryDto;
}

export class PaginatedGroupsResponseDto {
  @ApiProperty({ type: [GroupResponseDto] })
  data: GroupResponseDto[];

  @ApiProperty({ example: { page: 1, limit: 20, total: 2 } })
  meta: { page: number; limit: number; total: number };
}

export class GroupMemberResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'Lena', type: String, nullable: true })
  name: string | null;

  @ApiProperty({ example: 'SP8K4M2Q' })
  inviteId: string;

  @ApiProperty({ enum: GroupMemberRole })
  role: GroupMemberRole;

  @ApiProperty({ example: '2026-10-17T05:00:00.000Z' })
  joinedAt: Date;
}

export class GroupInvitationResponseDto {
  @ApiProperty({ example: UUID_EXAMPLE, format: 'uuid' })
  id: string;

  @ApiProperty({ enum: GroupInvitationStatus })
  status: GroupInvitationStatus;

  @ApiProperty({ example: { id: UUID_EXAMPLE, name: 'Đi Đà Lạt' } })
  group: { id: string; name: string };

  @ApiProperty({ type: GroupUserSummaryDto })
  inviter: GroupUserSummaryDto;

  @ApiProperty({ type: GroupUserSummaryDto })
  invitee: GroupUserSummaryDto;

  @ApiProperty({ example: '2026-10-17T05:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-17T05:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({
    example: '2026-10-24T05:00:00.000Z',
    type: Date,
    nullable: true,
  })
  expiresAt: Date | null;
}

export class PaginatedInvitationsResponseDto {
  @ApiProperty({ type: [GroupInvitationResponseDto] })
  data: GroupInvitationResponseDto[];

  @ApiProperty({ example: { page: 1, limit: 20, total: 1 } })
  meta: { page: number; limit: number; total: number };
}
