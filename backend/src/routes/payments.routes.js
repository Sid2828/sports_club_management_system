import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT
        payment_id,
        user_id,
        booking_id,
        checkout_id,
        subscription_id,
        amount,
        payment_method,
        payment_status,
        DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date
      FROM payments
      ORDER BY payment_id DESC
    `);

    const payments = (rows || []).map((p) => ({
      payment_id: `P${p.payment_id}`,
      booking_id: p.booking_id ? `B${p.booking_id}` : '',
      user_id: p.user_id,
      amount: Number(p.amount || 0),
      payment_method: p.payment_method,
      payment_status: p.payment_status,
      payment_date: p.payment_date
    }));

    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

export default router;
