const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/calls - Get call history for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        cl.id,
        cl.caller_uid,
        cl.callee_uid,
        cl.start_time,
        cl.end_time,
        cl.status,
        cl.duration_seconds,
        cl.metadata,
        CASE 
          WHEN cl.caller_id = $1 THEN 'outgoing'
          ELSE 'incoming'
        END as direction,
        CASE 
          WHEN cl.caller_id = $1 THEN callee.display_name
          ELSE caller.display_name
        END as other_party_name,
        CASE 
          WHEN cl.caller_id = $1 THEN cl.callee_uid
          ELSE cl.caller_uid
        END as other_party_uid
      FROM call_logs cl
      LEFT JOIN users caller ON cl.caller_id = caller.id
      LEFT JOIN users callee ON cl.callee_id = callee.id
      WHERE cl.caller_id = $1 OR cl.callee_id = $1
      ORDER BY cl.start_time DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM call_logs WHERE caller_id = $1 OR callee_id = $1',
      [req.user.id]
    );

    const totalCalls = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCalls / limit);

    res.json({
      calls: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCalls,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calls/:id - Get specific call details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cl.*,
        caller.display_name as caller_name,
        callee.display_name as callee_name
      FROM call_logs cl
      LEFT JOIN users caller ON cl.caller_id = caller.id
      LEFT JOIN users callee ON cl.callee_id = callee.id
      WHERE cl.id = $1 AND (cl.caller_id = $2 OR cl.callee_id = $2)
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/calls - Create a new call log entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { calleeUid, status = 'missed', metadata = {} } = req.body;

    // Validate callee UID format
    if (!/^\d{10}$/.test(calleeUid)) {
      return res.status(400).json({ error: 'Invalid callee UID format' });
    }

    // Get callee user
    const calleeResult = await pool.query('SELECT id FROM users WHERE uid = $1', [calleeUid]);
    if (calleeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Callee not found' });
    }

    const calleeId = calleeResult.rows[0].id;

    // Create call log
    const result = await pool.query(`
      INSERT INTO call_logs (caller_id, callee_id, caller_uid, callee_uid, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, calleeId, req.user.uid, calleeUid, status, JSON.stringify(metadata)]);

    res.status(201).json({
      message: 'Call log created',
      call: result.rows[0]
    });

  } catch (error) {
    console.error('Create call log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/calls/:id - Update call log (end call, update status)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, endTime, durationSeconds, metadata } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (endTime) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(endTime);
    }

    if (durationSeconds !== undefined) {
      updates.push(`duration_seconds = $${paramCount++}`);
      values.push(durationSeconds);
    }

    if (metadata) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id, req.user.id);
    const query = `
      UPDATE call_logs 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND (caller_id = $${paramCount} OR callee_id = $${paramCount})
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found or unauthorized' });
    }

    res.json({
      message: 'Call updated successfully',
      call: result.rows[0]
    });

  } catch (error) {
    console.error('Update call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;