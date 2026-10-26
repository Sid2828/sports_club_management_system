import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

async function listPlans(req, res) {
  try {
    const plans = await db.query('SELECT * FROM membership_plans WHERE is_active = TRUE ORDER BY plan_id');
    const formatted = plans.map(p => {
      let benefits = [];
      if (typeof p.benefits === 'string') {
        try {
          benefits = JSON.parse(p.benefits);
        } catch {
          benefits = [p.benefits];
        }
      } else if (Array.isArray(p.benefits)) {
        benefits = p.benefits;
      }

      const mFee = Number(p.monthly_fee);
      const yFee = Number(p.yearly_fee);
      const eqDisc = Number(p.equipment_discount_percent);
      const venDisc = Number(p.venue_discount_percent);

      return {
        plan_id: p.plan_id,
        plan_code: p.plan_code,
        plan_name: p.plan_name,
        monthly_fee: mFee,
        yearly_fee: yFee,
        equipment_discount: eqDisc,
        equipment_discount_percent: eqDisc,
        venue_discount: venDisc,
        venue_discount_percent: venDisc,
        duration: '1 Month / 1 Year',
        formatted_monthly: `₹${mFee.toLocaleString('en-IN')}/mo`,
        formatted_yearly: `₹${yFee.toLocaleString('en-IN')}/yr`,
        benefits
      };
    });

    res.json({ plans: formatted });
  } catch (error) {
    console.error('Fetch membership plans error:', error);
    res.status(500).json({ error: 'Failed to fetch membership plans', details: error.message });
  }
}

router.get('/', listPlans);
router.get('/plans', listPlans);

// 2. Subscribe or Upgrade Membership Plan
router.post('/subscribe', async (req, res) => {
  const { plan_name, billing_cycle = 'monthly', payment_method = 'Card' } = req.body;
  const userId = req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required to subscribe.' });
  }

  try {
    const plans = await db.query(
      'SELECT * FROM membership_plans WHERE LOWER(plan_name) = LOWER(?) AND is_active = TRUE LIMIT 1',
      [(plan_name || '').trim()]
    );

    if (!plans || plans.length === 0) {
      return res.status(400).json({ error: 'Invalid plan selected. Choose Gold or Platinum.' });
    }

    const plan = plans[0];
    const cost = billing_cycle === 'yearly' ? Number(plan.yearly_fee) : Number(plan.monthly_fee);
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const endDateObj = new Date(today);
    if (billing_cycle === 'yearly') {
      endDateObj.setFullYear(endDateObj.getFullYear() + 1);
    } else {
      endDateObj.setMonth(endDateObj.getMonth() + 1);
    }
    const endDate = endDateObj.toISOString().slice(0, 10);

    // Upgrade user role to member
    await db.query('UPDATE users SET role = "member" WHERE user_id = ?', [userId]);

    // Deactivate previous active subscriptions
    await db.query('UPDATE subscriptions SET status = "Expired" WHERE user_id = ? AND status = "Active"', [userId]);

    // Insert new subscription
    const subResult = await db.query(
      `INSERT INTO subscriptions (user_id, plan_id, billing_cycle, amount_paid, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
      [userId, plan.plan_id, billing_cycle, cost, startDate, endDate]
    );

    const subscriptionId = subResult.insertId;

    // Record payment
    await db.query(
      `INSERT INTO payments (user_id, subscription_id, amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?, 'Paid')`,
      [userId, subscriptionId, cost, payment_method]
    );

    let benefits = [];
    if (typeof plan.benefits === 'string') {
      try { benefits = JSON.parse(plan.benefits); } catch { benefits = [plan.benefits]; }
    } else if (Array.isArray(plan.benefits)) {
      benefits = plan.benefits;
    }

    res.status(201).json({
      message: `Successfully upgraded to ${plan.plan_name} Membership!`,
      subscription: {
        subscription_id: subscriptionId,
        user_id: userId,
        plan_id: plan.plan_id,
        billing_cycle,
        amount_paid: cost,
        start_date: startDate,
        end_date: endDate,
        status: 'Active'
      },
      tier: plan.plan_name,
      role: 'member',
      benefits,
      discounts: {
        equipment: `${plan.equipment_discount_percent}%`,
        venue: `${plan.venue_discount_percent}%`
      }
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to process subscription', details: error.message });
  }
});

export default router;
