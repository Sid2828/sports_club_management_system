import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import http from 'node:http';

function request(app, options, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: options.path,
          method: options.method,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: data ? JSON.parse(data) : {}
              });
            } catch {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: data
              });
            }
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  });
}

describe('Strict Role-Based Authentication & Seed Accounts', () => {
  test('1. Preloaded Admin can log in via /api/auth/login with password123', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      { username: 'admin', email: 'admin@clubmail.com', password: 'password123', role: 'admin' }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'admin');
    assert.ok(res.body.token);
  });

  test('2. Preloaded Member can log in via /api/auth/login with password123', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      { username: 'member', email: 'member@clubmail.com', password: 'password123', role: 'member' }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'member');
    assert.ok(res.body.token);
  });

  test('3. Non-existent user login is rejected with 401 Unauthorized', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      { username: 'nonexistent', email: 'nonexistent@clubmail.com', password: 'password123', role: 'member' }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  test('4. Non-member account without purchased membership is rejected with 401 Unauthorized', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      { username: 'Suresh Kumar', email: 'suresh.guest@gmail.com', password: 'password123', role: 'member' }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  test('5. Role mismatch on admin login is rejected with 401 Unauthorized', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      { username: 'member', email: 'member@clubmail.com', password: 'password123', role: 'admin' }
    );
    assert.equal(res.status, 401);
  });

  test('6. Role mismatch on member login is rejected with 401 Unauthorized', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      { username: 'admin', email: 'admin@clubmail.com', password: 'password123', role: 'member' }
    );
    assert.equal(res.status, 401);
  });

  test('7. Admin sign-up attempt via /api/auth/register is rejected with 403 Forbidden', async () => {
    const res = await request(
      app,
      { path: '/api/auth/register', method: 'POST' },
      { username: 'newadmin', email: 'newadmin@clubmail.com', password: 'password123', role: 'admin' }
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  test('8. Member sign-up via membership purchase creates member account (201 Created)', async () => {
    const res = await request(
      app,
      { path: '/api/auth/register', method: 'POST' },
      {
        username: 'newmember',
        email: 'newmember@clubmail.com',
        password: 'mypassword456',
        phone: '+91 9999988888',
        role: 'member',
        tier: 'Gold',
        billingCycle: 'monthly'
      }
    );
    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Membership active. Please sign in.');
    assert.equal(res.body.user.role, 'member');
    // Ensure no auth token auto-logged in
    assert.equal(res.body.token, undefined);
  });

  test('9. Newly registered member can log in via /api/auth/login with new credentials', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      {
        username: 'newmember',
        email: 'newmember@clubmail.com',
        password: 'mypassword456',
        role: 'member'
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'member');
    assert.equal(res.body.user.username, 'newmember');
    assert.ok(res.body.token);
  });

  test('10. Newly registered member cannot log in with incorrect password', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      {
        username: 'newmember',
        email: 'newmember@clubmail.com',
        password: 'wrongpassword',
        role: 'member'
      }
    );
    assert.equal(res.status, 401);
  });

  test('11. Preloaded member monal can log in with pingalemonal5@gmail.com', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      {
        username: 'monal',
        email: 'pingalemonal5@gmail.com',
        password: 'password123',
        role: 'member'
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'member');
    assert.equal(res.body.user.email, 'pingalemonal5@gmail.com');
    assert.ok(res.body.token);
  });

  test('12. Monal login handles whitespace trim and case insensitivity', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      {
        username: '  Monal  ',
        email: '  PingaleMonal5@Gmail.com ',
        password: ' password123 ',
        role: 'member'
      }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'member');
    assert.ok(res.body.token);
  });

  test('13. Monal cannot log in through Admin portal (role mismatch -> 401)', async () => {
    const res = await request(
      app,
      { path: '/api/auth/login', method: 'POST' },
      {
        username: 'monal',
        email: 'pingalemonal5@gmail.com',
        password: 'password123',
        role: 'admin'
      }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });
});
