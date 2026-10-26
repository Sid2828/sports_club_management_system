import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// 1. Get all venues (read-only for members & non-members) from real database
router.get('/', async (req, res, next) => {
  try {
    let discountPercent = 0;
    if (req.user && req.user.user_id) {
      const subRows = await db.query(
        `SELECT mp.venue_discount_percent 
         FROM subscriptions s 
         JOIN membership_plans mp ON s.plan_id = mp.plan_id 
         WHERE s.user_id = ? AND s.status = 'Active'`,
        [req.user.user_id]
      );
      if (subRows && subRows.length > 0) {
        discountPercent = Number(subRows[0].venue_discount_percent) || 0;
      }
    }

    const rows = await db.query('SELECT * FROM venues ORDER BY venue_id');
    const venues = (rows || []).map(v => {
      let sports = [];
      try {
        sports = typeof v.sports === 'string' ? JSON.parse(v.sports) : v.sports || [];
      } catch {
        sports = [v.sports].filter(Boolean);
      }
      const baseFee = Number(v.base_hourly_fee) || 0;
      const effectiveFee = discountPercent > 0 
        ? Math.round(baseFee * (1 - discountPercent / 100)) 
        : baseFee;

      return {
        venue_id: v.venue_id,
        venue_name: v.venue_name,
        venue_type: v.venue_type,
        base_hourly_fee: baseFee,
        parent_venue_id: v.parent_venue_id,
        sports,
        sport_ids: sports,
        status: v.status,
        discount_percent: discountPercent,
        effective_hourly_fee: effectiveFee
      };
    });

    res.json({ venues });
  } catch (err) {
    next(err);
  }
});

// 2. Day-wise time slot grid for a venue (06:00 - 22:00) querying real bookings
router.get('/:id/slots', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    const venueRows = await db.query('SELECT * FROM venues WHERE venue_id = ?', [id]);
    if (!venueRows || venueRows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    const venue = venueRows[0];

    let discountPercent = 0;
    if (req.user && req.user.user_id) {
      const subRows = await db.query(
        `SELECT mp.venue_discount_percent 
         FROM subscriptions s 
         JOIN membership_plans mp ON s.plan_id = mp.plan_id 
         WHERE s.user_id = ? AND s.status = 'Active'`,
        [req.user.user_id]
      );
      if (subRows && subRows.length > 0) {
        discountPercent = Number(subRows[0].venue_discount_percent) || 0;
      }
    }

    const baseFee = Number(venue.base_hourly_fee) || 0;
    const slotPrice = discountPercent > 0
      ? Math.round(baseFee * (1 - discountPercent / 100))
      : baseFee;

    const bookings = await db.query(
      `SELECT start_time, end_time, status 
       FROM venue_bookings 
       WHERE venue_id = ? AND status = 'Confirmed' 
         AND DATE(start_time) = ?`,
      [id, dateStr]
    );

    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      const startHourStr = String(hour).padStart(2, '0') + ':00';
      const endHourStr = String(hour + 1).padStart(2, '0') + ':00';
      const startIso = `${dateStr}T${startHourStr}`;
      const endIso = `${dateStr}T${endHourStr}`;

      const isBooked = (bookings || []).some(b => {
        const bStart = String(b.start_time).replace(' ', 'T').slice(0, 16);
        const bEnd = String(b.end_time).replace(' ', 'T').slice(0, 16);
        return (startIso >= bStart && startIso < bEnd);
      });

      let status = 'Available';
      if (venue.status === 'Under Maintenance') {
        status = 'Under Maintenance';
      } else if (isBooked) {
        status = 'Booked';
      }

      slots.push({
        slot_id: `${id}_${dateStr}_${startHourStr}`,
        date: dateStr,
        start_time: startHourStr,
        end_time: endHourStr,
        start_iso: startIso,
        end_iso: endIso,
        base_price: baseFee,
        discounted_price: slotPrice,
        discount_applied: `${discountPercent}%`,
        status
      });
    }

    res.json({
      venue_id: venue.venue_id,
      venue_name: venue.venue_name,
      date: dateStr,
      venue_status: venue.status,
      slots
    });
  } catch (err) {
    next(err);
  }
});

// 3. Admin: Add new facility to real database
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { venue_name, venue_type, base_hourly_fee, parent_venue_id, sports, status = 'Available' } = req.body;
    if (!venue_name || !venue_type || !base_hourly_fee) {
      return res.status(400).json({ error: 'Missing required fields: venue_name, venue_type, base_hourly_fee' });
    }

    const countRows = await db.query('SELECT COUNT(*) as count FROM venues');
    const nextNum = (countRows && countRows[0]?.count ? Number(countRows[0].count) : 0) + 1;
    const venue_id = `V${nextNum}`;
    const sportIds = Array.isArray(req.body.sport_ids) ? req.body.sport_ids : [];
    const sportsArr = (Array.isArray(sports) ? sports : [sports].filter(Boolean)).concat(sportIds).filter(Boolean);
    const uniqueSports = [...new Set(sportsArr)];
    const sportsJson = JSON.stringify(uniqueSports);

    await db.query(
      'INSERT INTO venues (venue_id, venue_name, venue_type, base_hourly_fee, parent_venue_id, sports, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [venue_id, venue_name, venue_type, Number(base_hourly_fee), parent_venue_id || null, sportsJson, status]
    );

    res.status(201).json({
      message: 'Facility created successfully',
      venue: {
        venue_id,
        venue_name,
        venue_type,
        base_hourly_fee: Number(base_hourly_fee),
        parent_venue_id: parent_venue_id || null,
        sports: uniqueSports,
        sport_ids: uniqueSports,
        status
      }
    });
  } catch (err) {
    next(err);
  }
});

// 4. Admin: Update venue status, pricing, and details in real database
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, base_hourly_fee, venue_name } = req.body;

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (base_hourly_fee !== undefined) { updates.push('base_hourly_fee = ?'); params.push(Number(base_hourly_fee)); }
    if (venue_name) { updates.push('venue_name = ?'); params.push(venue_name); }

    if (updates.length > 0) {
      params.push(id);
      await db.query(`UPDATE venues SET ${updates.join(', ')} WHERE venue_id = ?`, params);
    }

    const rows = await db.query('SELECT * FROM venues WHERE venue_id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json({ message: 'Venue updated successfully', venue: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 5. Admin: Remove facility from real database
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await db.query('SELECT * FROM venues WHERE venue_id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    await db.query('DELETE FROM venues WHERE venue_id = ?', [id]);
    res.json({ message: `Facility ${id} removed successfully` });
  } catch (err) {
    next(err);
  }
});

export default router;
