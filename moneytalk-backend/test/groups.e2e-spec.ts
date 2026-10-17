/**
 * E2E cho Group & Shared Expenses. Cần DATABASE_URL trỏ tới DB test đã migrate.
 * R2 được thay bằng fake (giữ luật ownership của ảnh).
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import '../src/config/env';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DRIZZLE } from '../src/common/constants/injection-tokens';
import { AppException } from '../src/common/exceptions';
import type { Database } from '../src/database/database.types';
import {
  groupInvitationsTable,
  groupsTable,
  transactionsTable,
} from '../src/database/schema';
import { UploadsService } from '../src/modules/uploads/uploads.service';

const CDN = 'https://cdn.test/';

class FakeUploadsService {
  resolveUploadedImage(userId: string, imageUrl: string) {
    const key = imageUrl.replace(CDN, '');
    if (!key.startsWith(`transactions/${userId}/`)) {
      throw AppException.invalidImage('Ảnh không thuộc về bạn');
    }
    return { key, url: imageUrl, contentType: 'image/jpeg', size: 1 };
  }

  deleteObject() {
    return { deleted: true };
  }
}

type Session = { id: string; token: string; inviteId: string };
type Body = Record<string, any>;

describe('Groups (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;

  const http = () => request(app.getHttpServer());
  const auth = (s: Session) => ({ Authorization: `Bearer ${s.token}` });

  async function register(name: string): Promise<Session> {
    const res = await http()
      .post('/api/auth/register')
      .send({
        email: `grp.${randomUUID()}@gmail.com`,
        password: 'Secret123!',
        name,
      })
      .expect(201);
    const body = res.body as Body;
    return {
      id: body.user.id,
      token: body.accessToken,
      inviteId: body.user.inviteId,
    };
  }

  function createTx(s: Session, extra: Body = {}) {
    return http()
      .post('/api/transactions')
      .set(auth(s))
      .send({
        amount: 100000,
        flow: 'expense',
        imageUrl: `${CDN}transactions/${s.id}/${randomUUID()}.jpg`,
        spentAt: '2026-10-17T10:00:00+07:00',
        ...extra,
      });
  }

  async function createGroup(owner: Session, name = 'Đi Đà Lạt') {
    const res = await http()
      .post('/api/groups')
      .set(auth(owner))
      .send({ name, description: 'Chi tiêu cho chuyến đi' })
      .expect(201);
    return res.body as Body;
  }

  function invite(owner: Session, groupId: string, inviteId: string) {
    return http()
      .post(`/api/groups/${groupId}/invitations`)
      .set(auth(owner))
      .send({ inviteId });
  }

  async function addMember(owner: Session, groupId: string, member: Session) {
    const inv = (await invite(owner, groupId, member.inviteId).expect(201))
      .body as Body;
    await http()
      .post(`/api/group-invitations/${inv.id}/accept`)
      .set(auth(member))
      .expect(200);
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UploadsService)
      .useClass(FakeUploadsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get<Database>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invite ID', () => {
    it('user mới có inviteId 8 ký tự, không trùng, không có O/0/I/1', async () => {
      const users = await Promise.all([1, 2, 3].map((n) => register(`U${n}`)));
      const ids = users.map((u) => u.inviteId);
      for (const id of ids) expect(id).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(new Set(ids).size).toBe(ids.length);

      const me = (await http().get('/api/auth/me').set(auth(users[0])))
        .body as Body;
      expect(me.inviteId).toBe(users[0].inviteId);
    });

    it('không đổi được inviteId qua PATCH /users/:id', async () => {
      const u = await register('Patch');
      await http()
        .patch(`/api/users/${u.id}`)
        .set(auth(u))
        .send({ inviteId: 'AAAAAAAA' })
        .expect(400);
    });

    it('lookup chỉ trả inviteId + name, chuẩn hoá mã, có rate limit', async () => {
      const a = await register('Lookup A');
      const b = await register('Lookup B');
      const messy = ` ${b.inviteId.slice(0, 4).toLowerCase()}-${b.inviteId.slice(4)} `;

      const res = await http()
        .get('/api/users/lookup')
        .query({ inviteId: messy })
        .set(auth(a))
        .expect(200);
      expect(res.body).toEqual({ inviteId: b.inviteId, name: 'Lookup B' });

      const missing = await http()
        .get('/api/users/lookup?inviteId=ZZZZZZZZ')
        .set(auth(a))
        .expect(404);
      expect((missing.body as Body).code).toBe('USER_NOT_FOUND');

      // Đã dùng 2 lượt; thêm 18 lượt nữa hết quota 20/phút
      for (let i = 0; i < 18; i++) {
        await http()
          .get(`/api/users/lookup?inviteId=${b.inviteId}`)
          .set(auth(a));
      }
      const limited = await http()
        .get(`/api/users/lookup?inviteId=${b.inviteId}`)
        .set(auth(a))
        .expect(429);
      expect((limited.body as Body).code).toBe('RATE_LIMITED');
    });
  });

  describe('Group & membership', () => {
    it('tạo nhóm → owner là thành viên OWNER, nhóm ACTIVE', async () => {
      const a = await register('Owner');
      const group = await createGroup(a);
      expect(group).toMatchObject({
        status: 'ACTIVE',
        myRole: 'OWNER',
        memberCount: 1,
        owner: { id: a.id },
      });

      const list = (await http().get('/api/groups').set(auth(a)).expect(200))
        .body as Body;
      expect(list.meta.total).toBe(1);
      expect(list.data[0].id).toBe(group.id);

      const members = (
        await http()
          .get(`/api/groups/${group.id}/members`)
          .set(auth(a))
          .expect(200)
      ).body as Body[];
      expect(members).toEqual([
        expect.objectContaining({ userId: a.id, role: 'OWNER' }),
      ]);
      expect(members[0].email).toBeUndefined();
    });

    it('người ngoài không xem được; member không sửa / giải tán được', async () => {
      const a = await register('Owner');
      const b = await register('Member');
      const outsider = await register('Outsider');
      const group = await createGroup(a);
      await addMember(a, group.id, b);

      const res = await http()
        .get(`/api/groups/${group.id}`)
        .set(auth(outsider))
        .expect(404);
      expect((res.body as Body).code).toBe('GROUP_NOT_FOUND');
      await http()
        .get(`/api/groups/${group.id}/members`)
        .set(auth(outsider))
        .expect(404);

      const patch = await http()
        .patch(`/api/groups/${group.id}`)
        .set(auth(b))
        .send({ name: 'Hack' })
        .expect(403);
      expect((patch.body as Body).code).toBe('GROUP_OWNER_ONLY');
      await http().delete(`/api/groups/${group.id}`).set(auth(b)).expect(403);
      await http()
        .patch(`/api/groups/${group.id}`)
        .set(auth(a))
        .send({ status: 'ARCHIVED' })
        .expect(400);

      const updated = await http()
        .patch(`/api/groups/${group.id}`)
        .set(auth(a))
        .send({ name: 'Đà Lạt Trip', description: '' })
        .expect(200);
      expect(updated.body).toMatchObject({
        name: 'Đà Lạt Trip',
        description: null,
        memberCount: 2,
      });
    });

    it('owner không rời được; member rời / bị xoá thì mất quyền ngay', async () => {
      const a = await register('Owner');
      const b = await register('Leaver');
      const c = await register('Removed');
      const group = await createGroup(a);
      await addMember(a, group.id, b);
      await addMember(a, group.id, c);
      const bTx = (await createTx(b, { groupId: group.id }).expect(201))
        .body as Body;

      const ownerLeave = await http()
        .post(`/api/groups/${group.id}/leave`)
        .set(auth(a))
        .expect(409);
      expect((ownerLeave.body as Body).code).toBe('GROUP_OWNER_CANNOT_LEAVE');

      await http()
        .post(`/api/groups/${group.id}/leave`)
        .set(auth(b))
        .expect(200);
      await http().get(`/api/groups/${group.id}`).set(auth(b)).expect(404);
      await http()
        .get(`/api/groups/${group.id}/transactions/${bTx.id}`)
        .set(auth(b))
        .expect(404);

      await http()
        .delete(`/api/groups/${group.id}/members/${a.id}`)
        .set(auth(a))
        .expect(400);
      await http()
        .delete(`/api/groups/${group.id}/members/${c.id}`)
        .set(auth(b))
        .expect(404);
      await http()
        .delete(`/api/groups/${group.id}/members/${c.id}`)
        .set(auth(a))
        .expect(200);
      await http()
        .get(`/api/groups/${group.id}/transactions`)
        .set(auth(c))
        .expect(404);

      // Giao dịch nhóm của người đã rời vẫn còn
      const list = (
        await http()
          .get(`/api/groups/${group.id}/transactions`)
          .set(auth(a))
          .expect(200)
      ).body as Body;
      expect(list.data.map((t: Body) => t.id)).toContain(bTx.id);

      // Người đã rời được mời lại bình thường
      await addMember(a, group.id, b);
      await http().get(`/api/groups/${group.id}`).set(auth(b)).expect(200);
    });

    it('chuyển quyền sở hữu cập nhật cả owner_id lẫn role', async () => {
      const a = await register('Old owner');
      const b = await register('New owner');
      const outsider = await register('Outsider');
      const group = await createGroup(a);
      await addMember(a, group.id, b);

      await http()
        .post(`/api/groups/${group.id}/transfer-ownership`)
        .set(auth(a))
        .send({ newOwnerId: outsider.id })
        .expect(404);
      await http()
        .post(`/api/groups/${group.id}/transfer-ownership`)
        .set(auth(b))
        .send({ newOwnerId: b.id })
        .expect(403);

      const res = await http()
        .post(`/api/groups/${group.id}/transfer-ownership`)
        .set(auth(a))
        .send({ newOwnerId: b.id })
        .expect(200);
      expect(res.body).toMatchObject({ myRole: 'MEMBER', owner: { id: b.id } });

      const members = (
        await http().get(`/api/groups/${group.id}/members`).set(auth(b))
      ).body as Body[];
      expect(members).toEqual([
        expect.objectContaining({ userId: b.id, role: 'OWNER' }),
        expect.objectContaining({ userId: a.id, role: 'MEMBER' }),
      ]);

      // Owner cũ giờ rời được, owner mới thì không
      await http()
        .post(`/api/groups/${group.id}/leave`)
        .set(auth(b))
        .expect(409);
      await http()
        .post(`/api/groups/${group.id}/leave`)
        .set(auth(a))
        .expect(200);
    });
  });

  describe('Invitations', () => {
    it('các luật gửi lời mời', async () => {
      const a = await register('Owner');
      const b = await register('Member');
      const c = await register('Target');
      const group = await createGroup(a);
      await addMember(a, group.id, b);

      const self = await invite(a, group.id, a.inviteId).expect(400);
      expect((self.body as Body).code).toBe('GROUP_INVITE_SELF');
      const member = await invite(a, group.id, b.inviteId).expect(409);
      expect((member.body as Body).code).toBe('GROUP_ALREADY_MEMBER');
      const notOwner = await invite(b, group.id, c.inviteId).expect(403);
      expect((notOwner.body as Body).code).toBe('GROUP_OWNER_ONLY');
      await invite(a, group.id, 'ZZZZZZZZ').expect(404);

      await invite(a, group.id, c.inviteId.toLowerCase()).expect(201);
      const dup = await invite(a, group.id, c.inviteId).expect(409);
      expect((dup.body as Body).code).toBe('INVITATION_ALREADY_PENDING');

      // Chưa accept thì chưa là thành viên
      await http().get(`/api/groups/${group.id}`).set(auth(c)).expect(404);
    });

    it('chỉ người nhận accept/reject; chỉ người gửi huỷ; đã xử lý thì thôi', async () => {
      const a = await register('Owner');
      const b = await register('Invitee');
      const outsider = await register('Outsider');
      const group = await createGroup(a);

      const inv = (await invite(a, group.id, b.inviteId).expect(201))
        .body as Body;
      expect(inv).toMatchObject({
        status: 'PENDING',
        group: { id: group.id },
        inviter: { id: a.id },
        invitee: { id: b.id },
      });
      expect(inv.invitee.email).toBeUndefined();

      const received = (
        await http()
          .get('/api/group-invitations/received?status=PENDING')
          .set(auth(b))
          .expect(200)
      ).body as Body;
      expect(received.data.map((i: Body) => i.id)).toEqual([inv.id]);
      const sent = (
        await http().get('/api/group-invitations/sent').set(auth(a))
      ).body as Body;
      expect(sent.data.map((i: Body) => i.id)).toEqual([inv.id]);

      await http()
        .post(`/api/group-invitations/${inv.id}/accept`)
        .set(auth(outsider))
        .expect(404);
      await http()
        .post(`/api/group-invitations/${inv.id}/accept`)
        .set(auth(a))
        .expect(403);
      await http()
        .delete(`/api/group-invitations/${inv.id}`)
        .set(auth(b))
        .expect(403);

      await http()
        .post(`/api/group-invitations/${inv.id}/reject`)
        .set(auth(b))
        .expect(200)
        .expect((res) => expect((res.body as Body).status).toBe('REJECTED'));
      const again = await http()
        .post(`/api/group-invitations/${inv.id}/accept`)
        .set(auth(b))
        .expect(409);
      expect((again.body as Body).code).toBe('INVITATION_NOT_PENDING');

      // Mời lại rồi huỷ
      const inv2 = (await invite(a, group.id, b.inviteId).expect(201))
        .body as Body;
      await http()
        .delete(`/api/group-invitations/${inv2.id}`)
        .set(auth(a))
        .expect(200)
        .expect((res) => expect((res.body as Body).status).toBe('CANCELLED'));
      await http()
        .post(`/api/group-invitations/${inv2.id}/accept`)
        .set(auth(b))
        .expect(409);
      const [row] = await db
        .select()
        .from(groupInvitationsTable)
        .where(eq(groupInvitationsTable.id, inv2.id));
      expect(row.status).toBe('CANCELLED');
    });

    it('lời mời hết hạn không accept được và được đánh dấu EXPIRED', async () => {
      const a = await register('Owner');
      const b = await register('Late');
      const group = await createGroup(a);
      const inv = (await invite(a, group.id, b.inviteId).expect(201))
        .body as Body;

      await db
        .update(groupInvitationsTable)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(groupInvitationsTable.id, inv.id));

      const res = await http()
        .post(`/api/group-invitations/${inv.id}/accept`)
        .set(auth(b))
        .expect(409);
      expect((res.body as Body).code).toBe('INVITATION_EXPIRED');

      const list = (
        await http().get('/api/group-invitations/received').set(auth(b))
      ).body as Body;
      expect(list.data[0].status).toBe('EXPIRED');
      await http().get(`/api/groups/${group.id}`).set(auth(b)).expect(404);

      // Hết hạn thì mời lại được
      await invite(a, group.id, b.inviteId).expect(201);
    });

    it('2 request accept đồng thời chỉ tạo 1 membership', async () => {
      const a = await register('Owner');
      const b = await register('Racer');
      const group = await createGroup(a);
      const inv = (await invite(a, group.id, b.inviteId).expect(201))
        .body as Body;

      const results = await Promise.all(
        [1, 2, 3].map(() =>
          http().post(`/api/group-invitations/${inv.id}/accept`).set(auth(b)),
        ),
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 409, 409]);

      const detail = (await http().get(`/api/groups/${group.id}`).set(auth(a)))
        .body as Body;
      expect(detail.memberCount).toBe(2);
    });
  });

  describe('Transactions', () => {
    it('cá nhân lưu groupId null; nhóm lưu đúng groupId; tách khỏi /me và insights', async () => {
      const a = await register('Owner');
      const b = await register('Member');
      const group = await createGroup(a);
      await addMember(a, group.id, b);

      const personal = (await createTx(a, { amount: 30000 }).expect(201))
        .body as Body;
      expect(personal.groupId).toBeNull();
      const explicitNull = (await createTx(a, { groupId: null }).expect(201))
        .body as Body;
      expect(explicitNull.groupId).toBeNull();

      const shared = (
        await createTx(a, { amount: 500000, groupId: group.id }).expect(201)
      ).body as Body;
      expect(shared).toMatchObject({
        groupId: group.id,
        createdBy: { id: a.id, name: 'Owner' },
      });
      const [row] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, shared.id));
      expect(row.groupId).toBe(group.id);
      expect(row.userId).toBe(a.id);

      const mine = (
        await http().get('/api/transactions/me').set(auth(a)).expect(200)
      ).body as Body;
      expect(mine.data.map((t: Body) => t.id).sort()).toEqual(
        [personal.id, explicitNull.id].sort(),
      );
      await http()
        .get(`/api/transactions/me/${shared.id}`)
        .set(auth(a))
        .expect(404);

      const insights = (
        await http()
          .get('/api/insights/summary?periodType=month&date=2026-10-17')
          .set(auth(a))
          .expect(200)
      ).body as Body;
      expect(insights.totalSpent).toBe(130000);

      // Member thấy giao dịch nhóm của owner
      const groupList = (
        await http()
          .get(`/api/groups/${group.id}/transactions`)
          .set(auth(b))
          .expect(200)
      ).body as Body;
      expect(groupList.data.map((t: Body) => t.id)).toEqual([shared.id]);
      await http()
        .get(`/api/groups/${group.id}/transactions/${shared.id}`)
        .set(auth(b))
        .expect(200);
    });

    it('người ngoài / sai nhóm / không phải người tạo đều bị chặn', async () => {
      const a = await register('Owner');
      const b = await register('Member');
      const outsider = await register('Outsider');
      const group = await createGroup(a);
      const other = await createGroup(a, 'Nhóm khác');
      await addMember(a, group.id, b);

      const res = await createTx(outsider, { groupId: group.id }).expect(400);
      expect((res.body as Body).code).toBe('INVALID_REFERENCE');
      await createTx(outsider, { groupId: randomUUID() }).expect(400);

      const tx = (await createTx(a, { groupId: group.id }).expect(201))
        .body as Body;

      await http()
        .get(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(outsider))
        .expect(404);
      // Đúng id giao dịch nhưng sai nhóm trên URL
      await http()
        .get(`/api/groups/${other.id}/transactions/${tx.id}`)
        .set(auth(a))
        .expect(404);

      const notCreator = await http()
        .patch(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(b))
        .send({ amount: 1 })
        .expect(403);
      expect((notCreator.body as Body).code).toBe('TRANSACTION_NOT_CREATOR');
      await http()
        .delete(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(b))
        .expect(403);

      // Không đổi groupId qua PATCH
      await http()
        .patch(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(a))
        .send({ groupId: other.id })
        .expect(400);
      await http()
        .patch(`/api/transactions/me/${tx.id}`)
        .set(auth(a))
        .send({ amount: 1 })
        .expect(404);

      await http()
        .patch(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(a))
        .send({ amount: 250000 })
        .expect(200)
        .expect((r) => expect((r.body as Body).amount).toBe(250000));
      await http()
        .delete(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(a))
        .expect(200);
    });
  });

  describe('Group summary', () => {
    it('list + detail trả summary: chỉ expense, tháng này theo giờ VN, khoản chi mới nhất', async () => {
      const a = await register('Owner');
      const b = await register('Minh');
      const group = await createGroup(a, 'Có chi tiêu');
      const empty = await createGroup(a, 'Chưa chi');
      await addMember(a, group.id, b);

      const types = (
        await http().get('/api/transaction-types?flow=expense').set(auth(a))
      ).body as Body[];
      const food = types.find((t) => t.code === 'food')!;

      const now = Date.now();
      const iso = (ms: number) => new Date(ms).toISOString();
      // Tháng trước (40 ngày trước luôn thuộc tháng khác)
      await createTx(a, {
        groupId: group.id,
        amount: 3000000,
        spentAt: iso(now - 40 * 24 * 3600 * 1000),
      }).expect(201);
      // Tháng này
      await createTx(a, {
        groupId: group.id,
        amount: 800000,
        spentAt: iso(now - 60 * 1000),
      }).expect(201);
      const latest = (
        await createTx(b, {
          groupId: group.id,
          amount: 450000,
          description: 'Lẩu gà lá é',
          typeId: food.id,
          spentAt: iso(now),
        }).expect(201)
      ).body as Body;
      // Income không được cộng; giao dịch cá nhân không được cộng
      await createTx(a, {
        groupId: group.id,
        flow: 'income',
        amount: 9999999,
        spentAt: iso(now + 1000),
      }).expect(201);
      await createTx(a, { amount: 7777777, spentAt: iso(now) }).expect(201);

      const detail = (
        await http().get(`/api/groups/${group.id}`).set(auth(b)).expect(200)
      ).body as Body;
      expect(detail.summary).toEqual({
        monthStart: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        monthSpent: 1250000,
        totalSpent: 4250000,
        expenseCount: 3,
        latestExpense: {
          id: latest.id,
          description: 'Lẩu gà lá é',
          type: { id: food.id, code: 'food', name: food.name },
          amount: 450000,
          spentAt: latest.spentAt,
          createdBy: { id: b.id, name: 'Minh' },
        },
      });

      const list = (await http().get('/api/groups').set(auth(a)).expect(200))
        .body as Body;
      const byId = Object.fromEntries(
        (list.data as Body[]).map((g) => [g.id, g]),
      );
      expect(byId[group.id].summary).toEqual(detail.summary);
      expect(byId[empty.id].summary).toEqual({
        monthStart: detail.summary.monthStart,
        monthSpent: 0,
        totalSpent: 0,
        expenseCount: 0,
        latestExpense: null,
      });
    });
  });

  describe('Giải tán nhóm', () => {
    it('ARCHIVED, không xoá dữ liệu, chặn mọi thao tác, huỷ lời mời đang chờ', async () => {
      const a = await register('Owner');
      const b = await register('Member');
      const c = await register('Pending');
      const group = await createGroup(a);
      await addMember(a, group.id, b);
      const tx = (await createTx(b, { groupId: group.id }).expect(201))
        .body as Body;
      const pending = (await invite(a, group.id, c.inviteId).expect(201))
        .body as Body;

      await http()
        .delete(`/api/groups/${group.id}`)
        .set(auth(a))
        .expect(200)
        .expect({ archived: true, id: group.id });

      const [row] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, group.id));
      expect(row.status).toBe('ARCHIVED');
      expect(row.archivedAt).not.toBeNull();
      const [txRow] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, tx.id));
      expect(txRow).toBeDefined();

      for (const s of [a, b]) {
        const res = await http()
          .get(`/api/groups/${group.id}`)
          .set(auth(s))
          .expect(409);
        expect((res.body as Body).code).toBe('GROUP_ARCHIVED');
        const list = (await http().get('/api/groups').set(auth(s)))
          .body as Body;
        expect(list.data.some((g: Body) => g.id === group.id)).toBe(false);
      }

      await http()
        .get(`/api/groups/${group.id}/transactions`)
        .set(auth(b))
        .expect(409);
      await createTx(b, { groupId: group.id }).expect(409);
      await http()
        .patch(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(b))
        .send({ amount: 1 })
        .expect(409);
      await http()
        .delete(`/api/groups/${group.id}/transactions/${tx.id}`)
        .set(auth(b))
        .expect(409);
      await http().delete(`/api/groups/${group.id}`).set(auth(a)).expect(409);
      await invite(a, group.id, c.inviteId).expect(409);

      const accept = await http()
        .post(`/api/group-invitations/${pending.id}/accept`)
        .set(auth(c))
        .expect(409);
      expect((accept.body as Body).code).toBe('INVITATION_NOT_PENDING');
    });

    it('giải tán đồng thời với tạo giao dịch: không có giao dịch nào lọt sau khi giải tán', async () => {
      const a = await register('Owner');
      const group = await createGroup(a);

      const results = await Promise.all([
        ...[1, 2, 3, 4].map(() => createTx(a, { groupId: group.id })),
        http().delete(`/api/groups/${group.id}`).set(auth(a)),
        ...[5, 6, 7, 8].map(() => createTx(a, { groupId: group.id })),
      ]);
      for (const r of results) expect([200, 201, 409]).toContain(r.status);

      const [g] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, group.id));
      expect(g.status).toBe('ARCHIVED');

      const rows = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.groupId, group.id));
      const created = results.filter((r) => r.status === 201).length;
      expect(rows.length).toBe(created);

      // Sau khi giải tán xong thì không tạo thêm được
      await createTx(a, { groupId: group.id }).expect(409);
    });
  });
});
