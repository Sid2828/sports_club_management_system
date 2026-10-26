import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Helper to format operation object for frontend compatibility
function formatOperation(op) {
  const reqId = typeof op.operation_id === 'number' ? `MR-${op.operation_id}` : String(op.operation_id);
  const targetId = op.target_id || op.venue_id;
  const schedDate = op.scheduled_date ? String(op.scheduled_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const compDate = op.completed_date ? String(op.completed_date).slice(0, 10) : null;

  return {
    operation_id: op.operation_id,
    request_id: reqId,
    target_type: op.target_type || 'venue',
    target_id: targetId,
    venue_id: targetId,
    description: op.description,
    priority: op.priority || 'Medium',
    request_status: op.request_status || 'Pending',
    scheduled_date: schedDate,
    reported_date: schedDate,
    completed_date: compDate,
    technician_notes: op.technician_notes || '',
    created_at: op.created_at
  };
}

// 1. Get all maintenance operations
router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM maintenance_operations ORDER BY operation_id DESC');
    const formatted = rows.map(formatOperation);
    res.json({ maintenance: formatted });
  } catch (error) {
    console.error('Fetch maintenance operations error:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance operations', details: error.message });
  }
});

// 2. Add maintenance operation (Admin schedules, or Member reports issue)
router.post('/', async (req, res) => {
  const {
    target_type = 'venue',
    target_id,
    venue_id,
    description,
    priority = 'Medium',
    scheduled_date,
    technician_notes
  } = req.body;

  const actualTargetId = target_id || venue_id;
  if (!actualTargetId || !description) {
    return res.status(400).json({ error: 'Missing required maintenance fields: target_id (or venue_id), description' });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const schedDate = scheduled_date || todayStr;

  try {
    // INSERT will fire TRIGGER trg_maintenance_status_sync in MySQL
    const result = await db.query(
      `INSERT INTO maintenance_operations 
       (target_type, target_id, description, priority, request_status, scheduled_date, technician_notes)
       VALUES (?, ?, ?, ?, 'Pending', ?, ?)`,
      [target_type, actualTargetId, description, priority, schedDate, technician_notes || null]
    );

    const newOp = {
      operation_id: result.insertId,
      target_type,
      target_id: actualTargetId,
      venue_id: actualTargetId,
      description,
      priority,
      request_status: 'Pending',
      scheduled_date: schedDate,
      technician_notes: technician_notes || ''
    };

    res.status(201).json({
      message: 'Maintenance operation scheduled successfully',
      operation: formatOperation(newOp)
    });
  } catch (error) {
    console.error('Add maintenance error:', error);
    res.status(500).json({ error: 'Failed to add maintenance operation', details: error.message });
  }
});

// 3. Remove specific maintenance operation
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(String(rawId).replace(/^MR-/, ''));

  try {
    const ops = await db.query('SELECT * FROM maintenance_operations WHERE operation_id = ?', [id]);
    if (!ops || ops.length === 0) {
      return res.status(404).json({ error: 'Maintenance operation not found' });
    }

    const op = ops[0];
    await db.query('DELETE FROM maintenance_operations WHERE operation_id = ?', [id]);

    // Check if other pending/in-progress maintenance operations remain for this target
    const remaining = await db.query(
      `SELECT COUNT(*) as cnt FROM maintenance_operations 
       WHERE target_id = ? AND request_status != 'Completed'`,
      [op.target_id]
    );

    if (remaining[0].cnt === 0) {
      if (op.target_type === 'venue') {
        await db.query(
          `UPDATE venues SET status = 'Available' WHERE venue_id = ? AND status = 'Under Maintenance'`,
          [op.target_id]
        );
      } else if (op.target_type === 'equipment') {
        await db.query(
          `UPDATE equipment SET status = 'Available' WHERE asset_id = ? AND status = 'Under Maintenance'`,
          [op.target_id]
        );
      }
    }

    res.json({ message: `Maintenance operation ${rawId} removed successfully` });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ error: 'Failed to delete maintenance operation', details: error.message });
  }
});

// 4. Update status of maintenance operation
router.put('/:id/status', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(String(rawId).replace(/^MR-/, ''));
  const { status, request_status, technician_notes } = req.body;
  const newStatus = status || request_status;

  try {
    const ops = await db.query('SELECT * FROM maintenance_operations WHERE operation_id = ?', [id]);
    if (!ops || ops.length === 0) {
      return res.status(404).json({ error: 'Maintenance operation not found' });
    }

    const op = ops[0];
    const completedDate = newStatus === 'Completed' ? new Date().toISOString().slice(0, 10) : op.completed_date;
    const notes = technician_notes !== undefined ? technician_notes : op.technician_notes;

    await db.query(
      `UPDATE maintenance_operations 
       SET request_status = ?, completed_date = ?, technician_notes = ? 
       WHERE operation_id = ?`,
      [newStatus, completedDate, notes, id]
    );

    if (newStatus === 'Completed') {
      const remaining = await db.query(
        `SELECT COUNT(*) as cnt FROM maintenance_operations 
         WHERE target_id = ? AND request_status != 'Completed'`,
        [op.target_id]
      );

      if (remaining[0].cnt === 0) {
        if (op.target_type === 'venue') {
          await db.query(
            `UPDATE venues SET status = 'Available' WHERE venue_id = ? AND status = 'Under Maintenance'`,
            [op.target_id]
          );
        } else if (op.target_type === 'equipment') {
          await db.query(
            `UPDATE equipment SET status = 'Available' WHERE asset_id = ? AND status = 'Under Maintenance'`,
            [op.target_id]
          );
        }
      }
    }

    const updatedOp = {
      ...op,
      request_status: newStatus,
      completed_date: completedDate,
      technician_notes: notes
    };

    res.json({ message: 'Maintenance status updated', operation: formatOperation(updatedOp) });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ error: 'Failed to update maintenance status', details: error.message });
  }
});

export default router;
