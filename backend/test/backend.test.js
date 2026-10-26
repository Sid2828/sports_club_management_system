process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';

// Helper to make test requests to Express app without spinning a network socket
async function request(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const req = {
      method,
      url: path,
      headers: { ...headers, host: 'localhost' },
      body: body || {},
      query: {},
      params: {}
    };

    // If query string present
    if (path.includes('?')) {
      const parts = path.split('?');
      req.url = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, value] of searchParams.entries()) {
        req.query[key] = value;
      }
    }

    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data) {
        resolve({ status: this.statusCode, body: data });
      }
    };

    app.handle(req, res);
  });
}

test('Membership plans return Gold (₹2000/mo, ₹20000/yr) and Platinum (₹3000/mo, ₹30000/yr)', async () => {
  const res = await request('GET', '/api/subscriptions/plans');
  assert.equal(res.status, 200);
  assert.equal(res.body.plans.length, 2);

  const gold = res.body.plans.find(p => p.plan_name === 'Gold');
  assert.ok(gold);
  assert.equal(gold.monthly_fee, 2000);
  assert.equal(gold.yearly_fee, 20000);
  assert.equal(gold.equipment_discount_percent, 30);
  assert.equal(gold.venue_discount_percent, 10);

  const platinum = res.body.plans.find(p => p.plan_name === 'Platinum');
  assert.ok(platinum);
  assert.equal(platinum.monthly_fee, 3000);
  assert.equal(platinum.yearly_fee, 30000);
  assert.equal(platinum.equipment_discount_percent, 50);
  assert.equal(platinum.venue_discount_percent, 20);
});

test('Non-member is strictly blocked from venue booking with UPGRADE_MEMBERSHIP required', async () => {
  const res = await request('POST', '/api/bookings', { 'x-role': 'non_member' }, {
    venue_id: 'V2',
    start_time: '2026-10-25 14:00:00',
    end_time: '2026-10-25 15:00:00'
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'MembershipRequired');
  assert.equal(res.body.actionRequired, 'UPGRADE_MEMBERSHIP');
  assert.ok(res.body.plans);
});

test('Non-member is strictly blocked from equipment checkout', async () => {
  const res = await request('POST', '/api/equipment/checkout', { 'x-role': 'non_member' }, {
    asset_id: 'EQ-201'
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'MembershipRequired');
});

test('Venue day-wise time slot grid returns 06:00 to 22:00 slots with status', async () => {
  const res = await request('GET', '/api/venues/V2/slots?date=2026-10-25', { 'x-role': 'member' });
  assert.equal(res.status, 200);
  assert.equal(res.body.venue_id, 'V2');
  assert.equal(res.body.slots.length, 16); // 6am to 10pm = 16 1-hour slots
  assert.equal(res.body.slots[0].start_time, '06:00');
  assert.equal(res.body.slots[15].start_time, '21:00');
});

test('Admin can add and remove maintenance operations', async () => {
  // Add maintenance
  const addRes = await request('POST', '/api/maintenance', { 'x-role': 'admin' }, {
    target_type: 'venue',
    target_id: 'V1',
    description: 'Floor varnishing and court line touch up',
    priority: 'High'
  });
  assert.equal(addRes.status, 201);
  const opId = addRes.body.operation.operation_id;

  // Remove maintenance
  const delRes = await request('DELETE', `/api/maintenance/${opId}`, { 'x-role': 'admin' });
  assert.equal(delRes.status, 200);
});

test('Admin cannot book slots for themselves', async () => {
  const res = await request('POST', '/api/bookings', { 'x-role': 'admin' }, {
    venue_id: 'V2',
    start_time: '2026-10-25 18:00:00',
    end_time: '2026-10-25 19:00:00'
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'AdminBookingNotPermitted');
});

test('Member login requires a pre-existing unique roster record', async () => {
  const missing = await request('POST', '/api/auth/login', {}, {
    username: 'Unknown Member',
    email: 'unknown@clubmail.com',
    password: 'password123',
    phone: '+91 9000000000',
    role: 'member'
  });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error, 'RosterRecordRequired');

  const conflict = await request('POST', '/api/auth/login', {}, {
    username: 'Aarav Mehta',
    email: 'priya.sharma@clubmail.com',
    password: 'password123',
    role: 'member'
  });
  assert.equal(conflict.status, 409);

  const ok = await request('POST', '/api/auth/login', {}, {
    username: 'Aarav Mehta',
    email: 'aarav.mehta@clubmail.com',
    password: 'password123',
    phone: '+91 9820011223',
    role: 'member'
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, 'aarav.mehta@clubmail.com');
  assert.equal(ok.body.user.username, 'Aarav Mehta');
  assert.equal(ok.body.user.phone, '+91 9820011223');
});

test('Admin login enforces unique username and email against existing record', async () => {
  const missing = await request('POST', '/api/auth/login', {}, {
    username: 'Fake Admin',
    email: 'fake.admin@arenaone.club',
    password: 'password123',
    role: 'admin'
  });
  assert.equal(missing.status, 400);

  const ok = await request('POST', '/api/auth/login', {}, {
    username: 'Dana Lopez',
    email: 'dana.admin@arenaone.club',
    password: 'password123',
    phone: '+91 9888877771',
    role: 'admin'
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, 'admin');
  assert.equal(ok.body.user.username, 'Dana Lopez');
});

test('Registration is blocked without a roster record and persists phone on existing members', async () => {
  const missing = await request('POST', '/api/auth/register', {}, {
    username: 'Brand New',
    email: 'brand.new@clubmail.com',
    password: 'password123',
    phone: '+91 9111111111',
    role: 'member'
  });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error, 'RosterRecordRequired');

  const activated = await request('POST', '/api/auth/register', {}, {
    username: 'Priya Sharma',
    email: 'priya.sharma@clubmail.com',
    password: 'password123',
    phone: '+91 9811122999',
    role: 'member'
  });
  assert.equal(activated.status, 200);
  assert.equal(activated.body.user.phone, '+91 9811122999');
  assert.equal(activated.body.user.wallet_balance, 5100);
  setTimeout(() => process.exit(0), 100);
});
