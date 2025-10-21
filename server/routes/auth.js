const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const pool = require('../database/connection');
const { generateUniqueUID } = require('../utils/uidGenerator');
const { generateTokens } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    // Validate input
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, displayName } = value;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate unique UID
    const uid = await generateUniqueUID(pool);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (uid, email, password_hash, display_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, uid, email, display_name, created_at`,
      [uid, email, passwordHash, displayName || null]
    );

    const user = result.rows[0];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Get user from database
    const result = await pool.query(
      'SELECT id, uid, email, password_hash, display_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.display_name
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;