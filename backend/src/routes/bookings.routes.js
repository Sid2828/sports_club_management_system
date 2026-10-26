import { Router } from 'express';
import { db } from '../db.js';
import { blockNonMembers, requireRole } from '../middleware/auth.js';

const router = Router();

// Helper to format ISO/local date string to MySQL datetime YYYY-MM-DD HH:MM:SS
function formatMySQLDateTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // If already in YYYY-MM-DD HH:MM:SS format
    return dateStr.replace('T', ' ').slice(0, 19);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 1. Create Venue Booking (Members only, strictly blocked for non-members & admins)
router.post('/', blockNonMembers, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({
      error: 'AdminBookingNotPermitted',
      message: 'Admins manage venue status and facilities rather than booking personal slots.'
    });
  }

  const { venue_id, start_time, end_time, payment_method = 'Wallet' } = req.body;
  if (!venue_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required booking fields: venue_id, start_time, end_time' });
  }

  try {
    const venues = await db.query('SELECT * FROM venues WHERE venue_id = ?', [venue_id]);
    if (!venues || venues.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    const venue = venues[0];

    if (venue.status === 'Under Maintenance') {
      return res.status(400).json({ error: 'Venue is currently under maintenance and cannot be booked.' });
    }

    const startFormatted = formatMySQLDateTime(start_time);
    const endFormatted = formatMySQLDateTime(end_time);
    const startMs = new Date(start_time).getTime();
    const endMs = new Date(end_time).getTime();
    const hours = (endMs - startMs) / 3600000;

    if (hours <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    if (endMs <= Date.now()) {
      return res.status(400).json({ error: 'PastSlotBookingNotPermitted', message: 'Cannot book slots in the past.' });
    }

    const baseCost = Math.round(hours * Number(venue.base_hourly_fee));

    // Calculate discount based on active subscription
    const subRows = await db.query(
      `SELECT s.*, mp.venue_discount_percent, mp.plan_name 
       FROM subscriptions s 
       JOIN membership_plans mp ON s.plan_id = mp.plan_id 
       WHERE s.user_id = ? AND s.status = 'Active' 
       ORDER BY s.subscription_id DESC LIMIT 1`,
      [req.user.user_id]
    );

    const plan = subRows.length > 0 ? subRows[0] : null;
    const discountPercent = plan ? Number(plan.venue_discount_percent) : 0;
    const discountAmount = Math.round(baseCost * (discountPercent / 100));
    const totalCost = Math.max(0, baseCost - discountAmount);

    // Check wallet balance if payment_method is Wallet
    let walletDeducted = false;
    if (payment_method === 'Wallet') {
      const userRows = await db.query('SELECT wallet_balance FROM users WHERE user_id = ?', [req.user.user_id]);
      const user = userRows[0];
      const balance = Number(user ? user.wallet_balance : 0);
      if (balance < totalCost) {
        return res.status(400).json({
          error: 'InsufficientFunds',
          message: `Insufficient wallet balance. Required: ₹${totalCost}, Available: ₹${balance}`
        });
      }
      await db.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?', [totalCost, req.user.user_id]);
      walletDeducted = true;
    }

    // Insert booking into venue_bookings - will fire trg_prevent_venue_double_booking
    try {
      const result = await db.query(
        `INSERT INTO venue_bookings 
         (venue_id, user_id, start_time, end_time, base_rate, discount_amount, total_cost, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
        [venue_id, req.user.user_id, startFormatted, endFormatted, baseCost, discountAmount, totalCost]
      );

      const bookingId = result.insertId;

      // Insert payment record
      await db.query(
        `INSERT INTO payments (user_id, booking_id, amount, payment_method, payment_status) 
         VALUES (?, ?, ?, ?, 'Paid')`,
        [req.user.user_id, bookingId, totalCost, payment_method]
      );

      const newBooking = {
        booking_id: bookingId,
        venue_id,
        venue_name: venue.venue_name,
        venue_type: venue.venue_type,
        user_id: req.user.user_id,
        start_time: startFormatted,
        end_time: endFormatted,
        base_rate: baseCost,
        discount_amount: discountAmount,
        total_cost: totalCost,
        payment_method,
        payment_status: 'Paid',
        status: 'Confirmed',
        booking_status: 'Confirmed',
        created_at: new Date().toISOString()
      };

      res.status(201).json({
        message: `Booked ${venue.venue_name} successfully!`,
        booking: newBooking,
        tier_discount_applied: `${discountPercent}% (Saved ₹${discountAmount})`,
        amount_charged: totalCost
      });
    } catch (insertError) {
      // Revert wallet deduction if booking failed
      if (walletDeducted) {
        await db.query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?', [totalCost, req.user.user_id]);
      }

      // Check if trigger raised double-booking conflict
      if (insertError.sqlState === '45000' || (insertError.message && insertError.message.includes('Slot conflict'))) {
        return res.status(409).json({
          error: 'DoubleBookingConflict',
          message: 'Slot conflict: The selected venue is already booked for this time interval.'
        });
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

// Helper to format booking row for frontend
function formatBooking(r) {
  const startStr = r.start_time ? String(r.start_time).replace(' ', 'T').slice(0, 16) : '';
  const endStr = r.end_time ? String(r.end_time).replace(' ', 'T').slice(0, 16) : '';
  return {
    ...r,
    booking_id: `B${r.booking_id}`,
    raw_booking_id: r.booking_id,
    member_id: `M${r.user_id}`,
    start_time: startStr,
    end_time: endStr,
    total_cost: Number(r.total_cost || 0),
    base_rate: Number(r.base_rate || 0),
    discount_amount: Number(r.discount_amount || 0),
    payment_id: r.payment_id ? `P${r.payment_id}` : undefined,
    status: r.booking_status || r.status || 'Confirmed'
  };
}

// 2. All bookings (used by dashboards, slot grids, and admin tables) via VIEW
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(`SELECT * FROM vw_venue_booking_details ORDER BY start_time DESC`);
    res.json({ bookings: rows.map(formatBooking) });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
});

// 3. Member: Get my bookings using VIEW vw_venue_booking_details
router.get('/my', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM vw_venue_booking_details WHERE user_id = ? ORDER BY start_time DESC`,
      [req.user.user_id]
    );

    res.json({ bookings: rows.map(formatBooking) });
  } catch (error) {
    console.error('Fetch member bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch member bookings', details: error.message });
  }
});

// 3. Admin: Get all bookings using VIEW vw_venue_booking_details
router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM vw_venue_booking_details ORDER BY start_time DESC`
    );

    res.json({ bookings: rows.map(formatBooking) });
  } catch (error) {
    console.error('Fetch all bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch all bookings', details: error.message });
  }
});

// 4. Cancel booking
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(String(rawId).replace(/\D/g, ''));
  try {
    const rows = await db.query('SELECT * FROM venue_bookings WHERE booking_id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = rows[0];
    if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    await db.query('UPDATE venue_bookings SET status = "Cancelled" WHERE booking_id = ?', [id]);
    res.json({ message: 'Booking cancelled successfully', booking: formatBooking({ ...booking, booking_status: 'Cancelled' }) });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking', details: error.message });
  }
});

export default router;
