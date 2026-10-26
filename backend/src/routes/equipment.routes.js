import { Router } from 'express';
import { db } from '../db.js';
import { blockNonMembers, requireRole } from '../middleware/auth.js';

const router = Router();

// 1. Read-only equipment catalog with real prices & tier discounts from database
router.get('/', async (req, res, next) => {
  try {
    let discountPercent = 0;
    if (req.user && req.user.user_id) {
      const subRows = await db.query(
        `SELECT mp.equipment_discount_percent 
         FROM subscriptions s 
         JOIN membership_plans mp ON s.plan_id = mp.plan_id 
         WHERE s.user_id = ? AND s.status = 'Active'`,
        [req.user.user_id]
      );
      if (subRows && subRows.length > 0) {
        discountPercent = Number(subRows[0].equipment_discount_percent) || 0;
      }
    }

    const rows = await db.query('SELECT * FROM equipment ORDER BY asset_id');
    const catalog = (rows || []).map(e => {
      const baseDaily = Number(e.daily_price) || 0;
      const effectiveDaily = discountPercent > 0
        ? Math.round(baseDaily * (1 - discountPercent / 100))
        : baseDaily;

      return {
        asset_id: e.asset_id,
        name: e.name,
        category: e.category,
        total_quantity: Number(e.total_quantity) || 0,
        available_quantity: Number(e.available_quantity) || 0,
        daily_price: baseDaily,
        status: e.status,
        discount_percent: discountPercent,
        effective_daily_price: effectiveDaily
      };
    });

    res.json({ equipment: catalog });
  } catch (err) {
    next(err);
  }
});

// 2. Members: "My Active Gear" querying SQL VIEW vw_member_active_checkouts
router.get('/my-active', async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT * FROM vw_member_active_checkouts WHERE user_id = ? ORDER BY issue_date DESC`,
      [req.user.user_id]
    );

    const myGear = (rows || []).map(c => ({
      checkout_id: c.checkout_id,
      asset_id: c.asset_id,
      name: c.equipment_name || c.asset_id,
      category: c.equipment_category || '',
      issue_date: c.issue_date,
      due_date: c.due_date,
      daily_rate: Number(c.charged_daily_rate) || 0,
      status: c.checkout_status || 'Active',
      days_overdue: Number(c.days_overdue) || 0,
      late_fee: Number(c.computed_late_fee) || 0
    }));

    res.json({ active_gear: myGear });
  } catch (err) {
    next(err);
  }
});

// 3. Get all equipment checkouts / issues
router.get('/checkouts', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT 
        ec.checkout_id,
        CONCAT('I-', ec.checkout_id) AS issue_id,
        CONCAT('M', ec.user_id) AS member_id,
        ec.user_id,
        ec.asset_id,
        eq.name AS equipment_name,
        u.name AS member_name,
        DATE_FORMAT(ec.issue_date, '%Y-%m-%d') AS issue_date,
        DATE_FORMAT(ec.due_date, '%Y-%m-%d') AS due_date,
        DATE_FORMAT(ec.return_date, '%Y-%m-%d') AS returned_date,
        ec.late_fee,
        ec.status
      FROM equipment_checkouts ec
      JOIN users u ON ec.user_id = u.user_id
      JOIN equipment eq ON ec.asset_id = eq.asset_id
      ORDER BY ec.checkout_id DESC
    `);

    res.json({ checkouts: rows || [] });
  } catch (err) {
    next(err);
  }
});

// 3b. Admin: SQL View vw_member_active_checkouts query
router.get('/active-checkouts', requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await db.query('SELECT * FROM vw_member_active_checkouts ORDER BY issue_date DESC');
    res.json({ checkouts: rows || [] });
  } catch (err) {
    next(err);
  }
});

// 4. Admin: Add inventory to database
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, category, total_quantity, daily_price = 50, status = 'Available' } = req.body;
    if (!name || !category || !total_quantity) {
      return res.status(400).json({ error: 'Missing required inventory fields: name, category, total_quantity' });
    }

    const countRows = await db.query('SELECT COUNT(*) as count FROM equipment');
    const nextNum = (countRows && countRows[0]?.count ? Number(countRows[0].count) : 0) + 201;
    const asset_id = `EQ-${nextNum}`;
    const total = Number(total_quantity);
    const price = Number(daily_price);

    await db.query(
      'INSERT INTO equipment (asset_id, name, category, total_quantity, available_quantity, daily_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [asset_id, name, category, total, total, price, status]
    );

    res.status(201).json({
      message: 'Equipment added successfully',
      equipment: {
        asset_id,
        name,
        category,
        total_quantity: total,
        available_quantity: total,
        daily_price: price,
        status
      }
    });
  } catch (err) {
    next(err);
  }
});

// 5. Admin: Set prices and update inventory details in database
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { daily_price, total_quantity, available_quantity, status, name } = req.body;

    const updates = [];
    const params = [];
    if (daily_price !== undefined) { updates.push('daily_price = ?'); params.push(Number(daily_price)); }
    if (total_quantity !== undefined) { updates.push('total_quantity = ?'); params.push(Number(total_quantity)); }
    if (available_quantity !== undefined) { updates.push('available_quantity = ?'); params.push(Number(available_quantity)); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (name) { updates.push('name = ?'); params.push(name); }

    if (updates.length > 0) {
      params.push(id);
      await db.query(`UPDATE equipment SET ${updates.join(', ')} WHERE asset_id = ?`, params);
    }

    const rows = await db.query('SELECT * FROM equipment WHERE asset_id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    }

    res.json({ message: 'Equipment updated successfully', equipment: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 6. Admin: Remove inventory from database
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await db.query('SELECT * FROM equipment WHERE asset_id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    }

    await db.query('DELETE FROM equipment WHERE asset_id = ?', [id]);
    res.json({ message: `Equipment ${id} removed successfully` });
  } catch (err) {
    next(err);
  }
});

// 7. Checkout Gear: fires TRIGGER trg_equipment_checkout_decrement in MySQL
router.post('/checkout', blockNonMembers, async (req, res, next) => {
  try {
    const { asset_id, member_id, issue_date, due_date } = req.body;
    const targetUserId = req.user.role === 'admin' && member_id ? Number(String(member_id).replace(/\D/g, '')) : req.user.user_id;

    const eqRows = await db.query('SELECT * FROM equipment WHERE asset_id = ?', [asset_id]);
    if (!eqRows || eqRows.length === 0) {
      return res.status(404).json({ error: 'Equipment asset not found' });
    }
    const eq = eqRows[0];

    if (Number(eq.available_quantity) <= 0 || eq.status === 'Under Maintenance') {
      return res.status(400).json({ error: `${eq.name} is not currently available for checkout.` });
    }

    let discountPercent = 0;
    const subRows = await db.query(
      `SELECT mp.equipment_discount_percent 
       FROM subscriptions s 
       JOIN membership_plans mp ON s.plan_id = mp.plan_id 
       WHERE s.user_id = ? AND s.status = 'Active'`,
      [targetUserId]
    );
    if (subRows && subRows.length > 0) {
      discountPercent = Number(subRows[0].equipment_discount_percent) || 0;
    }

    const effectiveRate = Math.round(Number(eq.daily_price) * (1 - discountPercent / 100));
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultDue = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    // Inserting into equipment_checkouts automatically executes MySQL TRIGGER trg_equipment_checkout_decrement
    const insertResult = await db.query(
      'INSERT INTO equipment_checkouts (asset_id, user_id, issue_date, due_date, return_date, daily_rate, discount_percent, late_fee, status) VALUES (?, ?, ?, ?, NULL, ?, ?, 0, ?)',
      [asset_id, targetUserId, issue_date || todayStr, due_date || defaultDue, effectiveRate, discountPercent, 'Active']
    );

    res.status(201).json({
      message: `Checked out ${eq.name} successfully!`,
      checkout_id: insertResult.insertId,
      daily_rate: effectiveRate
    });
  } catch (err) {
    next(err);
  }
});

// 8. Return Gear: fires TRIGGER trg_equipment_checkout_return in MySQL
router.post('/return/:id', async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const checkoutId = Number(String(rawId).replace(/\D/g, ''));
    const todayStr = new Date().toISOString().slice(0, 10);

    // Updating return_date automatically executes MySQL TRIGGER trg_equipment_checkout_return
    await db.query(
      'UPDATE equipment_checkouts SET return_date = ?, status = ? WHERE checkout_id = ?',
      [todayStr, 'Returned', checkoutId]
    );

    res.json({ message: 'Equipment returned successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
