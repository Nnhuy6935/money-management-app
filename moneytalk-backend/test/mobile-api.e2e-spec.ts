/**
 * E2E cho change request mobile (S-01, M-01..M-09, N-01..N-09, NF-2..NF-4).
 * Cần DATABASE_URL trỏ tới DB test đã migrate. R2 được thay bằng fake.
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import '../src/config/env';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../src/common/constants/injection-tokens';
import { AppException } from '../src/common/exceptions';
import type { Database } from '../src/database/database.types';
import { pendingUploadsTable } from '../src/database/schema';
import { UploadsCleanupService } from '../src/modules/uploads/uploads-cleanup.service';
import { UploadsService } from '../src/modules/uploads/uploads.service';

const CDN = 'https://cdn.test/';

/** Giữ đúng luật ownership của UploadsService thật, bỏ phần gọi R2. */
class FakeUploadsService {
  readonly deletedKeys: string[] = [];

  resolveUploadedImage(userId: string, imageUrl: string) {
    const key = imageUrl.replace(CDN, '');
    if (!key.startsWith(`transactions/${userId}/`)) {
      throw AppException.invalidImage('Ảnh không thuộc về bạn');
    }
    return { key, url: imageUrl, contentType: 'image/jpeg', size: 1 };
  }

  deleteObject(_userId: string, key: string) {
    this.deletedKeys.push(key);
    return { deleted: true };
  }
}

type Session = {
  id: string;
  token: string;
  refreshToken: string;
};

type Body = Record<string, any>;

describe('Mobile API (e2e)', () => {
  let app: INestApplication<App>;
  let A: Session;
  let B: Session;
  let defaultTypes: Body[];
  let cash: Body;

  const http = () => request(app.getHttpServer());
  const auth = (s: Session) => ({ Authorization: `Bearer ${s.token}` });
  const imageOf = (s: Session) =>
    `${CDN}transactions/${s.id}/${randomUUID()}.jpg`;
  const typeByCode = (code: string, flow = 'expense') =>
    defaultTypes.find((t) => t.code === code && t.flow === flow)!;
  const randomColor = () =>
    `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()}`;

  async function register(name: string): Promise<Session> {
    const res = await http()
      .post('/api/auth/register')
      .send({
        email: `e2e.${randomUUID()}@gmail.com`,
        password: 'Secret123!',
        name: `  ${name}  `,
      })
      .expect(201);
    const body = res.body as Body;
    expect(body.user.name).toBe(name);
    expect(body.expiresIn).toBeGreaterThan(0);
    return {
      id: body.user.id,
      token: body.accessToken,
      refreshToken: body.refreshToken,
    };
  }

  function createTx(s: Session, extra: Body = {}) {
    return http()
      .post('/api/transactions')
      .set(auth(s))
      .send({
        amount: 100000,
        flow: 'expense',
        imageUrl: imageOf(s),
        spentAt: new Date().toISOString(),
        ...extra,
      });
  }

  function createType(s: Session, extra: Body = {}) {
    return http()
      .post('/api/transaction-types')
      .set(auth(s))
      .send({
        name: `Custom ${randomUUID().slice(0, 8)}`,
        flow: 'expense',
        iconKey: 'coffee',
        color: randomColor(),
        ...extra,
      });
  }

  function createPaymentMethod(s: Session, extra: Body = {}) {
    return http()
      .post('/api/payment-methods')
      .set(auth(s))
      .send({
        name: 'Card',
        iconKey: 'card',
        color: randomColor(),
        ...extra,
      });
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

    A = await register('Alice');
    B = await register('Bob');

    defaultTypes = (
      await http().get('/api/transaction-types').set(auth(B)).expect(200)
    ).body as Body[];
    cash = (
      (await http().get('/api/payment-methods').set(auth(B)).expect(200))
        .body as Body[]
    ).find((m) => m.code === 'cash')!;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('M-07 / N-05 seed', () => {
    it('trả loại mặc định có field hiển thị, theo sortOrder', () => {
      const food = typeByCode('food');
      expect(food).toMatchObject({
        name: 'Food & Dining',
        iconKey: 'food',
        color: '#55C995',
        isDefault: true,
        sortOrder: 1,
      });
      expect(typeByCode('other', 'income')).toBeDefined();
      const orders = defaultTypes.map((t) => t.sortOrder as number);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });

    it('có phương thức cash mặc định', () => {
      expect(cash).toMatchObject({
        name: 'Cash',
        color: '#55C995',
        isDefault: true,
      });
    });
  });

  describe('M-01 / M-02 tạo giao dịch', () => {
    it('chấp nhận amount 0, trả amount integer + field mới', async () => {
      const res = await createTx(B, {
        amount: 0,
        description: '   ',
        paymentMethodId: cash.id,
        typeId: typeByCode('food').id,
      }).expect(201);
      const body = res.body as Body;
      expect(body.amount).toBe(0);
      expect(body.description).toBeNull();
      expect(body.paymentMethod).toMatchObject({ code: 'cash' });
      expect(body.type).toMatchObject({ code: 'food', iconKey: 'food' });
      expect(body.hasReceiptItems).toBe(false);
      expect(body.receiptItems).toEqual([]);
    });

    it('lưu receipt items theo thứ tự, giữ amount null', async () => {
      const res = await createTx(B, {
        amount: 185000,
        receiptItems: [
          {
            name: ' Phin sữa đá ',
            amount: 55000,
            typeId: typeByCode('food').id,
          },
          { name: 'Bánh mì', amount: null, typeId: null },
        ],
      }).expect(201);
      const body = res.body as Body;
      expect(body.hasReceiptItems).toBe(true);
      expect(body.receiptItems).toMatchObject([
        { name: 'Phin sữa đá', amount: 55000 },
        { name: 'Bánh mì', amount: null, typeId: null },
      ]);
    });

    it('receipt item sai → không lưu gì', async () => {
      const before = (
        await http().get('/api/transactions/me').set(auth(B)).expect(200)
      ).body as Body;
      await createTx(B, {
        receiptItems: [{ name: '', amount: 1 }],
      }).expect(400);
      await createTx(B, {
        receiptItems: [{ name: 'x', typeId: randomUUID() }],
      }).expect(400);
      const after = (
        await http().get('/api/transactions/me').set(auth(B)).expect(200)
      ).body as Body;
      expect(after.meta.total).toBe(before.meta.total);
    });

    it('bắt buộc spentAt có offset', async () => {
      await createTx(B, { spentAt: '2026-10-16T12:30:00' }).expect(400);
      await createTx(B, { spentAt: undefined }).expect(400);
    });

    it('type lệch flow → 400 TYPE_FLOW_MISMATCH', async () => {
      const res = await createTx(B, {
        flow: 'income',
        typeId: typeByCode('food').id,
      }).expect(400);
      expect((res.body as Body).code).toBe('TYPE_FLOW_MISMATCH');
    });
  });

  describe('M-03 lọc theo spentAt', () => {
    it('giao dịch lùi ngày nằm đúng ngày, sắp spentAt desc', async () => {
      const day = '2026-03-14';
      await createTx(B, { spentAt: `${day}T08:00:00+07:00` }).expect(201);
      await createTx(B, { spentAt: `${day}T23:30:00+07:00` }).expect(201);
      // 00:30 ngày hôm sau giờ VN — không được lọt vào `day`
      await createTx(B, { spentAt: '2026-03-14T17:30:00Z' }).expect(201);

      const res = await http()
        .get(`/api/transactions/me?date=${day}`)
        .set(auth(B))
        .expect(200);
      const body = res.body as Body;
      expect(body.meta.total).toBe(2);
      const times = (body.data as Body[]).map((t) =>
        new Date(t.spentAt as string).getTime(),
      );
      expect(times[0]).toBeGreaterThan(times[1]);

      const month = await http()
        .get('/api/transactions/me?from=2026-03-01&to=2026-03-15&limit=500')
        .set(auth(B))
        .expect(200);
      expect((month.body as Body).meta.total).toBe(3);
    });
  });

  describe('M-06 / N-02 loại custom', () => {
    it('trùng màu → 409 với cùng user, user khác vẫn dùng được', async () => {
      const color = randomColor();
      const created = await createType(B, {
        color: color.slice(1).toLowerCase(),
        description: '',
      }).expect(201);
      const body = created.body as Body;
      expect(body.color).toBe(color);
      expect(body.description).toBeNull();
      expect(body.isDefault).toBe(false);

      const dup = await createType(B, { color }).expect(409);
      expect((dup.body as Body).code).toBe('TYPE_COLOR_IN_USE');
      await createType(A, { color }).expect(201);

      const list = (
        await http().get('/api/transaction-types').set(auth(B)).expect(200)
      ).body as Body[];
      expect(list[list.length - 1].id).toBe(body.id);
    });

    it('không dùng được màu của loại mặc định', async () => {
      await createType(B, { color: '#55C995' }).expect(409);
    });

    it('PATCH đổi field, check màu loại trừ chính nó, chặn loại mặc định', async () => {
      const type = (await createType(B).expect(201)).body as Body;
      const res = await http()
        .patch(`/api/transaction-types/${type.id}`)
        .set(auth(B))
        .send({ name: 'Renamed', color: type.color, description: 'x' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Renamed', description: 'x' });

      await http()
        .patch(`/api/transaction-types/${type.id}`)
        .set(auth(B))
        .send({ flow: 'income' })
        .expect(400);

      const def = await http()
        .patch(`/api/transaction-types/${typeByCode('food').id}`)
        .set(auth(B))
        .send({ name: 'Hack' })
        .expect(403);
      expect((def.body as Body).code).toBe('DEFAULT_TYPE_READ_ONLY');
    });
  });

  describe('N-03 / N-04 xoá loại', () => {
    it('chuyển giao dịch + receipt item của user sang other', async () => {
      const type = (await createType(B).expect(201)).body as Body;
      const tx1 = (
        await createTx(B, {
          typeId: type.id,
          receiptItems: [{ name: 'item', amount: 1, typeId: type.id }],
        }).expect(201)
      ).body as Body;
      await createTx(B, { typeId: type.id }).expect(201);

      const impact = await http()
        .get(`/api/transaction-types/${type.id}/delete-impact`)
        .set(auth(B))
        .expect(200);
      expect(impact.body).toMatchObject({
        transactionCount: 2,
        replacement: { code: 'other' },
      });

      const del = await http()
        .delete(`/api/transaction-types/${type.id}`)
        .set(auth(B))
        .expect(200);
      expect(del.body).toEqual({ deleted: true, movedCount: 2 });

      const detail = (
        await http()
          .get(`/api/transactions/me/${tx1.id}`)
          .set(auth(B))
          .expect(200)
      ).body as Body;
      const other = typeByCode('other');
      expect(detail.type.id).toBe(other.id);
      expect(detail.receiptItems[0].typeId).toBe(other.id);
    });

    it('không xoá được loại mặc định', async () => {
      await http()
        .delete(`/api/transaction-types/${typeByCode('food').id}`)
        .set(auth(B))
        .expect(403);
    });
  });

  describe('N-06 / N-07 / N-08 payment methods', () => {
    it('tạo, sửa, xoá → giao dịch chuyển sang cash', async () => {
      const pm = (await createPaymentMethod(B).expect(201)).body as Body;
      expect(pm).toMatchObject({ code: 'card', isDefault: false });

      const second = (await createPaymentMethod(B).expect(201)).body as Body;
      expect(second.code).toBe('card_2');

      await createPaymentMethod(B, { color: pm.color }).expect(409);
      await createPaymentMethod(B, { color: cash.color }).expect(409);

      await http()
        .patch(`/api/payment-methods/${pm.id}`)
        .set(auth(B))
        .send({ name: 'Visa', color: pm.color })
        .expect(200);
      await http()
        .patch(`/api/payment-methods/${cash.id}`)
        .set(auth(B))
        .send({ name: 'Hack' })
        .expect(403);

      const tx = (await createTx(B, { paymentMethodId: pm.id }).expect(201))
        .body as Body;

      const impact = await http()
        .get(`/api/payment-methods/${pm.id}/delete-impact`)
        .set(auth(B))
        .expect(200);
      expect(impact.body).toMatchObject({
        transactionCount: 1,
        replacement: { code: 'cash' },
      });

      await http()
        .delete(`/api/payment-methods/${pm.id}`)
        .set(auth(B))
        .expect(200)
        .expect({ deleted: true, movedCount: 1 });

      const detail = (
        await http().get(`/api/transactions/me/${tx.id}`).set(auth(B))
      ).body as Body;
      expect(detail.paymentMethod.code).toBe('cash');
    });
  });

  describe('N-09 insights', () => {
    it('chỉ cộng expense, đúng tuần VN, không cộng receipt item', async () => {
      const U = await register('Insights');
      // CN 2026-10-18 23:00 VN thuộc tuần 12–19/10
      await createTx(U, {
        amount: 50000,
        spentAt: '2026-10-18T23:00:00+07:00',
        typeId: typeByCode('food').id,
        receiptItems: [{ name: 'a', amount: 999999 }],
      }).expect(201);
      await createTx(U, {
        amount: 20000,
        spentAt: '2026-10-13T09:00:00+07:00',
      }).expect(201);
      await createTx(U, {
        amount: 7000000,
        flow: 'income',
        spentAt: '2026-10-14T09:00:00+07:00',
      }).expect(201);
      // Tuần trước
      await createTx(U, {
        amount: 30000,
        spentAt: '2026-10-11T23:59:00+07:00',
      }).expect(201);

      const week = (
        await http()
          .get('/api/insights/summary?periodType=week&date=2026-10-15')
          .set(auth(U))
          .expect(200)
      ).body as Body;
      expect(week).toMatchObject({
        periodStart: '2026-10-12',
        periodEnd: '2026-10-19',
        granularity: 'day',
        totalSpent: 70000,
        previousPeriodSpent: 30000,
        totalIncome: 7000000,
      });
      expect(week.buckets).toEqual([
        { date: '2026-10-13', amount: 20000 },
        { date: '2026-10-18', amount: 50000 },
      ]);
      expect(week.typeTotals).toEqual([
        expect.objectContaining({ code: 'food', amount: 50000 }),
        expect.objectContaining({ typeId: null, amount: 20000 }),
      ]);

      const year = (
        await http()
          .get('/api/insights/summary?periodType=year&date=2026-10-15')
          .set(auth(U))
          .expect(200)
      ).body as Body;
      expect(year.granularity).toBe('month');
      expect(year.buckets).toEqual([{ date: '2026-10-01', amount: 100000 }]);
    });
  });

  describe('NF-4 dọn ảnh không gắn vào giao dịch', () => {
    it('chỉ xoá ảnh quá 24h chưa dùng; giữ ảnh mới và ảnh đã gắn', async () => {
      const db = app.get<Database>(DRIZZLE);
      const uploads = app.get(UploadsService) as unknown as FakeUploadsService;
      const cleanup = app.get(UploadsCleanupService);
      const U = await register('Cleanup');
      const keyOf = () => `transactions/${U.id}/${randomUUID()}.jpg`;
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const orphan = keyOf();
      const fresh = keyOf();
      const attached = keyOf();
      await db.insert(pendingUploadsTable).values([
        { key: orphan, userId: U.id, createdAt: old },
        { key: fresh, userId: U.id },
        { key: attached, userId: U.id, createdAt: old },
      ]);

      // Tạo giao dịch với ảnh → dòng chờ dọn bị xoá
      await createTx(U, { imageUrl: `${CDN}${attached}` }).expect(201);
      const [attachedRow] = await db
        .select()
        .from(pendingUploadsTable)
        .where(eq(pendingUploadsTable.key, attached));
      expect(attachedRow).toBeUndefined();

      // Phòng hờ: dòng còn sót nhưng ảnh đang dùng → không xoá ảnh
      await db
        .insert(pendingUploadsTable)
        .values({ key: attached, userId: U.id, createdAt: old });

      await cleanup.runOnce();

      expect(uploads.deletedKeys).toContain(orphan);
      expect(uploads.deletedKeys).not.toContain(fresh);
      expect(uploads.deletedKeys).not.toContain(attached);

      const remaining = (
        await db
          .select({ key: pendingUploadsTable.key })
          .from(pendingUploadsTable)
          .where(eq(pendingUploadsTable.userId, U.id))
      ).map((row) => row.key);
      expect(remaining).toEqual([fresh]);
    });
  });

  describe('NF-3 Idempotency-Key', () => {
    it('gửi lại cùng key không tạo trùng; khác body → 422', async () => {
      const U = await register('Idem');
      const key = randomUUID();
      const payload = {
        amount: 42000,
        flow: 'expense',
        imageUrl: imageOf(U),
        spentAt: '2026-10-16T09:00:00+07:00',
      };
      const send = (body: Body, k = key) =>
        http()
          .post('/api/transactions')
          .set(auth(U))
          .set('Idempotency-Key', k)
          .send(body);

      const first = (await send(payload).expect(201)).body as Body;
      const replay = (await send(payload).expect(201)).body as Body;
      expect(replay.id).toBe(first.id);

      const reused = await send({ ...payload, amount: 1 }).expect(422);
      expect((reused.body as Body).code).toBe('IDEMPOTENCY_KEY_REUSED');

      // Request lỗi không giữ key → gửi lại (đã sửa) được
      const badKey = randomUUID();
      await send({ ...payload, typeId: randomUUID() }, badKey).expect(400);
      await send(payload, badKey).expect(201);

      // User khác dùng cùng key không đụng nhau
      await http()
        .post('/api/transactions')
        .set(auth(B))
        .set('Idempotency-Key', key)
        .send({ ...payload, imageUrl: imageOf(B) })
        .expect(201);

      const list = (
        await http().get('/api/transactions/me').set(auth(U)).expect(200)
      ).body as Body;
      expect(list.meta.total).toBe(2);
    });
  });

  describe('M-08 / N-01 auth', () => {
    it('login trả user; sai email và sai mật khẩu cùng lỗi', async () => {
      const email = `e2e.${randomUUID()}@gmail.com`;
      await http()
        .post('/api/auth/register')
        .send({ email, password: 'Secret123!' })
        .expect(201);
      const dup = await http()
        .post('/api/auth/register')
        .send({ email, password: 'Secret123!' })
        .expect(409);
      expect((dup.body as Body).code).toBe('EMAIL_IN_USE');

      const ok = await http()
        .post('/api/auth/login')
        .send({ email, password: 'Secret123!' });
      expect((ok.body as Body).user.email).toBe(email);

      const wrongPass = await http()
        .post('/api/auth/login')
        .send({ email, password: 'Wrong123!' })
        .expect(401);
      const wrongEmail = await http()
        .post('/api/auth/login')
        .send({ email: `x${email}`, password: 'Secret123!' })
        .expect(401);
      expect(wrongPass.body).toEqual(wrongEmail.body);
    });

    it('refresh xoay vòng token; logout thu hồi refresh', async () => {
      const s = await register('Refresh');

      const r1 = (
        await http()
          .post('/api/auth/refresh')
          .send({ refreshToken: s.refreshToken })
          .expect(200)
      ).body as Body;
      expect(r1.refreshToken).not.toBe(s.refreshToken);

      // token cũ đã bị xoay
      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(401);
      // access token cũ cũng hết hiệu lực
      await http().get('/api/auth/me').set(auth(s)).expect(401);

      const next: Session = { ...s, token: r1.accessToken };
      await http().get('/api/auth/me').set(auth(next)).expect(200);

      await http().post('/api/auth/logout').set(auth(next)).expect(201);
      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: r1.refreshToken })
        .expect(401);
    });
  });

  describe('S-01 ownership (token của B)', () => {
    let aTx: Body;
    let aType: Body;
    let aPm: Body;

    beforeAll(async () => {
      aType = (await createType(A).expect(201)).body as Body;
      aPm = (await createPaymentMethod(A).expect(201)).body as Body;
      aTx = (
        await createTx(A, {
          amount: 777777,
          typeId: aType.id,
          paymentMethodId: aPm.id,
        }).expect(201)
      ).body as Body;
    });

    async function assertIsolation() {
      const mine = (
        await http()
          .get('/api/transactions/me?limit=500')
          .set(auth(B))
          .expect(200)
      ).body as Body;
      expect(
        (mine.data as Body[]).every(
          (t) => t.id !== aTx.id && t.amount !== 777777,
        ),
      ).toBe(true);

      await http()
        .get(`/api/transactions/me/${aTx.id}`)
        .set(auth(B))
        .expect(404);
      await http()
        .patch(`/api/transactions/me/${aTx.id}`)
        .set(auth(B))
        .send({ amount: 1 })
        .expect(404);
      await http()
        .delete(`/api/transactions/me/${aTx.id}`)
        .set(auth(B))
        .expect(404);

      const aDetail = (
        await http()
          .get(`/api/transactions/me/${aTx.id}`)
          .set(auth(A))
          .expect(200)
      ).body as Body;
      expect(aDetail.amount).toBe(777777);

      const t1 = await createTx(B, { typeId: aType.id }).expect(400);
      expect((t1.body as Body).code).toBe('INVALID_REFERENCE');
      const t2 = await createTx(B, { paymentMethodId: aPm.id }).expect(400);
      expect((t2.body as Body).code).toBe('INVALID_REFERENCE');
      await createTx(B, {
        receiptItems: [{ name: 'x', typeId: aType.id }],
      }).expect(400);
      const img = await createTx(B, { imageUrl: imageOf(A) }).expect(400);
      expect((img.body as Body).code).toBe('INVALID_IMAGE');

      const types = (
        await http().get('/api/transaction-types').set(auth(B)).expect(200)
      ).body as Body[];
      expect(types.some((t) => t.id === aType.id)).toBe(false);
      const pms = (
        await http().get('/api/payment-methods').set(auth(B)).expect(200)
      ).body as Body[];
      expect(pms.some((m) => m.id === aPm.id)).toBe(false);

      for (const path of [
        `/api/transaction-types/${aType.id}`,
        `/api/payment-methods/${aPm.id}`,
      ]) {
        await http().patch(path).set(auth(B)).send({ name: 'x' }).expect(404);
        await http().delete(path).set(auth(B)).expect(404);
        await http().get(`${path}/delete-impact`).set(auth(B)).expect(404);
      }

      await http()
        .get(`/api/transactions/user/${A.id}`)
        .set(auth(B))
        .expect(403);
    }

    it('B không đọc / sửa / dùng được dữ liệu của A', assertIsolation);

    it('insights của B không đổi khi A thêm giao dịch', async () => {
      const url = '/api/insights/summary?periodType=year&date=2026-10-16';
      const before = (await http().get(url).set(auth(B)).expect(200)).body;
      await createTx(A, {
        amount: 123456,
        spentAt: '2026-10-16T10:00:00+07:00',
      }).expect(201);
      const after = (await http().get(url).set(auth(B)).expect(200)).body;
      expect(after).toEqual(before);
    });

    it('xoá loại của B không đụng giao dịch của A', async () => {
      const bType = (await createType(B).expect(201)).body as Body;
      await createTx(B, { typeId: bType.id }).expect(201);
      await http()
        .delete(`/api/transaction-types/${bType.id}`)
        .set(auth(B))
        .expect(200);
      const aDetail = (
        await http()
          .get(`/api/transactions/me/${aTx.id}`)
          .set(auth(A))
          .expect(200)
      ).body as Body;
      expect(aDetail.type.id).toBe(aType.id);
    });

    it('vẫn cô lập sau khi A và B kết bạn', async () => {
      const req = (
        await http()
          .post('/api/friends/requests')
          .set(auth(A))
          .send({ addresseeId: B.id })
          .expect(201)
      ).body as Body;
      await http()
        .patch(`/api/friends/requests/${req.id}/accept`)
        .set(auth(B))
        .expect(200);
      await assertIsolation();
    });
  });
});
