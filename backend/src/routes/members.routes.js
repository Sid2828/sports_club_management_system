import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Helper to parse member ID whether 'M101' or '101'
function parseUserId(idParam) {
  if (!idParam) return null;
  const cleaned = String(idParam).replace(/^M/, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

// 1. Get all members using VIEW vw_member_profiles_summary
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT 
        v.*,
        u.username,
        u.created_at
      FROM vw_member_profiles_summary v
      JOIN users u ON v.user_id = u.user_id
      ORDER BY v.user_id ASC
    `);

    const members = rows.map(r => ({
      user_id: r.user_id,
      member_id: `M${r.user_id}`,
      member_name: r.name,
      username: r.username || r.name,
      email: r.email,
      phone: r.phone || '',
      role: r.role,
      tier: r.current_tier === 'None' ? 'None' : (r.current_tier || 'None'),
      wallet_balance: Number(r.wallet_balance || 0),
      is_delinquent: Boolean(r.is_delinquent),
      plan_id: r.current_tier === 'Platinum' ? 'PL-PLAT' : (r.current_tier === 'Gold' ? 'PL-GOLD' : ''),
      billing_cycle: r.billing_cycle || 'monthly',
      membership_expiry: r.membership_expiry,
      total_bookings_count: Number(r.total_bookings_count || 0),
      total_checkouts_count: Number(r.total_checkouts_count || 0),
      active_checkouts_count: Number(r.active_checkouts_count || 0),
      joined: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)
    }));

    res.json({ members });
  } catch (error) {
    console.error('Fetch members error:', error);
    res.status(500).json({ error: 'Failed to fetch members', details: error.message });
  }
});

// 2. Get single member profile with activity
router.get('/:id', async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid member ID' });
  }

  try {
    const rows = await db.query(
      `SELECT v.*, u.username, u.created_at 
       FROM vw_member_profiles_summary v 
       JOIN users u ON v.user_id = u.user_id 
       WHERE v.user_id = ?`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const r = rows[0];
    const bookings = await db.query(
      'SELECT * FROM vw_venue_booking_details WHERE user_id = ? ORDER BY start_time DESC',
      [userId]
    );
    const checkouts = await db.query(
      'SELECT * FROM vw_member_active_checkouts WHERE user_id = ?',
      [userId]
    );

    res.json({
      member: {
        user_id: r.user_id,
        member_id: `M${r.user_id}`,
        member_name: r.name,
        username: r.username,
        email: r.email,
        phone: r.phone || '',
        role: r.role,
        tier: r.current_tier,
        wallet_balance: Number(r.wallet_balance),
        is_delinquent: Boolean(r.is_delinquent),
        membership_expiry: r.membership_expiry,
        bookings,
        checkouts
      }
    });
  } catch (error) {
    console.error('Fetch single member error:', error);
    res.status(500).json({ error: 'Failed to fetch member details', details: error.message });
  }
});

// 3. Top-up wallet
router.post('/:id/wallet', async (req, res) => {
  const userId = parseUserId(req.params.id);
  const { amount } = req.body;
  const numAmount = Number(amount);

  if (!userId || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid user ID or top-up amount' });
  }

  try {
    await db.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?', [numAmount, userId]);

    // Record payment
    await db.query(
      `INSERT INTO payments (user_id, amount, payment_method, payment_status)
       VALUES (?, ?, 'Wallet', 'Paid')`,
      [userId, numAmount]
    );

    const userRows = await db.query('SELECT user_id, name, wallet_balance FROM users WHERE user_id = ?', [userId]);
    const user = userRows[0];

    res.json({
      message: `Wallet topped up with ₹${numAmount} successfully!`,
      wallet_balance: Number(user.wallet_balance),
      user_id: user.user_id,
      member_id: `M${user.user_id}`
    });
  } catch (error) {
    console.error('Wallet topup error:', error);
    res.status(500).json({ error: 'Failed to top-up wallet', details: error.message });
  }
});

export default router;
