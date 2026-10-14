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
   Member Authentication & Security Utilities (scrypt + rate limiting)
   ========================================================================== */

// Helper: Secure password hashing with Node.js built-in crypto.scrypt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    return false;
  }
}

// In-memory active member session tokens (token -> { memberId, email, name, memberCode, loginTime })
const memberTokens = new Map();

// In-memory login rate limiter (ip -> { count, resetAt })
const loginAttempts = new Map();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { limited: false };
  if (now > attempt.resetAt) {
    loginAttempts.delete(ip);
    return { limited: false };
  }
  if (attempt.count >= 5) {
    const minutesLeft = Math.ceil((attempt.resetAt - now) / 60000);
    return { limited: true, minutesLeft };
  }
  return { limited: false };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt || now > attempt.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
  } else {
    attempt.count++;
  }
}

function clearFailedLogins(ip) {
  loginAttempts.delete(ip);
}

// Helper: Member authentication middleware
function requireMember(req, res, next) {
  let token = req.headers['x-member-token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }
  if (!token && req.query.member_token) {
    token = req.query.member_token;
  }

  if (!token || !memberTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Please log in to your MathVerse member account.' });
  }

  req.memberSession = memberTokens.get(token);
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

// GET /api/admin/members - Roster of all club members with aggregated points
app.get('/api/admin/members', requireAdmin, (req, res) => {
  try {
    const members = db.prepare(`
      SELECT 
        m.id,
        m.member_code,
        m.name,
        m.email,
        m.branch,
        m.year,
        m.bio,
        m.joined_at,
        COALESCE(SUM(sp.final_score), 0) AS points,
        COUNT(DISTINCT sp.session_id) AS quizzes_played
      FROM members m
      LEFT JOIN session_players sp ON m.id = sp.member_id
      LEFT JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
      GROUP BY m.id
      ORDER BY m.id DESC
    `).all();
    res.json({ success: true, count: members.length, members });
  } catch (err) {
    console.error('[API GET /api/admin/members error]', err);
    res.status(500).json({ error: 'Failed to retrieve members.' });
  }
});

// DELETE /api/admin/members/:id - Remove a member account
app.delete('/api/admin/members/:id', requireAdmin, (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const delTx = db.transaction(() => {
      // Nullify member_id in session_players so past tournament records stay intact
      db.prepare('UPDATE session_players SET member_id = NULL WHERE member_id = ?').run(memberId);
      db.prepare('DELETE FROM members WHERE id = ?').run(memberId);
    });
    delTx();

    // Revoke any active token sessions for this member
    for (const [token, sess] of memberTokens.entries()) {
      if (sess.memberId === memberId) {
        memberTokens.delete(token);
      }
    }

    res.json({ success: true, message: `Member ${member.name} (${member.member_code}) removed successfully.` });
  } catch (err) {
    console.error('[API DELETE /api/admin/members/:id error]', err);
    res.status(500).json({ error: 'Failed to delete member.' });
  }
});

/* ==========================================================================
   Quiz Management & Live Arena REST APIs
   ========================================================================== */

// In-memory active arena rooms: room_code -> RoomState
const activeRooms = new Map();

// GET /api/quizzes - List all quizzes with question counts
app.get('/api/quizzes', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT q.id, q.title, q.created_at, COUNT(qs.id) AS question_count
      FROM quizzes q
      LEFT JOIN questions qs ON q.id = qs.quiz_id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);
    const quizzes = stmt.all();
    res.json({ success: true, quizzes });
  } catch (err) {
    console.error('[API /api/quizzes error]', err);
    res.status(500).json({ error: 'Failed to retrieve quizzes.' });
  }
});

// GET /api/quizzes/:id - Get quiz details with full questions
app.get('/api/quizzes/:id', (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC').all(req.params.id);
    const formatted = questions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    res.json({ success: true, quiz: { ...quiz, questions: formatted } });
  } catch (err) {
    console.error('[API /api/quizzes/:id error]', err);
    res.status(500).json({ error: 'Failed to retrieve quiz details.' });
  }
});

// POST /api/quizzes - Create new quiz (Admin only)
app.post('/api/quizzes', requireAdmin, (req, res) => {
  try {
    const { title, questions } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required.' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required.' });
    }

    const insertQuiz = db.prepare('INSERT INTO quizzes (title) VALUES (?)');
    const insertQuestion = db.prepare(`
      INSERT INTO questions (quiz_id, text, options, correct_index, time_limit_sec, points)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let quizId;
    const tx = db.transaction(() => {
      const info = insertQuiz.run(title.trim());
      quizId = info.lastInsertRowid;
      for (const q of questions) {
        const opts = Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'];
        insertQuestion.run(
          quizId,
          String(q.text || '').trim(),
          JSON.stringify(opts),
          typeof q.correct_index === 'number' ? q.correct_index : 0,
          q.time_limit_sec || 20,
          q.points || 1000
        );
      }
    });
    tx();

    res.status(201).json({ success: true, quiz_id: quizId, message: 'Quiz created successfully.' });
  } catch (err) {
    console.error('[API POST /api/quizzes error]', err);
    res.status(500).json({ error: 'Failed to create quiz.' });
  }
});

// PUT /api/quizzes/:id - Update existing quiz (Admin only)
app.put('/api/quizzes/:id', requireAdmin, (req, res) => {
  try {
    const { title, questions } = req.body;
    const quizId = req.params.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required.' });
    }

    const existing = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(quizId);
    if (!existing) return res.status(404).json({ error: 'Quiz not found.' });

    const updateQuiz = db.prepare('UPDATE quizzes SET title = ? WHERE id = ?');
    const deleteOld = db.prepare('DELETE FROM questions WHERE quiz_id = ?');
    const insertQuestion = db.prepare(`
      INSERT INTO questions (quiz_id, text, options, correct_index, time_limit_sec, points)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      updateQuiz.run(title.trim(), quizId);
      deleteOld.run(quizId);
      if (Array.isArray(questions)) {
        for (const q of questions) {
          const opts = Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'];
          insertQuestion.run(
            quizId,
            String(q.text || '').trim(),
            JSON.stringify(opts),
            typeof q.correct_index === 'number' ? q.correct_index : 0,
            q.time_limit_sec || 20,
            q.points || 1000
          );
        }
      }
    });
    tx();

    res.json({ success: true, message: 'Quiz updated successfully.' });
  } catch (err) {
    console.error('[API PUT /api/quizzes/:id error]', err);
    res.status(500).json({ error: 'Failed to update quiz.' });
  }
});

// DELETE /api/quizzes/:id - Delete quiz (Admin only)
app.delete('/api/quizzes/:id', requireAdmin, (req, res) => {
  try {
    const quizId = req.params.id;
    db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(quizId);
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);
    res.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (err) {
    console.error('[API DELETE /api/quizzes/:id error]', err);
    res.status(500).json({ error: 'Failed to delete quiz.' });
  }
});

// POST /api/arena/create-session - Host creates a live Arena session
app.post('/api/arena/create-session', requireAdmin, async (req, res) => {
  try {
    const { quiz_id } = req.body;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quiz_id);
    if (!quiz) return res.status(404).json({ error: 'Selected quiz not found.' });

    const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC').all(quiz_id);
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'Selected quiz has no questions to host.' });
    }

    // Generate unique 6-character room code
    let roomCode;
    let isUnique = false;
    while (!isUnique) {
      roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      if (!activeRooms.has(roomCode)) isUnique = true;
    }

    // Insert session into database
    const sessResult = db.prepare('INSERT INTO sessions (quiz_id, room_code) VALUES (?, ?)').run(quiz_id, roomCode);
    const sessionId = sessResult.lastInsertRowid;

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correct_index: q.correct_index,
      time_limit_sec: q.time_limit_sec || 20,
      points: q.points || 1000
    }));

    // Initialize in-memory live room
    const roomState = {
      roomCode,
      sessionId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      hostSocketId: null,
      status: 'lobby', // 'lobby' | 'question' | 'results' | 'ended'
      currentQuestionIndex: -1,
      questions: formattedQuestions,
      questionStartTime: 0,
      timerInterval: null,
      timeRemainingSec: 0,
      players: new Map() // playerId -> { id, socketId, name, score, streak, answers: new Map(), connected: true }
    };
    activeRooms.set(roomCode, roomState);

    // Generate join QR code
    const hostUrl = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const joinUrl = `${protocol}://${hostUrl}/arena.html?code=${roomCode}`;
    const qrDataUrl = await qrcode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: { dark: '#080c1f', light: '#ffffff' }
    });

    res.json({
      success: true,
      room_code: roomCode,
      session_id: sessionId,
      quiz_title: quiz.title,
      question_count: formattedQuestions.length,
      join_url: joinUrl,
      qr_code: qrDataUrl
    });
  } catch (err) {
    console.error('[API /api/arena/create-session error]', err);
    res.status(500).json({ error: 'Failed to create arena session.' });
  }
});

// GET /api/arena/room/:code - Check live room status
app.get('/api/arena/room/:code', (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const room = activeRooms.get(code);
  if (!room) {
    return res.status(404).json({ exists: false, error: 'Arena room not found or session has ended.' });
  }
  res.json({
    exists: true,
    room_code: room.roomCode,
    quiz_title: room.quizTitle,
    status: room.status,
    player_count: room.players.size
  });
});

/* ==========================================================================
   Member Accounts, Public Directory, Profiles, Badges & Season Leaderboard
   ========================================================================== */

// POST /api/members/signup - Register new member account
app.post('/api/members/signup', (req, res) => {
  try {
    const { name, email, password, branch, year, bio } = req.body;
    if (!name || !email || !password || !branch || !year) {
      return res.status(400).json({ error: 'Name, email, password, branch, and academic year are required.' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanBranch = String(branch).trim();
    const cleanYear = String(year).trim();
    const cleanBio = bio ? String(bio).trim().slice(0, 300) : '';

    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({ error: 'Full name must be between 2 and 50 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters in length.' });
    }

    // Check duplicate email
    const existing = db.prepare('SELECT id FROM members WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    // Generate next unique member code (e.g. MV-M-0001)
    const maxRow = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM members').get();
    let codeNum = maxRow.next_id;
    let memberCode = `MV-M-${String(codeNum).padStart(4, '0')}`;
    while (db.prepare('SELECT id FROM members WHERE member_code = ?').get(memberCode)) {
      codeNum++;
      memberCode = `MV-M-${String(codeNum).padStart(4, '0')}`;
    }

    const passHash = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO members (member_code, name, email, password_hash, branch, year, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memberCode, cleanName, cleanEmail, passHash, cleanBranch, cleanYear, cleanBio);

    const memberId = result.lastInsertRowid;
    const token = crypto.randomBytes(32).toString('hex');
    memberTokens.set(token, {
      memberId,
      email: cleanEmail,
      name: cleanName,
      memberCode,
      loginTime: Date.now()
    });

    const memberRecord = {
      id: memberId,
      member_code: memberCode,
      name: cleanName,
      email: cleanEmail,
      branch: cleanBranch,
      year: cleanYear,
      bio: cleanBio,
      joined_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Welcome to MathVerse! Your membership account has been created.',
      token,
      member: memberRecord
    });
  } catch (err) {
    console.error('[API POST /api/members/signup error]', err);
    res.status(500).json({ error: 'Failed to create member account.' });
  }
});

// POST /api/members/login - Log in to member account with rate limiting
app.post('/api/members/login', (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateStatus = checkLoginRateLimit(ip);
    if (rateStatus.limited) {
      return res.status(429).json({
        error: `Too many failed login attempts. Please wait ${rateStatus.minutesLeft} minute(s) before trying again.`
      });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const member = db.prepare('SELECT * FROM members WHERE LOWER(email) = ?').get(cleanEmail);

    if (!member || !verifyPassword(password, member.password_hash)) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Success: clear failed attempts
    clearFailedLogins(ip);

    const token = crypto.randomBytes(32).toString('hex');
    memberTokens.set(token, {
      memberId: member.id,
      email: member.email,
      name: member.name,
      memberCode: member.member_code,
      loginTime: Date.now()
    });

    res.json({
      success: true,
      message: `Welcome back, ${member.name}!`,
      token,
      member: {
        id: member.id,
        member_code: member.member_code,
        name: member.name,
        email: member.email,
        branch: member.branch,
        year: member.year,
        bio: member.bio,
        joined_at: member.joined_at
      }
    });
  } catch (err) {
    console.error('[API POST /api/members/login error]', err);
    res.status(500).json({ error: 'Login service failed.' });
  }
});

// POST /api/members/logout - Invalidate member session token
app.post('/api/members/logout', (req, res) => {
  let token = req.headers['x-member-token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') token = parts[1];
  }
  if (token && memberTokens.has(token)) {
    memberTokens.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/members/me - Get currently logged-in member info and season stats
app.get('/api/members/me', requireMember, (req, res) => {
  try {
    const member = db.prepare(`
      SELECT id, member_code, name, email, branch, year, bio, joined_at
      FROM members
      WHERE id = ?
    `).get(req.memberSession.memberId);

    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(sp.final_score), 0) AS season_points,
        COUNT(DISTINCT sp.session_id) AS quizzes_played,
        COALESCE(SUM(CASE WHEN sp.final_rank = 1 THEN 1 ELSE 0 END), 0) AS wins
      FROM session_players sp
      JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
      WHERE sp.member_id = ?
    `).get(member.id);

    res.json({
      success: true,
      member: {
        ...member,
        season_points: stats ? stats.season_points : 0,
        quizzes_played: stats ? stats.quizzes_played : 0,
        wins: stats ? stats.wins : 0
      }
    });
  } catch (err) {
    console.error('[API GET /api/members/me error]', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// PUT /api/members/me - Update bio, branch, year (and optionally name)
app.put('/api/members/me', requireMember, (req, res) => {
  try {
    const { bio, branch, year, name } = req.body;
    const memberId = req.memberSession.memberId;
    const current = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (!current) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const newName = name ? String(name).trim().slice(0, 50) : current.name;
    const newBranch = branch ? String(branch).trim() : current.branch;
    const newYear = year ? String(year).trim() : current.year;
    const newBio = (bio !== undefined) ? String(bio).trim().slice(0, 300) : current.bio;

    db.prepare(`
      UPDATE members
      SET name = ?, branch = ?, year = ?, bio = ?
      WHERE id = ?
    `).run(newName, newBranch, newYear, newBio, memberId);

    req.memberSession.name = newName;

    const updated = db.prepare('SELECT id, member_code, name, email, branch, year, bio, joined_at FROM members WHERE id = ?').get(memberId);
    res.json({ success: true, message: 'Profile updated successfully.', member: updated });
  } catch (err) {
    console.error('[API PUT /api/members/me error]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// GET /api/members - Public members directory (NO emails, NO passwords)
app.get('/api/members', (req, res) => {
  try {
    const { search, branch, year, sort } = req.query;
    let query = `
      SELECT 
        m.id,
        m.member_code,
        m.name,
        m.branch,
        m.year,
        m.bio,
        m.joined_at,
        COALESCE(SUM(sp.final_score), 0) AS points,
        COUNT(DISTINCT sp.session_id) AS quizzes_played,
        COALESCE(SUM(CASE WHEN sp.final_rank = 1 THEN 1 ELSE 0 END), 0) AS wins
      FROM members m
      LEFT JOIN session_players sp ON m.id = sp.member_id
      LEFT JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
      WHERE 1=1
    `;
    const params = [];

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (m.name LIKE ? OR m.member_code LIKE ? OR m.bio LIKE ? OR m.branch LIKE ?)`;
      params.push(q, q, q, q);
    }

    if (branch && branch !== 'all') {
      query += ` AND m.branch = ?`;
      params.push(branch);
    }

    if (year && year !== 'all') {
      query += ` AND m.year = ?`;
      params.push(year);
    }

    query += ` GROUP BY m.id`;

    if (sort === 'name') {
      query += ` ORDER BY m.name ASC`;
    } else if (sort === 'recent') {
      query += ` ORDER BY m.joined_at DESC`;
    } else {
      query += ` ORDER BY points DESC, wins DESC, m.name ASC`;
    }

    const members = db.prepare(query).all(...params);
    res.json({ success: true, count: members.length, members });
  } catch (err) {
    console.error('[API GET /api/members error]', err);
    res.status(500).json({ error: 'Failed to retrieve members directory.' });
  }
});

// GET /api/members/:code - Public member profile by member_code with badges & tournament history
app.get('/api/members/:code', (req, res) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    const member = db.prepare(`
      SELECT id, member_code, name, branch, year, bio, joined_at
      FROM members
      WHERE UPPER(member_code) = ?
    `).get(code);

    if (!member) {
      return res.status(404).json({ error: 'Member not found with code: ' + code });
    }

    // Season stats
    const statsRow = db.prepare(`
      SELECT 
        COALESCE(SUM(sp.final_score), 0) AS season_points,
        COUNT(DISTINCT sp.session_id) AS quizzes_played,
        COALESCE(SUM(CASE WHEN sp.final_rank = 1 THEN 1 ELSE 0 END), 0) AS wins,
        COALESCE(SUM(CASE WHEN sp.final_rank <= 3 THEN 1 ELSE 0 END), 0) AS top3
      FROM session_players sp
      JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
      WHERE sp.member_id = ?
    `).get(member.id);

    const seasonPoints = statsRow ? statsRow.season_points : 0;
    const quizzesPlayed = statsRow ? statsRow.quizzes_played : 0;
    const wins = statsRow ? statsRow.wins : 0;
    const top3 = statsRow ? statsRow.top3 : 0;

    // Season Rank calculation
    const rankRow = db.prepare(`
      SELECT COUNT(*) + 1 AS season_rank
      FROM (
        SELECT m.id, COALESCE(SUM(sp.final_score), 0) AS pts
        FROM members m
        LEFT JOIN session_players sp ON m.id = sp.member_id
        LEFT JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
        GROUP BY m.id
        HAVING pts > ?
      )
    `).get(seasonPoints);
    const seasonRank = rankRow ? rankRow.season_rank : 1;

    // Accuracy calculation
    const ansStats = db.prepare(`
      SELECT 
        COUNT(*) AS total_answers,
        COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers
      FROM answers a
      JOIN session_players sp ON a.player_id = sp.id
      JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
      WHERE sp.member_id = ?
    `).get(member.id);

    const totalAnswers = ansStats ? ansStats.total_answers : 0;
    const correctAnswers = ansStats ? ansStats.correct_answers : 0;
    const accuracyPct = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    // Best streak calculation across single sessions
    const memberAnswers = db.prepare(`
      SELECT a.session_id, a.is_correct
      FROM answers a
      JOIN session_players sp ON a.player_id = sp.id
      JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL
      WHERE sp.member_id = ?
      ORDER BY a.session_id ASC, a.id ASC
    `).all(member.id);

    let maxStreak = 0;
    let curStreak = 0;
    let lastSession = null;
    for (const a of memberAnswers) {
      if (a.session_id !== lastSession) {
        lastSession = a.session_id;
        curStreak = 0;
      }
      if (a.is_correct === 1) {
        curStreak++;
        if (curStreak > maxStreak) maxStreak = curStreak;
      } else {
        curStreak = 0;
      }
    }

    // Dynamic Badges calculation
    const badges = [
      {
        id: 'first_steps',
        name: 'First Steps',
        icon: '🚀',
        description: 'Participated in at least 1 live quiz battle in the Arena.',
        earned: quizzesPlayed >= 1,
        progress: quizzesPlayed >= 1 ? 'Unlocked' : `${quizzesPlayed}/1 Quiz`
      },
      {
        id: 'podium_finisher',
        name: 'Podium Finisher',
        icon: '🥉',
        description: 'Achieved a top-3 podium finish on the live quiz leaderboard.',
        earned: top3 >= 1,
        progress: top3 >= 1 ? `${top3} Podium Finish${top3 === 1 ? '' : 'es'}` : '0/1 Podium'
      },
      {
        id: 'champion',
        name: 'Champion',
        icon: '👑',
        description: 'Claimed 1st place victory in an Arena tournament.',
        earned: wins >= 1,
        progress: wins >= 1 ? `${wins} Victory${wins === 1 ? '' : 'ies'}` : '0/1 Win'
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        icon: '🔥',
        description: 'Answered 5 or more consecutive questions correctly in a single quiz.',
        earned: maxStreak >= 5,
        progress: maxStreak >= 5 ? `Max Streak: ${maxStreak}` : `${maxStreak}/5 Streak`
      },
      {
        id: 'sharp_mind',
        name: 'Sharp Mind',
        icon: '🧠',
        description: 'Maintained 80%+ accuracy across at least 10 answered questions.',
        earned: (totalAnswers >= 10 && accuracyPct >= 80),
        progress: `${accuracyPct}% (${totalAnswers}/10 answers)`
      },
      {
        id: 'regular',
        name: 'Regular',
        icon: '⚡',
        description: 'Competed in 5 or more live Arena tournaments.',
        earned: quizzesPlayed >= 5,
        progress: `${Math.min(quizzesPlayed, 5)}/5 Quizzes`
      }
    ];

    // Recent tournament sessions played
    const recentGames = db.prepare(`
      SELECT 
        s.id AS session_id,
        s.room_code,
        s.started_at,
        s.ended_at,
        q.title AS quiz_title,
        sp.final_score,
        sp.final_rank,
        (SELECT COUNT(*) FROM session_players sp2 WHERE sp2.session_id = s.id) AS total_players
      FROM session_players sp
      JOIN sessions s ON sp.session_id = s.id
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE sp.member_id = ? AND s.ended_at IS NOT NULL
      ORDER BY s.id DESC
      LIMIT 10
    `).all(member.id);

    res.json({
      success: true,
      member: {
        ...member,
        season_points: seasonPoints,
        quizzes_played: quizzesPlayed,
        wins,
        top3,
        season_rank: seasonRank,
        accuracy_pct: accuracyPct,
        best_streak: maxStreak,
        total_answers: totalAnswers,
        correct_answers: correctAnswers,
        badges,
        recent_games: recentGames
      }
    });
  } catch (err) {
    console.error('[API GET /api/members/:code error]', err);
    res.status(500).json({ error: 'Failed to retrieve member profile.' });
  }
});

// GET /api/leaderboard - Season leaderboard with optional ?quiz= filter
app.get('/api/leaderboard', (req, res) => {
  try {
    const { quiz } = req.query;
    let filterClause = '';
    const params = [];
    if (quiz && quiz !== 'all') {
      filterClause = 'AND s.quiz_id = ?';
      params.push(Number(quiz));
    }

    const membersList = db.prepare(`
      SELECT 
        m.id,
        m.member_code,
        m.name,
        m.branch,
        m.year,
        m.bio,
        COALESCE(SUM(sp.final_score), 0) AS season_points,
        COUNT(DISTINCT sp.session_id) AS quizzes_played,
        COALESCE(SUM(CASE WHEN sp.final_rank = 1 THEN 1 ELSE 0 END), 0) AS wins
      FROM members m
      LEFT JOIN session_players sp ON m.id = sp.member_id
      LEFT JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL ${filterClause}
      GROUP BY m.id
      ORDER BY season_points DESC, wins DESC, m.name ASC
    `).all(...params);

    const leaderboard = membersList.map((m, index) => {
      // Accuracy stats for this member
      const accRow = db.prepare(`
        SELECT 
          COUNT(*) AS total_answers,
          COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers
        FROM answers a
        JOIN session_players sp ON a.player_id = sp.id
        JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL ${filterClause}
        WHERE sp.member_id = ?
      `).get(...(filterClause ? [Number(quiz), m.id] : [m.id]));

      const totalAns = accRow ? (accRow.total_answers || 0) : 0;
      const correctAns = accRow ? (accRow.correct_answers || 0) : 0;
      const accuracy = totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 0;

      // Best streak in a single session
      const ansRows = db.prepare(`
        SELECT a.session_id, a.is_correct
        FROM answers a
        JOIN session_players sp ON a.player_id = sp.id
        JOIN sessions s ON sp.session_id = s.id AND s.ended_at IS NOT NULL ${filterClause}
        WHERE sp.member_id = ?
        ORDER BY a.session_id ASC, a.id ASC
      `).all(...(filterClause ? [Number(quiz), m.id] : [m.id]));

      let maxStreak = 0;
      let curStreak = 0;
      let lastSess = null;
      for (const row of ansRows) {
        if (row.session_id !== lastSess) {
          lastSess = row.session_id;
          curStreak = 0;
        }
        if (row.is_correct === 1) {
          curStreak++;
          if (curStreak > maxStreak) maxStreak = curStreak;
        } else {
          curStreak = 0;
        }
      }

      return {
        rank: index + 1,
        id: m.id,
        member_code: m.member_code,
        name: m.name,
        branch: m.branch,
        year: m.year,
        bio: m.bio,
        points: m.season_points,
        quizzes_played: m.quizzes_played,
        wins: m.wins,
        best_streak: maxStreak,
        accuracy_pct: accuracy
      };
    });

    const quizzes = db.prepare('SELECT id, title FROM quizzes ORDER BY id ASC').all();

    res.json({
      success: true,
      leaderboard,
      quizzes
    });
  } catch (err) {
    console.error('[API /api/leaderboard error]', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
  }
});

/* ==========================================================================
   Socket.IO Live Arena Real-Time Game Engine
   ========================================================================== */

function getLobbyPlayers(room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    score: p.score,
    is_member: Boolean(p.member_id)
  }));
}

function getAnsweredCount(room) {
  let count = 0;
  for (const p of room.players.values()) {
    if (p.pendingAnswer && p.pendingAnswer.qIndex === room.currentQuestionIndex) {
      count++;
    }
  }
  return count;
}

function getConnectedPlayersCount(room) {
  let count = 0;
  for (const p of room.players.values()) {
    if (p.connected) count++;
  }
  return count;
}

function startQuestion(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.status = 'question';
  const q = room.questions[room.currentQuestionIndex];
  room.questionStartTime = Date.now();
  room.timeRemainingSec = q.time_limit_sec;

  // Clear pending answers for this question
  for (const p of room.players.values()) {
    p.pendingAnswer = null;
  }

  // Host question payload
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit('host:question_start', {
      question_index: room.currentQuestionIndex,
      total_questions: room.questions.length,
      question: {
        id: q.id,
        text: q.text,
        options: q.options,
        time_limit_sec: q.time_limit_sec,
        points: q.points
      },
      answered_count: 0,
      total_players: getConnectedPlayersCount(room)
    });
  }

  // Player question payload (WITHOUT correct_index to prevent cheating)
  io.to(room.roomCode).emit('question:start', {
    question_index: room.currentQuestionIndex,
    total_questions: room.questions.length,
    question: {
      text: q.text,
      options: q.options,
      time_limit_sec: q.time_limit_sec,
      points: q.points
    }
  });

  // Countdown timer interval
  room.timerInterval = setInterval(() => {
    room.timeRemainingSec--;
    io.to(room.roomCode).emit('question:tick', {
      time_remaining: Math.max(0, room.timeRemainingSec)
    });

    if (room.timeRemainingSec <= 0) {
      endQuestion(room);
    }
  }, 1000);
}

function endQuestion(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  if (room.status !== 'question') return;
  room.status = 'results';

  const q = room.questions[room.currentQuestionIndex];
  const dist = [0, 0, 0, 0];

  // Calculate scores and streak bonuses on server
  for (const p of room.players.values()) {
    const pa = p.pendingAnswer;
    if (pa && pa.qIndex === room.currentQuestionIndex) {
      const chosen = pa.chosen_index;
      if (chosen >= 0 && chosen <= 3) dist[chosen]++;

      const isCorrect = (chosen === q.correct_index) ? 1 : 0;
      let pointsAwarded = 0;

      if (isCorrect) {
        const limitMs = q.time_limit_sec * 1000;
        const speedFraction = Math.max(0, 1 - (pa.time_ms / limitMs));
        const basePts = Math.round(q.points * (0.5 + 0.5 * speedFraction));
        const streakBonusPct = Math.min(0.50, p.streak * 0.10);
        pointsAwarded = Math.round(basePts * (1 + streakBonusPct));
        p.streak++;
      } else {
        p.streak = 0;
      }

      p.score += pointsAwarded;
      p.answers.set(room.currentQuestionIndex, {
        chosen_index: chosen,
        is_correct: isCorrect,
        time_ms: pa.time_ms,
        points_awarded: pointsAwarded
      });
    } else {
      // Player did not answer in time
      p.streak = 0;
      p.answers.set(room.currentQuestionIndex, {
        chosen_index: null,
        is_correct: 0,
        time_ms: q.time_limit_sec * 1000,
        points_awarded: 0
      });
    }
  }

  // Compute live ranks
  const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  sorted.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  const top5 = sorted.slice(0, 5).map(p => {
    const lastAns = p.answers.get(room.currentQuestionIndex) || {};
    return {
      id: p.id,
      name: p.name,
      score: p.score,
      rank: p.rank,
      streak: p.streak,
      points_awarded: lastAns.points_awarded || 0,
      is_correct: lastAns.is_correct || 0
    };
  });

  const isLastQuestion = (room.currentQuestionIndex === room.questions.length - 1);

  // Send results to host
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit('host:question_results', {
      question_index: room.currentQuestionIndex,
      total_questions: room.questions.length,
      correct_index: q.correct_index,
      answer_distribution: dist,
      leaderboard: top5,
      is_last_question: isLastQuestion
    });
  }

  // Send personalized results to each player socket
  for (const p of room.players.values()) {
    if (p.socketId) {
      const lastAns = p.answers.get(room.currentQuestionIndex) || {};
      io.to(p.socketId).emit('player:question_results', {
        question_index: room.currentQuestionIndex,
        total_questions: room.questions.length,
        correct_index: q.correct_index,
        chosen_index: lastAns.chosen_index,
        is_correct: lastAns.is_correct === 1,
        points_awarded: lastAns.points_awarded || 0,
        streak: p.streak,
        total_score: p.score,
        current_rank: p.rank,
        total_players: room.players.size,
        is_last_question: isLastQuestion
      });
    }
  }
}

function endGame(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  room.status = 'ended';

  const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  sorted.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  // Persist session, players, and answers to SQLite database
  try {
    const updateSession = db.prepare('UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?');
    const insertPlayer = db.prepare('INSERT INTO session_players (session_id, name, final_score, final_rank, member_id) VALUES (?, ?, ?, ?, ?)');
    const insertAnswer = db.prepare(`
      INSERT INTO answers (session_id, question_id, player_id, chosen_index, is_correct, time_ms, points_awarded)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const saveTx = db.transaction(() => {
      updateSession.run(room.sessionId);

      for (const p of sorted) {
        const pRes = insertPlayer.run(room.sessionId, p.name, p.score, p.rank, p.member_id || null);
        const dbPlayerId = pRes.lastInsertRowid;

        for (let qIdx = 0; qIdx < room.questions.length; qIdx++) {
          const ans = p.answers.get(qIdx);
          const qId = room.questions[qIdx].id;
          if (ans) {
            insertAnswer.run(
              room.sessionId,
              qId,
              dbPlayerId,
              ans.chosen_index,
              ans.is_correct,
              ans.time_ms,
              ans.points_awarded
            );
          }
        }
      }
    });

    saveTx();
    console.log(`[Arena] Session ${room.sessionId} (${room.roomCode}) successfully ended and saved to DB.`);
  } catch (err) {
    console.error('[Arena DB Save error]', err);
  }

  const podium = sorted.slice(0, 3).map(p => ({
    name: p.name,
    score: p.score,
    rank: p.rank
  }));

  const fullRankings = sorted.map(p => ({
    name: p.name,
    score: p.score,
    rank: p.rank
  }));

  // Broadcast to host
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit('host:game_over', {
      podium,
      full_rankings: fullRankings
    });
  }

  // Broadcast to players
  for (const p of room.players.values()) {
    if (p.socketId) {
      let correctCount = 0;
      for (const a of p.answers.values()) {
        if (a.is_correct === 1) correctCount++;
      }
      io.to(p.socketId).emit('player:game_over', {
        rank: p.rank,
        final_score: p.score,
        total_players: room.players.size,
        correct_count: correctCount,
        total_questions: room.questions.length,
        podium
      });
    }
  }
}

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Host: Attach to existing room session
  socket.on('host:attach', ({ room_code, token }) => {
    const cleanCode = String(room_code || '').trim().toUpperCase();
    const room = activeRooms.get(cleanCode);

    if (!room) {
      return socket.emit('host:error', { message: 'Arena room not found or session has expired.' });
    }

    if (!token || !adminTokens.has(token)) {
      return socket.emit('host:error', { message: 'Unauthorized host token.' });
    }

    room.hostSocketId = socket.id;
    socket.join(cleanCode);

    socket.emit('host:room_state', {
      room_code: room.roomCode,
      quiz_title: room.quizTitle,
      status: room.status,
      question_count: room.questions.length,
      current_question_index: room.currentQuestionIndex,
      players: getLobbyPlayers(room)
    });
  });

  // Host: Start the quiz
  socket.on('host:start_game', ({ room_code }) => {
    const cleanCode = String(room_code || '').trim().toUpperCase();
    const room = activeRooms.get(cleanCode);
    if (!room) return;

    if (room.players.size < 1) {
      return socket.emit('host:error', { message: 'Cannot start game without players.' });
    }

    room.currentQuestionIndex = 0;
    startQuestion(room);
  });

  // Host: Advance to next question or final results
  socket.on('host:next_question', ({ room_code }) => {
    const cleanCode = String(room_code || '').trim().toUpperCase();
    const room = activeRooms.get(cleanCode);
    if (!room) return;

    if (room.currentQuestionIndex < room.questions.length - 1) {
      room.currentQuestionIndex++;
      startQuestion(room);
    } else {
      endGame(room);
    }
  });

  // Player: Join room
  socket.on('player:join', ({ room_code, name, player_id, member_token, member_id }) => {
    const cleanCode = String(room_code || '').trim().toUpperCase();
    const room = activeRooms.get(cleanCode);

    if (!room) {
      return socket.emit('join:error', { message: 'Room code not found. Please verify the code.' });
    }

    if (room.status === 'ended') {
      return socket.emit('join:error', { message: 'This quiz battle has already concluded.' });
    }

    // Resolve member if logged in
    let resolvedMemberId = null;
    let resolvedMemberName = '';

    if (member_token && memberTokens.has(member_token)) {
      const sess = memberTokens.get(member_token);
      resolvedMemberId = sess.memberId;
      resolvedMemberName = sess.name.slice(0, 20);
    } else if (member_id) {
      const mem = db.prepare('SELECT id, name FROM members WHERE id = ?').get(member_id);
      if (mem) {
        resolvedMemberId = mem.id;
        resolvedMemberName = mem.name.slice(0, 20);
      }
    }

    const cleanName = (resolvedMemberName || String(name || '').trim()).slice(0, 20);
    if (!cleanName) {
      return socket.emit('join:error', { message: 'Please enter a valid display name (max 20 chars).' });
    }

    // Check duplicate name in room (case-insensitive) unless it's a reconnection
    let existingPlayerWithSameName = null;
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === cleanName.toLowerCase()) {
        existingPlayerWithSameName = p;
        break;
      }
    }

    if (existingPlayerWithSameName && existingPlayerWithSameName.id !== player_id) {
      return socket.emit('join:error', { message: `"${cleanName}" is already taken in this room. Please choose another.` });
    }

    let pId = player_id;
    let player;

    if (pId && room.players.has(pId)) {
      // Player reconnecting
      player = room.players.get(pId);
      player.socketId = socket.id;
      player.name = cleanName;
      player.connected = true;
      if (resolvedMemberId) {
        player.member_id = resolvedMemberId;
        player.is_member = true;
      }
    } else {
      // New Player
      pId = 'p_' + crypto.randomBytes(4).toString('hex');
      player = {
        id: pId,
        socketId: socket.id,
        name: cleanName,
        score: 0,
        streak: 0,
        rank: room.players.size + 1,
        answers: new Map(),
        pendingAnswer: null,
        connected: true,
        member_id: resolvedMemberId,
        is_member: Boolean(resolvedMemberId)
      };
      room.players.set(pId, player);
    }

    socket.join(cleanCode);

    socket.emit('player:joined', {
      success: true,
      player_id: player.id,
      player_name: player.name,
      room_code: room.roomCode,
      quiz_title: room.quizTitle,
      status: room.status,
      score: player.score,
      streak: player.streak,
      member_id: player.member_id,
      is_member: Boolean(player.member_id)
    });

    // Notify room of updated lobby roster
    io.to(cleanCode).emit('room:player_list_update', {
      players: getLobbyPlayers(room),
      total_players: room.players.size
    });

    if (room.hostSocketId) {
      io.to(room.hostSocketId).emit('host:player_joined', {
        player: { id: player.id, name: player.name, is_member: Boolean(player.member_id) },
        total_players: room.players.size
      });
    }
  });

  // Player: Reconnect mid-game
  socket.on('player:reconnect', ({ room_code, player_id }) => {
    const cleanCode = String(room_code || '').trim().toUpperCase();
    const room = activeRooms.get(cleanCode);
    if (!room || !player_id || !room.players.has(player_id)) {
      return socket.emit('player:reconnect_failed', { message: 'Session expired or not found.' });
    }

    const player = room.players.get(player_id);
    player.socketId = socket.id;
    player.connected = true;
    socket.join(cleanCode);

    const q = (room.status === 'question' || room.status === 'results') ? room.questions[room.currentQuestionIndex] : null;
    const ans = player.answers.get(room.currentQuestionIndex);
    const hasAnswered = Boolean(player.pendingAnswer || ans);

    socket.emit('player:reconnected', {
      success: true,
      player_id: player.id,
      player_name: player.name,
      room_code: room.roomCode,
      quiz_title: room.quizTitle,
      status: room.status,
      score: player.score,
      streak: player.streak,
      rank: player.rank,
      question_index: room.currentQuestionIndex,
      total_questions: room.questions.length,
      has_answered: hasAnswered,
      chosen_index: (player.pendingAnswer ? player.pendingAnswer.chosen_index : (ans ? ans.chosen_index : null)),
      time_remaining: room.timeRemainingSec,
      question: q ? {
        text: q.text,
        options: q.options,
        time_limit_sec: q.time_limit_sec,
        points: q.points
      } : null,
      result: (room.status === 'results' && ans) ? {
        correct_index: q.correct_index,
        chosen_index: ans.chosen_index,
        is_correct: ans.is_correct === 1,
        points_awarded: ans.points_awarded,
        streak: player.streak,
        total_score: player.score,
        current_rank: player.rank,
        is_last_question: (room.currentQuestionIndex === room.questions.length - 1)
      } : null
    });
  });

  // Player: Submit question answer
  socket.on('player:answer', ({ room_code, player_id, chosen_index }) => {
    const cleanCode = String(room_code || '').trim().toUpperCase();
    const room = activeRooms.get(cleanCode);
    if (!room || room.status !== 'question') return;

    const player = room.players.get(player_id);
    if (!player) return;

    // Reject if already answered
    if (player.pendingAnswer && player.pendingAnswer.qIndex === room.currentQuestionIndex) {
      return;
    }

    const q = room.questions[room.currentQuestionIndex];
    const timeElapsedMs = Math.min(Date.now() - room.questionStartTime, q.time_limit_sec * 1000);

    player.pendingAnswer = {
      qIndex: room.currentQuestionIndex,
      chosen_index: Number(chosen_index),
      time_ms: timeElapsedMs
    };

    socket.emit('answer:acknowledged', {
      chosen_index: Number(chosen_index)
    });

    const answeredCount = getAnsweredCount(room);
    const connectedCount = getConnectedPlayersCount(room);

    if (room.hostSocketId) {
      io.to(room.hostSocketId).emit('host:answer_count_update', {
        answered_count: answeredCount,
        total_players: connectedCount
      });
    }

    // If all connected players have answered, trigger results early!
    if (connectedCount > 0 && answeredCount >= connectedCount) {
      endQuestion(room);
    }
  });

  // Socket Disconnect
  socket.on('disconnect', () => {
    // Check if socket was host
    for (const room of activeRooms.values()) {
      if (room.hostSocketId === socket.id) {
        room.hostSocketId = null;
        io.to(room.roomCode).emit('room:host_disconnected', {
          message: 'The quiz host temporarily disconnected. Stand by...'
        });
      }

      // Check if socket was player
      for (const player of room.players.values()) {
        if (player.socketId === socket.id) {
          player.connected = false;
          io.to(room.roomCode).emit('room:player_list_update', {
            players: getLobbyPlayers(room),
            total_players: room.players.size
          });
          break;
        }
      }
    }
  });
});


server.listen(PORT, () => {
  console.log(`MathVerse server listening at http://localhost:${PORT}`);
});
