import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/activity - Aggregate real recent events from database
router.get('/', async (req, res) => {
  try {
    const activities = [];

    // 1. Recent Bookings
    const bookings = await db.query(`
      SELECT 
        b.booking_id,
        b.start_time,
        b.created_at,
        u.name AS member_name,
        v.venue_name
      FROM venue_bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN venues v ON b.venue_id = v.venue_id
      ORDER BY b.created_at DESC
      LIMIT 20
    `);

    bookings.forEach(b => {
      activities.push({
        id: `B${b.booking_id}`,
        kind: 'booking',
        text: `${b.member_name} booked ${b.venue_name}`,
        at: b.created_at ? new Date(b.created_at).toISOString() : new Date(b.start_time).toISOString()
      });
    });

    // 2. Recent Equipment Checkouts
    const checkouts = await db.query(`
      SELECT 
        ec.checkout_id,
        ec.issue_date,
        ec.created_at,
        u.name AS member_name,
        eq.name AS equipment_name
      FROM equipment_checkouts ec
      JOIN users u ON ec.user_id = u.user_id
      JOIN equipment eq ON ec.asset_id = eq.asset_id
      ORDER BY ec.created_at DESC
      LIMIT 20
    `);

    checkouts.forEach(c => {
      activities.push({
        id: `I-${c.checkout_id}`,
        kind: 'issue',
        text: `${c.member_name} checked out ${c.equipment_name}`,
        at: c.created_at ? new Date(c.created_at).toISOString() : `${String(c.issue_date).slice(0, 10)}T08:00:00.000Z`
      });
    });

    // 3. Recent Maintenance Operations
    const maintenance = await db.query(`
      SELECT 
        m.operation_id,
        m.target_type,
        m.target_id,
        m.scheduled_date,
        m.created_at,
        COALESCE(v.venue_name, eq.name, m.target_id) AS target_name
      FROM maintenance_operations m
      LEFT JOIN venues v ON m.target_type = 'venue' AND m.target_id = v.venue_id
      LEFT JOIN equipment eq ON m.target_type = 'equipment' AND m.target_id = eq.asset_id
      ORDER BY m.created_at DESC
      LIMIT 20
    `);

    maintenance.forEach(m => {
      activities.push({
        id: `MR-${m.operation_id}`,
        kind: 'maintenance',
        text: `Maintenance scheduled for ${m.target_name}`,
        at: m.created_at ? new Date(m.created_at).toISOString() : `${String(m.scheduled_date).slice(0, 10)}T09:00:00.000Z`
      });
    });

    // 4. Recent Wallet Transactions
    const payments = await db.query(`
      SELECT 
        p.payment_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        u.name AS member_name
      FROM payments p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.booking_id IS NULL AND p.checkout_id IS NULL
      ORDER BY p.payment_date DESC
      LIMIT 20
    `);

    payments.forEach(p => {
      activities.push({
        id: `P${p.payment_id}`,
        kind: 'wallet',
        text: `${p.member_name} topped up ₹${Number(p.amount).toLocaleString('en-IN')}`,
        at: p.payment_date ? new Date(p.payment_date).toISOString() : new Date().toISOString()
      });
    });

    // Sort descending by timestamp
    activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    let overview = null;
    try {
      const stats = await db.query('SELECT * FROM vw_club_operations_overview LIMIT 1');
      overview = stats[0] || null;
    } catch {
      overview = null;
    }

    res.json({ activity: activities, overview });
  } catch (error) {
    console.error('Fetch activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity', details: error.message });
  }
});

export default router;
