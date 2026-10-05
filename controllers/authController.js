const { HttpError } = require('../utils/validation');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (![first_name,last_name].every(v => typeof v === 'string' && v.trim() && v.length <= 50)) throw new HttpError(400, 'First and last name are required (maximum 50 characters each).');
    if (typeof email !== 'string' || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Provide a valid email.');
    validatePassword(password);
    if (phone != null && (typeof phone !== 'string' || !/^[+0-9 ()-]{7,20}$/.test(phone))) throw new HttpError(400, 'Invalid phone number.');

    // Check duplicate email
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
    if (existing.length) return res.status(400).json({ success: false, message: 'Email already registered.' });

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash) VALUES (?,?,?,?,?)',
      [first_name.trim(), last_name.trim(), email.trim().toLowerCase(), phone || null, password_hash]
    );

    const token = signToken(result.insertId);
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: result.insertId, first_name, last_name, email, role: 'customer' }
    });
  } catch (err) {
    res.status(err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({ success: false, message: err.status ? err.message : err.code === 'ER_DUP_ENTRY' ? 'Email already registered.' : 'Account operation failed.' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = signToken(user.id);
    res.json({
      success: true,
      message: `Welcome back, ${user.first_name}!`,
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({ success: false, message: err.status ? err.message : err.code === 'ER_DUP_ENTRY' ? 'Email already registered.' : 'Account operation failed.' });
  }
};

// GET /api/auth/me  (protected)
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({ success: false, message: err.status ? err.message : err.code === 'ER_DUP_ENTRY' ? 'Email already registered.' : 'Account operation failed.' });
  }
};

// PUT /api/auth/update-profile  (protected)
exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    if (![first_name,last_name].every(v => typeof v === 'string' && v.trim() && v.length <= 50)) throw new HttpError(400, 'Valid first and last names are required.');
    if (phone != null && (typeof phone !== 'string' || !/^[+0-9 ()-]{7,20}$/.test(phone))) throw new HttpError(400, 'Invalid phone number.');
    await db.execute(
      'UPDATE users SET first_name=?, last_name=?, phone=? WHERE id=?',
      [first_name.trim(), last_name.trim(), phone || null, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({ success: false, message: err.status ? err.message : err.code === 'ER_DUP_ENTRY' ? 'Email already registered.' : 'Account operation failed.' });
  }
};

// PUT /api/auth/change-password  (protected)
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    validatePassword(new_password);
    if (typeof current_password !== 'string') throw new HttpError(400, 'Current password is required.');
    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({ success: false, message: err.status ? err.message : err.code === 'ER_DUP_ENTRY' ? 'Email already registered.' : 'Account operation failed.' });
  }
};

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Password must contain at least 8 characters and fit within 72 UTF-8 bytes.');
}
