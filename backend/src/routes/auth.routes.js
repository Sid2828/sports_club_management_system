import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

function requireJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return JWT_SECRET;
}

function norm(value = '') {
  return String(value || '').trim().toLowerCase();
}

function userUsername(user) {
  return user.username || user.name || '';
}

async function loadUsers() {
  const rows = await db.query('SELECT * FROM users');
  return Array.isArray(rows) ? rows : [];
}

async function verifyPassword(plain, user) {
  if (!plain) return false;
  const p = String(plain).trim();
  if (!user.password_hash) return false;
  try {
    return await bcrypt.compare(p, user.password_hash);
  } catch {
    return false;
  }
}

function signUser(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      username: userUsername(user),
      name: user.name,
      role: user.role
    },
    requireJwtSecret(),
    { expiresIn: '7d' }
  );
}

async function getMembershipForUser(user) {
  const rows = await db.query(
    `SELECT s.*, mp.plan_code, mp.plan_name, mp.equipment_discount_percent, mp.venue_discount_percent 
     FROM subscriptions s 
     JOIN membership_plans mp ON s.plan_id = mp.plan_id 
     WHERE s.user_id = ? AND s.status = 'Active' 
     ORDER BY s.subscription_id DESC LIMIT 1`,
    [user.user_id]
  );
  if (rows && rows.length > 0) {
    const sub = rows[0];
    return {
      plan_id: sub.plan_id,
      plan_name: sub.plan_name,
      billing_cycle: sub.billing_cycle,
      end_date: sub.end_date,
      equipment_discount_percent: Number(sub.equipment_discount_percent),
      venue_discount_percent: Number(sub.venue_discount_percent)
    };
  }
  return null;
}

function publicUser(user, membership = null) {
  return {
    user_id: user.user_id,
    name: user.name,
    username: userUsername(user),
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    wallet_balance: Number(user.wallet_balance ?? 0),
    is_delinquent: Boolean(user.is_delinquent),
    membership
  };
}

async function findUserByCredentials(username, email) {
  const u = norm(username);
  const e = norm(email);
  if (!u && !e) return null;

  const params = [];
  const conditions = [];

  if (u) {
    conditions.push('(LOWER(TRIM(username)) = ? OR LOWER(TRIM(name)) = ? OR LOWER(TRIM(email)) = ?)');
    params.push(u, u, u);
  }
  if (e) {
    conditions.push('(LOWER(TRIM(email)) = ? OR LOWER(TRIM(username)) = ?)');
    params.push(e, e);
  }

  const rows = await db.query(`SELECT * FROM users WHERE ${conditions.join(' OR ')}`, params);
  if (!Array.isArray(rows) || rows.length === 0) return null;

  if (u && e) {
    const exact = rows.find(
      (r) => (norm(r.username) === u || norm(r.name) === u) && norm(r.email) === e
    );
    if (exact) return exact;
    const byEmail = rows.find((r) => norm(r.email) === e);
    if (byEmail) return byEmail;
    const byUsername = rows.find((r) => norm(r.username) === u || norm(r.name) === u);
    if (byUsername) return byUsername;
  }
  return rows[0];
}

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '').trim();
  const phone = String(req.body.phone || req.body.phone_number || '').trim();
  const requestedRole = req.body.role ? String(req.body.role).trim().toLowerCase() : null;

  if ((!username && !email) || !password) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Username/Email and password are required.'
    });
  }

  const user = await findUserByCredentials(username, email);

  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No account found with this username and email. If you are not a member, please purchase a membership first.'
    });
  }

  if (user.role === 'non_member') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Membership required. You have not yet purchased a membership. Please purchase a membership to access the portal.'
    });
  }

  if (requestedRole) {
    const userRole = String(user.role).trim().toLowerCase();
    if (requestedRole === 'admin' && userRole !== 'admin') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access denied: Admin credentials required.'
      });
    }
    if (requestedRole === 'member' && userRole !== 'member') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access denied: Member credentials required.'
      });
    }
    if (userRole !== requestedRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: `Account role mismatch: account is registered as ${user.role}.`
      });
    }
  }

  const valid = await verifyPassword(password, user);
  if (!valid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Incorrect password.'
    });
  }

  if (phone && phone !== user.phone) {
    await db.query('UPDATE users SET phone = ? WHERE user_id = ?', [phone, user.user_id]);
    user.phone = phone;
  }

  const membership = await getMembershipForUser(user);

  return res.json({
    message: `Signed in successfully as ${user.role}`,
    token: signUser(user),
    user: publicUser(user, membership)
  });
});

router.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const phone = String(req.body.phone || req.body.phone_number || '').trim();
  const role = String(req.body.role || 'member').trim().toLowerCase();
  const tier = String(req.body.tier || req.body.plan_name || 'Gold').trim();
  const billingCycle = String(req.body.billingCycle || req.body.billing_cycle || 'monthly').trim();
  const paymentMethod = String(req.body.paymentMethod || req.body.payment_method || 'UPI').trim();

  if (role === 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin sign-up is not permitted. Admin accounts must be preloaded.'
    });
  }

  if (!username || !email || !password) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Username, email, and password are required.'
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Please provide a valid email address.'
    });
  }

  const users = await loadUsers();
  const u = norm(username);
  const e = norm(email);

  const existingByUsername = users.find((x) => norm(userUsername(x)) === u);
  const existingByEmail = users.find((x) => norm(x.email) === e);

  if (existingByUsername && existingByUsername.role !== 'non_member') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'An account with this username already exists.'
    });
  }
  if (existingByEmail && existingByEmail.role !== 'non_member') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'An account with this email already exists.'
    });
  }

  const plans = await db.query(
    'SELECT * FROM membership_plans WHERE LOWER(plan_name) = LOWER(?) AND is_active = TRUE LIMIT 1',
    [tier]
  );
  if (!plans || plans.length === 0) {
    return res.status(400).json({ error: 'Invalid plan selected. Choose Gold or Platinum.' });
  }

  const plan = plans[0];
  const amountPaid = billingCycle === 'yearly' ? Number(plan.yearly_fee) : Number(plan.monthly_fee);
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endObj = new Date(today);
  if (billingCycle === 'yearly') endObj.setFullYear(endObj.getFullYear() + 1);
  else endObj.setMonth(endObj.getMonth() + 1);
  const endDate = endObj.toISOString().slice(0, 10);
  const password_hash = await bcrypt.hash(password, 10);

  const nonMemberUser =
    existingByUsername && existingByUsername.role === 'non_member'
      ? existingByUsername
      : existingByEmail && existingByEmail.role === 'non_member'
      ? existingByEmail
      : null;

  let memberUser;

  if (nonMemberUser) {
    await db.query(
      'UPDATE users SET name = ?, username = ?, email = ?, phone = ?, password_hash = ?, role = ? WHERE user_id = ?',
      [username, username, email, phone || nonMemberUser.phone, password_hash, 'member', nonMemberUser.user_id]
    );
    memberUser = { ...nonMemberUser, name: username, username, email, phone: phone || nonMemberUser.phone, role: 'member' };
  } else {
    const resInsert = await db.query(
      'INSERT INTO users (name, username, email, phone, password_hash, role, wallet_balance, is_delinquent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, username, email, phone, password_hash, 'member', 0.0, 0]
    );
    memberUser = {
      user_id: resInsert.insertId,
      name: username,
      username,
      email,
      phone,
      role: 'member',
      wallet_balance: 0,
      is_delinquent: 0
    };
  }

  await db.query('UPDATE subscriptions SET status = "Expired" WHERE user_id = ? AND status = "Active"', [
    memberUser.user_id
  ]);

  const subResult = await db.query(
    'INSERT INTO subscriptions (user_id, plan_id, billing_cycle, amount_paid, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [memberUser.user_id, plan.plan_id, billingCycle, amountPaid, startDate, endDate, 'Active']
  );

  const allowedMethods = ['Wallet', 'Card', 'UPI', 'Cash'];
  const method = allowedMethods.includes(paymentMethod) ? paymentMethod : 'UPI';
  await db.query(
    'INSERT INTO payments (user_id, subscription_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
    [memberUser.user_id, subResult.insertId, amountPaid, method, 'Paid']
  );

  const membership = await getMembershipForUser(memberUser);

  return res.status(201).json({
    message: 'Membership active. Please sign in.',
    user: publicUser(memberUser, membership)
  });
});

router.get('/me', async (req, res) => {
  if (!req.user?.user_id) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Sign in required.' });
  }
  const rows = await db.query('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found.' });
  }
  const membership = await getMembershipForUser(user);
  res.json({ user: publicUser(user, membership) });
});

export default router;
