require('dotenv').config();
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mathverse2026';

// Parse JSON and URL-encoded form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public with automatic .html resolution
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// In-memory admin tokens store (token -> { loginTime })
const adminTokens = new Map();

// Helper: Admin authentication middleware
function requireAdmin(req, res, next) {
  let token = req.headers['x-admin-token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin token.' });
  }

  req.adminSession = adminTokens.get(token);
  next();
}

/* ==========================================================================
   Public APIs: Events, Registration & Tickets
   ========================================================================== */

// GET /api/events - List events with live registration counts and seat calculations
app.get('/api/events', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        COALESCE(COUNT(r.id), 0) AS registered_count,
        MAX(0, e.capacity - COALESCE(COUNT(r.id), 0)) AS seats_left,
        CASE WHEN COALESCE(COUNT(r.id), 0) >= e.capacity THEN 1 ELSE 0 END AS is_sold_out
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id
      ORDER BY e.id ASC
    `);
    const events = stmt.all();
    res.json({ success: true, events });
  } catch (err) {
    console.error('[API /api/events error]', err);
    res.status(500).json({ error: 'Failed to retrieve events.' });
  }
});

// POST /api/register - Register attendee for an event
app.post('/api/register', async (req, res) => {
  try {
    const { event_id, name, email, phone, enrollment_no, branch, year } = req.body;

    // Validate required fields
    if (!event_id || !name || !email || !phone || !enrollment_no || !branch || !year) {
      return res.status(400).json({ error: 'All fields are required. Please fill out the complete form.' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const cleanEnroll = String(enrollment_no).trim().toUpperCase();
    const cleanBranch = String(branch).trim();
    const cleanYear = String(year).trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Phone format validation (must contain at least 7 digits)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid phone number (at least 7 digits).' });
    }

    // Check if event exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Specified event not found.' });
    }

    // Check for duplicate registration (same email + same event)
    const duplicate = db.prepare(
      'SELECT id, ticket_code FROM registrations WHERE event_id = ? AND LOWER(email) = ?'
    ).get(event_id, cleanEmail);

    if (duplicate) {
      return res.status(409).json({
        error: `You have already registered for "${event.title}" with this email address (${cleanEmail}).`,
        existing_ticket_code: duplicate.ticket_code
      });
    }

    // Check event capacity
    const regCountRow = db.prepare(
      'SELECT COUNT(*) as count FROM registrations WHERE event_id = ?'
    ).get(event_id);

    if (regCountRow.count >= event.capacity) {
      return res.status(400).json({
        error: `Sorry! "${event.title}" has reached its maximum capacity of ${event.capacity} seats (Sold Out).`
      });
    }

    // Generate unique ticket code: MV-2026-XXXXXX
    let ticketCode;
    let isUnique = false;
    while (!isUnique) {
      const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      ticketCode = `MV-2026-${randHex}`;
      const existing = db.prepare('SELECT 1 FROM registrations WHERE ticket_code = ?').get(ticketCode);
      if (!existing) isUnique = true;
    }

    // Insert registration into database
    const insertStmt = db.prepare(`
      INSERT INTO registrations (ticket_code, event_id, name, email, phone, enrollment_no, branch, year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      ticketCode,
      event_id,
      cleanName,
      cleanEmail,
      cleanPhone,
      cleanEnroll,
      cleanBranch,
      cleanYear
    );

    // Generate QR code data URL encoding ticket verification URL / code
    const qrDataUrl = await qrcode.toDataURL(ticketCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
      color: {
        dark: '#080c1f',
        light: '#ffffff'
      }
    });

    const ticketData = {
      id: result.lastInsertRowid,
      ticket_code: ticketCode,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      enrollment_no: cleanEnroll,
      branch: cleanBranch,
      year: cleanYear,
      created_at: new Date().toISOString(),
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venue: event.venue,
        category: event.category
      }
    };

    // Broadcast registration update via Socket.IO
    io.emit('event:registered', {
      event_id: event.id,
      new_registered_count: regCountRow.count + 1,
      capacity: event.capacity
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      ticket: ticketData,
      qr_code: qrDataUrl
    });
  } catch (err) {
    console.error('[API /api/register error]', err);
    res.status(500).json({ error: 'Server error occurred during registration. Please try again.' });
  }
});

// GET /api/ticket/:code - Get ticket details and QR code image
app.get('/api/ticket/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = String(code).trim().toUpperCase();

    const stmt = db.prepare(`
      SELECT 
        r.*,
        e.title AS event_title,
        e.date AS event_date,
        e.time AS event_time,
        e.venue AS event_venue,
        e.category AS event_category
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE UPPER(r.ticket_code) = ?
    `);

    const reg = stmt.get(cleanCode);
    if (!reg) {
      return res.status(404).json({ error: 'Ticket not found. Please verify your ticket code.' });
    }

    const qrDataUrl = await qrcode.toDataURL(cleanCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
      color: {
        dark: '#080c1f',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      ticket: reg,
      qr_code: qrDataUrl
    });
  } catch (err) {
    console.error('[API /api/ticket error]', err);
    res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
});

/* ==========================================================================
   Admin Authentication & Management APIs
   ========================================================================== */

// POST /api/admin/login - Authenticate with ADMIN_PASSWORD and receive memory token
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password || String(password) !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.set(token, { loginTime: Date.now() });

    res.json({
      success: true,
      token,
      message: 'Admin authorization granted.'
    });
  } catch (err) {
    console.error('[API /api/admin/login error]', err);
    res.status(500).json({ error: 'Login service failed.' });
  }
});

// GET /api/admin/stats - High-level metrics for admin dashboard
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalRegs = db.prepare('SELECT COUNT(*) as count FROM registrations').get().count;
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const totalCap = db.prepare('SELECT SUM(capacity) as cap FROM events').get().cap || 0;

    const perEvent = db.prepare(`
      SELECT 
        e.id,
        e.title,
        e.capacity,
        e.date,
        e.status,
        COALESCE(COUNT(r.id), 0) AS registered_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id
      ORDER BY e.id ASC
    `).all();

    res.json({
      success: true,
      stats: {
        total_registrations: totalRegs,
        total_events: totalEvents,
        total_capacity: totalCap,
        overall_utilization_pct: totalCap > 0 ? Math.round((totalRegs / totalCap) * 100) : 0,
        per_event: perEvent
      }
    });
  } catch (err) {
    console.error('[API /api/admin/stats error]', err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/registrations - Searchable & filterable attendees table
app.get('/api/admin/registrations', requireAdmin, (req, res) => {
  try {
    const { event, search } = req.query;
    let query = `
      SELECT 
        r.*,
        e.title AS event_title,
        e.venue AS event_venue
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (event && event !== 'all') {
      query += ` AND r.event_id = ?`;
      params.push(event);
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (
        r.name LIKE ? OR 
        r.email LIKE ? OR 
        r.enrollment_no LIKE ? OR 
        r.ticket_code LIKE ? OR 
        e.title LIKE ?
      )`;
      params.push(q, q, q, q, q);
    }

    query += ` ORDER BY r.created_at DESC`;

    const registrations = db.prepare(query).all(...params);
    res.json({ success: true, count: registrations.length, registrations });
  } catch (err) {
    console.error('[API /api/admin/registrations error]', err);
    res.status(500).json({ error: 'Failed to retrieve registrations.' });
  }
});

// GET /api/admin/export.csv - Download CSV export of all registrations
app.get('/api/admin/export.csv', requireAdmin, (req, res) => {
  try {
    const { event } = req.query;
    let query = `
      SELECT 
        r.id,
        r.ticket_code,
        e.title AS event_title,
        r.name,
        r.email,
        r.phone,
        r.enrollment_no,
        r.branch,
        r.year,
        r.created_at,
        r.checked_in
      FROM registrations r
      JOIN events e ON r.event_id = e.id
    `;
    const params = [];
    if (event && event !== 'all') {
      query += ` WHERE r.event_id = ?`;
      params.push(event);
    }
    query += ` ORDER BY r.created_at DESC`;

    const rows = db.prepare(query).all(...params);

    const headers = [
      'Registration ID',
      'Ticket Code',
      'Event Title',
      'Attendee Name',
      'Email',
      'Phone',
      'Enrollment No',
      'Branch',
      'Academic Year',
      'Registration Timestamp',
      'Checked In Status'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];

    for (const r of rows) {
      csvLines.push([
        escapeCsv(r.id),
        escapeCsv(r.ticket_code),
        escapeCsv(r.event_title),
        escapeCsv(r.name),
        escapeCsv(r.email),
        escapeCsv(r.phone),
        escapeCsv(r.enrollment_no),
        escapeCsv(r.branch),
        escapeCsv(r.year),
        escapeCsv(r.created_at),
        escapeCsv(r.checked_in ? 'Yes' : 'No')
      ].join(','));
    }

    const csvContent = csvLines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mathverse_registrations.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('[API /api/admin/export.csv error]', err);
    res.status(500).send('Error generating CSV export.');
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`MathVerse server listening at http://localhost:${PORT}`);
});
