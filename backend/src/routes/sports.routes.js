import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await db.query('SELECT sport_id, sport_name, category FROM sports ORDER BY sport_id');
    res.json({ sports: rows || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
