const express = require('express');
const pool = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me - Get current user profile (must come before /:uid)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, uid, email, display_name, created_at, last_seen, settings FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      lastSeen: user.last_seen,
      settings: user.settings
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/me - Update current user profile
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const { displayName, settings } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(displayName);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.user.id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, last_seen = NOW() 
      WHERE id = $${paramCount}
      RETURNING id, uid, email, display_name, settings
    `;

    const result = await pool.query(query, values);
    const user = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:uid - Get public user profile by UID
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Validate UID format (10 digits)
    if (!/^\d{10}$/.test(uid)) {
      return res.status(400).json({ error: 'Invalid UID format' });
    }

    const result = await pool.query(
      'SELECT uid, display_name, last_seen FROM users WHERE uid = $1',
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Calculate online status (online if last seen within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isOnline = new Date(user.last_seen) > fiveMinutesAgo;

    res.json({
      uid: user.uid,
      displayName: user.display_name,
      status: isOnline ? 'online' : 'offline',
      lastSeen: user.last_seen
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;