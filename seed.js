/**
 * ============================================================================
 * MathVerse — Comprehensive Demo Data Seed Script (seed.js)
 * ============================================================================
 * Populates realistic, rich test data for judges & presentations:
 * - 12 Demo Club Members (all with password from DEMO_PASSWORD or 'demo1234')
 * - 6 Events (3 Past, 3 Upcoming) with realistic registrations & check-ins
 * - 4 Completed Live Quiz Arena Sessions with podium rankings & answers
 * - Verifiable Certificates for event attendees & tournament podium champions
 * - 15 In-depth Event Feedback submissions with varied star ratings
 *
 * Runs automatically on startup ONLY when:
 *   process.env.SEED_DEMO === 'true' AND members table has 0 records.
 * Can also be run manually:
 *   npm run seed
 * ============================================================================
 */

require('dotenv').config();
const crypto = require('crypto');
const db = require('./db');

// Helper: Secure password hashing matching server.js
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

async function seedDatabase(force = false) {
  console.log('\n🌌 [MathVerse Seeder] Starting database seeding process...');

  if (typeof db.ensureFreshEvents === 'function') {
    db.ensureFreshEvents(db);
  }

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
  if (!force && memberCount > 0) {
    console.log(`ℹ️ [MathVerse Seeder] Database already contains ${memberCount} members. Skipping seed.`);
    return;
  }

  const demoPassword = process.env.DEMO_PASSWORD || 'demo1234';
  const hashedPassword = hashPassword(demoPassword);

  console.log(`🔑 Using shared demo password: "${demoPassword}" for all demo member profiles.`);

  // --------------------------------------------------------------------------
  // 1. Seed Demo Members (12 realistic fake undergraduate & graduate math minds)
  // --------------------------------------------------------------------------
  const demoMembers = [
    {
      code: 'MV-M-0001',
      name: 'Devin V. Patel',
      email: 'devin.patel@demo.mathverse.org',
      branch: 'Mathematics & Computing',
      year: 'Senior (4th Year)',
      bio: 'Obsessed with algebraic topology, analytic number theory, and speed problem solving. President of the Ramanujan Circle.'
    },
    {
      code: 'MV-M-0002',
      name: 'Elena Rostova',
      email: 'elena.rostova@demo.mathverse.org',
      branch: 'Data Science & AI',
      year: 'Junior (3rd Year)',
      bio: 'Calculus enthusiast, Fourier transform coder, and live arena champion. Always hunting for optimal solutions.'
    },
    {
      code: 'MV-M-0003',
      name: 'Marcus Aurelius Chen',
      email: 'marcus.chen@demo.mathverse.org',
      branch: 'Computer Science',
      year: 'Senior (4th Year)',
      bio: 'Algorithmic combinatorics, Ramsey numbers, and competitive programming nerd. Speed integration finalist.'
    },
    {
      code: 'MV-M-0004',
      name: 'Siddharth N. Menon',
      email: 'siddharth.menon@demo.mathverse.org',
      branch: 'Mathematics',
      year: 'Junior (3rd Year)',
      bio: 'Researching elliptic curves and modular arithmetic. Co-organizer of the annual Pi Day Carnival recitation.'
    },
    {
      code: 'MV-M-0005',
      name: 'Zoe K. Vance',
      email: 'zoe.vance@demo.mathverse.org',
      branch: 'Physics',
      year: 'Sophomore (2nd Year)',
      bio: 'Differential geometry and tensor calculus explorer. Modeling non-linear dynamical orbital mechanics.'
    },
    {
      code: 'MV-M-0006',
      name: 'Tariq Al-Mansoor',
      email: 'tariq.mansoor@demo.mathverse.org',
      branch: 'Electrical Engineering',
      year: 'Senior (4th Year)',
      bio: 'Fast Fourier Transform specialist and cryptographic security challenge competitor.'
    },
    {
      code: 'MV-M-0007',
      name: 'Aria M. Sterling',
      email: 'aria.sterling@demo.mathverse.org',
      branch: 'Mathematics',
      year: 'Sophomore (2nd Year)',
      bio: 'Complex analysis and fractal dimensions enthusiast. Passionate about procedural mathematical visual art.'
    },
    {
      code: 'MV-M-0008',
      name: 'Liam J. O\'Connor',
      email: 'liam.oconnor@demo.mathverse.org',
      branch: 'Mathematics & Computing',
      year: 'Freshman (1st Year)',
      bio: 'Freshman speed integration challenger, graph theory aficionado, and live arena regular.'
    },
    {
      code: 'MV-M-0009',
      name: 'Mei-Ling Zhou',
      email: 'meiling.zhou@demo.mathverse.org',
      branch: 'Data Science & AI',
      year: 'Junior (3rd Year)',
      bio: 'High-dimensional probability, Markov chains, and topological data analysis enthusiast.'
    },
    {
      code: 'MV-M-0010',
      name: 'Carlos E. Mendoza',
      email: 'carlos.mendoza@demo.mathverse.org',
      branch: 'Computer Science',
      year: 'Sophomore (2nd Year)',
      bio: 'Computational algebra, group theory, and cryptography fanatic. Building interactive geometric shaders.'
    },
    {
      code: 'MV-M-0011',
      name: 'Ananya R. Iyer',
      email: 'ananya.iyer@demo.mathverse.org',
      branch: 'Mathematics',
      year: 'Senior (4th Year)',
      bio: 'Abstract algebra, Galois theory, and category theory researcher. Club peer tutor for undergraduate calculus.'
    },
    {
      code: 'MV-M-0012',
      name: 'Noah B. Thorne',
      email: 'noah.thorne@demo.mathverse.org',
      branch: 'Physics',
      year: 'Junior (3rd Year)',
      bio: 'Mathematical modelling of quantum states and fluid flow dynamics. Regular attendee at club colloquiums.'
    }
  ];

  const insertMember = db.prepare(`
    INSERT OR REPLACE INTO members (id, member_code, name, email, password_hash, branch, year, bio, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const memberIds = {};
  demoMembers.forEach((m, idx) => {
    const id = idx + 1;
    const joinedAt = new Date(Date.now() - (90 - idx * 5) * 86400000).toISOString();
    insertMember.run(id, m.code, m.name, m.email, hashedPassword, m.branch, m.year, m.bio, joinedAt);
    memberIds[m.code] = id;
  });

  console.log(`✓ Seeded ${demoMembers.length} demo members (MV-M-0001 to MV-M-0012).`);

  // --------------------------------------------------------------------------
  // 2. Ensure Quizzes Exist
  // --------------------------------------------------------------------------
  const quizCount = db.prepare('SELECT COUNT(*) as count FROM quizzes').get().count;
  if (quizCount < 2) {
    const insertQuiz = db.prepare('INSERT OR IGNORE INTO quizzes (id, title, created_at) VALUES (?, ?, ?)');
    insertQuiz.run(1, 'Euler Warm-Up', '2026-02-01 10:00:00');
    insertQuiz.run(2, 'Calculus & Integrals Sprint', '2026-02-15 11:30:00');

    // Questions for Quiz 2 if not present
    const q2Count = db.prepare('SELECT COUNT(*) as count FROM questions WHERE quiz_id = 2').get().count;
    if (q2Count === 0) {
      const q2Insert = db.prepare(`
        INSERT INTO questions (quiz_id, text, options, correct_index, time_limit_sec, points)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      q2Insert.run(2, "What is the value of $\\int_{0}^{1} x^3 \\, dx$?", JSON.stringify(["1/4", "1/3", "1/2", "1"]), 0, 20, 1000);
      q2Insert.run(2, "Evaluate the derivative $\\frac{d}{dx}[\\ln(x^2 + 1)]$ at $x = 1$:", JSON.stringify(["0", "1/2", "1", "2"]), 2, 20, 1000);
      q2Insert.run(2, "What is $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$?", JSON.stringify(["0", "1", "3", "Does not exist"]), 2, 15, 1000);
      q2Insert.run(2, "Evaluate the definite integral $\\int_{-\\pi}^{\\pi} \\sin(x) \\, dx$:", JSON.stringify(["0", "2", "\\pi", "2\\pi"]), 0, 15, 1000);
      q2Insert.run(2, "What is the second derivative $f''(x)$ of $f(x) = e^{2x}$?", JSON.stringify(["2e^{2x}", "4e^{2x}", "e^{2x}", "8e^{2x}"]), 1, 20, 1000);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Seed Realistic Event Registrations (Past & Upcoming)
  // --------------------------------------------------------------------------
  const getRelDate = (days, hours = 10, minutes = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };
  const fmtSql = (d) => {
    const Y = d.getFullYear(), M = String(d.getMonth() + 1).padStart(2, '0'), D = String(d.getDate()).padStart(2, '0');
    const H = String(d.getHours()).padStart(2, '0'), min = String(d.getMinutes()).padStart(2, '0'), S = String(d.getSeconds()).padStart(2, '0');
    return `${Y}-${M}-${D} ${H}:${min}:${S}`;
  };

  const insertReg = db.prepare(`
    INSERT OR REPLACE INTO registrations (id, ticket_code, event_id, name, email, phone, enrollment_no, branch, year, created_at, checked_in, checked_in_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Event Registrations data set
  const registrationsData = [
    // Past Event 4: Mathematical Modelling Workshop (-20 days) — All checked in
    { id: 101, code: 'MV-2026-F1A2B3', event_id: 'event-4', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', phone: '+1 555-0101', enroll: 'EN-2023-101', branch: 'Mathematics & Computing', year: 'Senior (4th Year)', checked_in: 1, created: fmtSql(getRelDate(-25, 10, 15)), checkin_at: fmtSql(getRelDate(-20, 13, 45)) },
    { id: 102, code: 'MV-2026-F2C3D4', event_id: 'event-4', name: 'Elena Rostova', email: 'elena.rostova@demo.mathverse.org', phone: '+1 555-0102', enroll: 'EN-2024-202', branch: 'Data Science & AI', year: 'Junior (3rd Year)', checked_in: 1, created: fmtSql(getRelDate(-24, 11, 30)), checkin_at: fmtSql(getRelDate(-20, 13, 50)) },
    { id: 103, code: 'MV-2026-F3E4F5', event_id: 'event-4', name: 'Marcus Aurelius Chen', email: 'marcus.chen@demo.mathverse.org', phone: '+1 555-0103', enroll: 'EN-2023-303', branch: 'Computer Science', year: 'Senior (4th Year)', checked_in: 1, created: fmtSql(getRelDate(-23, 14, 20)), checkin_at: fmtSql(getRelDate(-20, 13, 52)) },
    { id: 104, code: 'MV-2026-F4G5H6', event_id: 'event-4', name: 'Noah B. Thorne', email: 'noah.thorne@demo.mathverse.org', phone: '+1 555-0104', enroll: 'EN-2024-404', branch: 'Physics', year: 'Junior (3rd Year)', checked_in: 1, created: fmtSql(getRelDate(-22, 9, 10)), checkin_at: fmtSql(getRelDate(-20, 13, 58)) },

    // Past Event 5: Pi Day Carnival 2026 (-45 days) — Checked in
    { id: 105, code: 'MV-2026-P1J2K3', event_id: 'event-5', name: 'Siddharth N. Menon', email: 'siddharth.menon@demo.mathverse.org', phone: '+1 555-0105', enroll: 'EN-2024-505', branch: 'Mathematics', year: 'Junior (3rd Year)', checked_in: 1, created: fmtSql(getRelDate(-50, 12, 0)), checkin_at: fmtSql(getRelDate(-45, 13, 30)) },
    { id: 106, code: 'MV-2026-P2L3M4', event_id: 'event-5', name: 'Aria M. Sterling', email: 'aria.sterling@demo.mathverse.org', phone: '+1 555-0106', enroll: 'EN-2025-606', branch: 'Mathematics', year: 'Sophomore (2nd Year)', checked_in: 1, created: fmtSql(getRelDate(-49, 16, 45)), checkin_at: fmtSql(getRelDate(-45, 13, 35)) },
    { id: 107, code: 'MV-2026-P3N4P5', event_id: 'event-5', name: 'Zoe K. Vance', email: 'zoe.vance@demo.mathverse.org', phone: '+1 555-0107', enroll: 'EN-2025-707', branch: 'Physics', year: 'Sophomore (2nd Year)', checked_in: 1, created: fmtSql(getRelDate(-48, 18, 20)), checkin_at: fmtSql(getRelDate(-45, 13, 40)) },
    { id: 108, code: 'MV-2026-P4Q5R6', event_id: 'event-5', name: 'Liam J. O\'Connor', email: 'liam.oconnor@demo.mathverse.org', phone: '+1 555-0108', enroll: 'EN-2026-808', branch: 'Mathematics & Computing', year: 'Freshman (1st Year)', checked_in: 1, created: fmtSql(getRelDate(-47, 10, 15)), checkin_at: fmtSql(getRelDate(-45, 13, 42)) },

    // Past Event 6: Cipher Hunt & Cryptography Night (-80 days) — Checked in
    { id: 109, code: 'MV-2026-C1S2T3', event_id: 'event-6', name: 'Tariq Al-Mansoor', email: 'tariq.mansoor@demo.mathverse.org', phone: '+1 555-0109', enroll: 'EN-2023-909', branch: 'Electrical Engineering', year: 'Senior (4th Year)', checked_in: 1, created: fmtSql(getRelDate(-90, 14, 0)), checkin_at: fmtSql(getRelDate(-80, 17, 45)) },
    { id: 110, code: 'MV-2026-C2U3V4', event_id: 'event-6', name: 'Carlos E. Mendoza', email: 'carlos.mendoza@demo.mathverse.org', phone: '+1 555-0110', enroll: 'EN-2025-010', branch: 'Computer Science', year: 'Sophomore (2nd Year)', checked_in: 1, created: fmtSql(getRelDate(-89, 11, 20)), checkin_at: fmtSql(getRelDate(-80, 17, 50)) },
    { id: 111, code: 'MV-2026-C3W4X5', event_id: 'event-6', name: 'Mei-Ling Zhou', email: 'meiling.zhou@demo.mathverse.org', phone: '+1 555-0111', enroll: 'EN-2024-011', branch: 'Data Science & AI', year: 'Junior (3rd Year)', checked_in: 1, created: fmtSql(getRelDate(-88, 15, 30)), checkin_at: fmtSql(getRelDate(-80, 17, 55)) },
    { id: 112, code: 'MV-2026-C4Y5Z6', event_id: 'event-6', name: 'Ananya R. Iyer', email: 'ananya.iyer@demo.mathverse.org', phone: '+1 555-0112', enroll: 'EN-2023-012', branch: 'Mathematics', year: 'Senior (4th Year)', checked_in: 1, created: fmtSql(getRelDate(-87, 9, 40)), checkin_at: fmtSql(getRelDate(-80, 17, 58)) },

    // Upcoming Event 1: Euler Quiz Night (+6 days) — Pending
    { id: 113, code: 'MV-2026-E1A2B3', event_id: 'event-1', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', phone: '+1 555-0101', enroll: 'EN-2023-101', branch: 'Mathematics & Computing', year: 'Senior (4th Year)', checked_in: 0, created: fmtSql(getRelDate(-2, 10, 0)), checkin_at: null },
    { id: 114, code: 'MV-2026-E2C3D4', event_id: 'event-1', name: 'Elena Rostova', email: 'elena.rostova@demo.mathverse.org', phone: '+1 555-0102', enroll: 'EN-2024-202', branch: 'Data Science & AI', year: 'Junior (3rd Year)', checked_in: 0, created: fmtSql(getRelDate(-2, 11, 30)), checkin_at: null },
    { id: 115, code: 'MV-2026-E3E4F5', event_id: 'event-1', name: 'Marcus Aurelius Chen', email: 'marcus.chen@demo.mathverse.org', phone: '+1 555-0103', enroll: 'EN-2023-303', branch: 'Computer Science', year: 'Senior (4th Year)', checked_in: 0, created: fmtSql(getRelDate(-1, 15, 40)), checkin_at: null },

    // Upcoming Event 2: Integration Bee (+13 days) — Pending
    { id: 116, code: 'MV-2026-I1G2H3', event_id: 'event-2', name: 'Siddharth N. Menon', email: 'siddharth.menon@demo.mathverse.org', phone: '+1 555-0105', enroll: 'EN-2024-505', branch: 'Mathematics', year: 'Junior (3rd Year)', checked_in: 0, created: fmtSql(getRelDate(-2, 14, 10)), checkin_at: null },
    { id: 117, code: 'MV-2026-I2J3K4', event_id: 'event-2', name: 'Liam J. O\'Connor', email: 'liam.oconnor@demo.mathverse.org', phone: '+1 555-0108', enroll: 'EN-2026-808', branch: 'Mathematics & Computing', year: 'Freshman (1st Year)', checked_in: 0, created: fmtSql(getRelDate(-1, 9, 30)), checkin_at: null },

    // Upcoming Event 3: Fibonacci Fest (+20 days) — Pending
    { id: 118, code: 'MV-2026-B1L2M3', event_id: 'event-3', name: 'Aria M. Sterling', email: 'aria.sterling@demo.mathverse.org', phone: '+1 555-0106', enroll: 'EN-2025-606', branch: 'Mathematics', year: 'Sophomore (2nd Year)', checked_in: 0, created: fmtSql(getRelDate(-1, 16, 0)), checkin_at: null }
  ];

  for (const reg of registrationsData) {
    insertReg.run(reg.id, reg.code, reg.event_id, reg.name, reg.email, reg.phone, reg.enroll, reg.branch, reg.year, reg.created, reg.checked_in, reg.checkin_at);
  }
  console.log(`✓ Seeded ${registrationsData.length} registrations across 3 past and 3 upcoming events.`);

  // --------------------------------------------------------------------------
  // 4. Seed 4 Completed Live Quiz Sessions with Real Player Telemetry & Answers
  // --------------------------------------------------------------------------
  const insertSession = db.prepare(`
    INSERT OR REPLACE INTO sessions (id, quiz_id, room_code, event_id, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPlayer = db.prepare(`
    INSERT OR REPLACE INTO session_players (id, session_id, name, member_id, final_score, final_rank, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAnswer = db.prepare(`
    INSERT INTO answers (session_id, question_id, player_id, chosen_index, is_correct, time_ms, points_awarded)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Clear existing answers and session_players for these demo session IDs if replacing
  db.exec('DELETE FROM answers WHERE session_id IN (1, 2, 3, 4);');
  db.exec('DELETE FROM session_players WHERE session_id IN (1, 2, 3, 4);');

  // Session 1: Euler Warm-Up Championship
  insertSession.run(1, 1, 'EULER1', 'event-1', fmtSql(getRelDate(-60, 18, 0)), fmtSql(getRelDate(-60, 18, 22)));
  insertPlayer.run(1, 1, 'Devin V. Patel', memberIds['MV-M-0001'], 4890, 1, fmtSql(getRelDate(-60, 17, 58)));
  insertPlayer.run(2, 1, 'Elena Rostova', memberIds['MV-M-0002'], 4450, 2, fmtSql(getRelDate(-60, 17, 59)));
  insertPlayer.run(3, 1, 'Marcus Aurelius Chen', memberIds['MV-M-0003'], 3980, 3, fmtSql(getRelDate(-60, 17, 59)));
  insertPlayer.run(4, 1, 'Siddharth N. Menon', memberIds['MV-M-0004'], 3200, 4, fmtSql(getRelDate(-60, 18, 0)));
  insertPlayer.run(5, 1, 'Zoe K. Vance', memberIds['MV-M-0005'], 2850, 5, fmtSql(getRelDate(-60, 18, 0)));

  // Answers for Session 1 (Devin: 5 streak; Elena: 5 streak)
  for (let q = 1; q <= 5; q++) {
    insertAnswer.run(1, q, 1, 0, 1, 1400 + q * 100, 980 - q * 10);
    insertAnswer.run(1, q, 2, 0, 1, 1800 + q * 120, 890 - q * 10);
    insertAnswer.run(1, q, 3, 0, q === 4 ? 0 : 1, 2100, q === 4 ? 0 : 800);
    insertAnswer.run(1, q, 4, 0, q === 2 ? 0 : 1, 2500, q === 2 ? 0 : 700);
    insertAnswer.run(1, q, 5, 0, q > 3 ? 0 : 1, 3200, q > 3 ? 0 : 650);
  }

  // Session 2: Midnight Integral Sprint
  insertSession.run(2, 2, 'CALC02', 'event-2', fmtSql(getRelDate(-40, 19, 0)), fmtSql(getRelDate(-40, 19, 24)));
  insertPlayer.run(6, 2, 'Elena Rostova', memberIds['MV-M-0002'], 4940, 1, fmtSql(getRelDate(-40, 18, 57)));
  insertPlayer.run(7, 2, 'Devin V. Patel', memberIds['MV-M-0001'], 4620, 2, fmtSql(getRelDate(-40, 18, 58)));
  insertPlayer.run(8, 2, 'Tariq Al-Mansoor', memberIds['MV-M-0006'], 4120, 3, fmtSql(getRelDate(-40, 18, 58)));
  insertPlayer.run(9, 2, 'Liam J. O\'Connor', memberIds['MV-M-0008'], 3380, 4, fmtSql(getRelDate(-40, 18, 59)));
  insertPlayer.run(10, 2, 'Carlos E. Mendoza', memberIds['MV-M-0010'], 2950, 5, fmtSql(getRelDate(-40, 18, 59)));

  for (let q = 1; q <= 5; q++) {
    insertAnswer.run(2, q, 6, 0, 1, 1300 + q * 80, 990 - q * 8);
    insertAnswer.run(2, q, 7, 0, 1, 1500 + q * 90, 930 - q * 10);
    insertAnswer.run(2, q, 8, 0, q === 5 ? 0 : 1, 2000, q === 5 ? 0 : 850);
    insertAnswer.run(2, q, 9, 0, q === 3 ? 0 : 1, 2400, q === 3 ? 0 : 750);
    insertAnswer.run(2, q, 10, 0, q > 2 ? 0 : 1, 2900, q > 2 ? 0 : 680);
  }

  // Session 3: Euler Masters Round 2
  insertSession.run(3, 1, 'EULER3', 'event-1', fmtSql(getRelDate(-25, 20, 0)), fmtSql(getRelDate(-25, 20, 25)));
  insertPlayer.run(11, 3, 'Marcus Aurelius Chen', memberIds['MV-M-0003'], 4810, 1, fmtSql(getRelDate(-25, 19, 55)));
  insertPlayer.run(12, 3, 'Devin V. Patel', memberIds['MV-M-0001'], 4510, 2, fmtSql(getRelDate(-25, 19, 56)));
  insertPlayer.run(13, 3, 'Siddharth N. Menon', memberIds['MV-M-0004'], 4090, 3, fmtSql(getRelDate(-25, 19, 57)));
  insertPlayer.run(14, 3, 'Elena Rostova', memberIds['MV-M-0002'], 3870, 4, fmtSql(getRelDate(-25, 19, 57)));
  insertPlayer.run(15, 3, 'Ananya R. Iyer', memberIds['MV-M-0011'], 3150, 5, fmtSql(getRelDate(-25, 19, 58)));

  for (let q = 1; q <= 5; q++) {
    insertAnswer.run(3, q, 11, 0, 1, 1450, 970);
    insertAnswer.run(3, q, 12, 0, 1, 1600, 910);
    insertAnswer.run(3, q, 13, 0, 1, 1850, 830);
    insertAnswer.run(3, q, 14, 0, q === 2 ? 0 : 1, 1950, q === 2 ? 0 : 800);
    insertAnswer.run(3, q, 15, 0, q > 3 ? 0 : 1, 2800, q > 3 ? 0 : 700);
  }

  // Session 4: Grand Integration Grand Prix
  insertSession.run(4, 2, 'FINALS', 'event-2', fmtSql(getRelDate(-10, 17, 30)), fmtSql(getRelDate(-10, 17, 55)));
  insertPlayer.run(16, 4, 'Devin V. Patel', memberIds['MV-M-0001'], 4960, 1, fmtSql(getRelDate(-10, 17, 25)));
  insertPlayer.run(17, 4, 'Marcus Aurelius Chen', memberIds['MV-M-0003'], 4600, 2, fmtSql(getRelDate(-10, 17, 26)));
  insertPlayer.run(18, 4, 'Elena Rostova', memberIds['MV-M-0002'], 4250, 3, fmtSql(getRelDate(-10, 17, 26)));
  insertPlayer.run(19, 4, 'Aria M. Sterling', memberIds['MV-M-0007'], 3680, 4, fmtSql(getRelDate(-10, 17, 27)));
  insertPlayer.run(20, 4, 'Mei-Ling Zhou', memberIds['MV-M-0009'], 3050, 5, fmtSql(getRelDate(-10, 17, 27)));

  for (let q = 1; q <= 5; q++) {
    insertAnswer.run(4, q, 16, 0, 1, 1320, 995);
    insertAnswer.run(4, q, 17, 0, 1, 1580, 920);
    insertAnswer.run(4, q, 18, 0, 1, 1790, 850);
    insertAnswer.run(4, q, 19, 0, q === 4 ? 0 : 1, 2200, q === 4 ? 0 : 780);
    insertAnswer.run(4, q, 20, 0, q > 3 ? 0 : 1, 2900, q > 3 ? 0 : 690);
  }

  console.log('✓ Seeded 4 complete live quiz sessions with full player telemetry, streaks, and ranks.');

  // --------------------------------------------------------------------------
  // 5. Seed Official Certificates (Participation & Tournament Winners)
  // --------------------------------------------------------------------------
  const insertCert = db.prepare(`
    INSERT OR REPLACE INTO certificates (cert_code, recipient_name, recipient_email, event_id, session_id, type, issued_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const demoCerts = [
    // Session Winner Honors (Podium)
    { code: 'MV-CERT-WIN0001', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', event_id: 'event-1', session_id: 1, type: 'winner', date: fmtSql(getRelDate(-60, 18, 23)) },
    { code: 'MV-CERT-RUN0002', name: 'Elena Rostova', email: 'elena.rostova@demo.mathverse.org', event_id: 'event-1', session_id: 1, type: 'runner_up', date: fmtSql(getRelDate(-60, 18, 23)) },
    { code: 'MV-CERT-THD0003', name: 'Marcus Aurelius Chen', email: 'marcus.chen@demo.mathverse.org', event_id: 'event-1', session_id: 1, type: 'third_place', date: fmtSql(getRelDate(-60, 18, 23)) },

    { code: 'MV-CERT-WIN0004', name: 'Elena Rostova', email: 'elena.rostova@demo.mathverse.org', event_id: 'event-2', session_id: 2, type: 'winner', date: fmtSql(getRelDate(-40, 19, 25)) },
    { code: 'MV-CERT-RUN0005', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', event_id: 'event-2', session_id: 2, type: 'runner_up', date: fmtSql(getRelDate(-40, 19, 25)) },
    { code: 'MV-CERT-THD0006', name: 'Tariq Al-Mansoor', email: 'tariq.mansoor@demo.mathverse.org', event_id: 'event-2', session_id: 2, type: 'third_place', date: fmtSql(getRelDate(-40, 19, 25)) },

    { code: 'MV-CERT-WIN0007', name: 'Marcus Aurelius Chen', email: 'marcus.chen@demo.mathverse.org', event_id: 'event-1', session_id: 3, type: 'winner', date: fmtSql(getRelDate(-25, 20, 26)) },
    { code: 'MV-CERT-RUN0008', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', event_id: 'event-1', session_id: 3, type: 'runner_up', date: fmtSql(getRelDate(-25, 20, 26)) },
    { code: 'MV-CERT-THD0009', name: 'Siddharth N. Menon', email: 'siddharth.menon@demo.mathverse.org', event_id: 'event-1', session_id: 3, type: 'third_place', date: fmtSql(getRelDate(-25, 20, 26)) },

    { code: 'MV-CERT-WIN0010', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', event_id: 'event-2', session_id: 4, type: 'winner', date: fmtSql(getRelDate(-10, 17, 56)) },
    { code: 'MV-CERT-RUN0011', name: 'Marcus Aurelius Chen', email: 'marcus.chen@demo.mathverse.org', event_id: 'event-2', session_id: 4, type: 'runner_up', date: fmtSql(getRelDate(-10, 17, 56)) },
    { code: 'MV-CERT-THD0012', name: 'Elena Rostova', email: 'elena.rostova@demo.mathverse.org', event_id: 'event-2', session_id: 4, type: 'third_place', date: fmtSql(getRelDate(-10, 17, 56)) },

    // Event Participation Certificates for Past Checked-In Attendees
    { code: 'MV-CERT-PART001', name: 'Devin V. Patel', email: 'devin.patel@demo.mathverse.org', event_id: 'event-4', session_id: null, type: 'participation', date: fmtSql(getRelDate(-20, 18, 0)) },
    { code: 'MV-CERT-PART002', name: 'Elena Rostova', email: 'elena.rostova@demo.mathverse.org', event_id: 'event-4', session_id: null, type: 'participation', date: fmtSql(getRelDate(-20, 18, 0)) },
    { code: 'MV-CERT-PART003', name: 'Marcus Aurelius Chen', email: 'marcus.chen@demo.mathverse.org', event_id: 'event-4', session_id: null, type: 'participation', date: fmtSql(getRelDate(-20, 18, 0)) },
    { code: 'MV-CERT-PART004', name: 'Noah B. Thorne', email: 'noah.thorne@demo.mathverse.org', event_id: 'event-4', session_id: null, type: 'participation', date: fmtSql(getRelDate(-20, 18, 0)) },

    { code: 'MV-CERT-PART005', name: 'Siddharth N. Menon', email: 'siddharth.menon@demo.mathverse.org', event_id: 'event-5', session_id: null, type: 'participation', date: fmtSql(getRelDate(-45, 17, 30)) },
    { code: 'MV-CERT-PART006', name: 'Aria M. Sterling', email: 'aria.sterling@demo.mathverse.org', event_id: 'event-5', session_id: null, type: 'participation', date: fmtSql(getRelDate(-45, 17, 30)) },
    { code: 'MV-CERT-PART007', name: 'Zoe K. Vance', email: 'zoe.vance@demo.mathverse.org', event_id: 'event-5', session_id: null, type: 'participation', date: fmtSql(getRelDate(-45, 17, 30)) },

    { code: 'MV-CERT-PART008', name: 'Tariq Al-Mansoor', email: 'tariq.mansoor@demo.mathverse.org', event_id: 'event-6', session_id: null, type: 'participation', date: fmtSql(getRelDate(-80, 23, 0)) },
    { code: 'MV-CERT-PART009', name: 'Carlos E. Mendoza', email: 'carlos.mendoza@demo.mathverse.org', event_id: 'event-6', session_id: null, type: 'participation', date: fmtSql(getRelDate(-80, 23, 0)) },
    { code: 'MV-CERT-PART010', name: 'Mei-Ling Zhou', email: 'meiling.zhou@demo.mathverse.org', event_id: 'event-6', session_id: null, type: 'participation', date: fmtSql(getRelDate(-80, 23, 0)) }
  ];

  for (const c of demoCerts) {
    insertCert.run(c.code, c.name, c.email, c.event_id, c.session_id, c.type, c.date);
  }
  console.log(`✓ Seeded ${demoCerts.length} verifiable certificates (championship podiums & participation).`);

  // --------------------------------------------------------------------------
  // 6. Seed 15 Realistic Attendee Feedback Entries
  // --------------------------------------------------------------------------
  const insertFb = db.prepare(`
    INSERT OR REPLACE INTO feedback (event_id, ticket_code, rating, liked, improve, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const demoFeedback = [
    {
      event_id: 'event-4',
      ticket: 'MV-2026-F1A2B3',
      rating: 5,
      liked: 'Translating epidemiological differential equations into animated Python graphs was brilliant.',
      improve: 'Would love a follow-up session on stochastic partial differential equations!',
      created: fmtSql(getRelDate(-20, 18, 30))
    },
    {
      event_id: 'event-4',
      ticket: 'MV-2026-F2C3D4',
      rating: 5,
      liked: 'Hands-on MATLAB notebooks were ready to run and the instructors were incredibly patient.',
      improve: 'More time allocated for group model debugging at the end.',
      created: fmtSql(getRelDate(-20, 19, 15))
    },
    {
      event_id: 'event-4',
      ticket: 'MV-2026-F3E4F5',
      rating: 4,
      liked: 'Deep theoretical grounding combined with practical simulation code.',
      improve: 'The Computer Lab projector had a slight glare from the hallway.',
      created: fmtSql(getRelDate(-20, 20, 0))
    },
    {
      event_id: 'event-4',
      ticket: 'MV-2026-F4G5H6',
      rating: 5,
      liked: 'Clear explanations of Markov chain convergence rates and Perron-Frobenius theorems.',
      improve: 'Provide printed equation reference sheets next time.',
      created: fmtSql(getRelDate(-19, 9, 30))
    },
    {
      event_id: 'event-5',
      ticket: 'MV-2026-P1J2K3',
      rating: 5,
      liked: 'The 100-digit Pi recitation showdown was electric! Loved the Monte Carlo dartboard estimation.',
      improve: 'Bigger sound system inside Seminar Hall 4.',
      created: fmtSql(getRelDate(-45, 17, 45))
    },
    {
      event_id: 'event-5',
      ticket: 'MV-2026-P2L3M4',
      rating: 5,
      liked: 'The modular origami fractal folding workshop was peaceful, rigorous, and artistic.',
      improve: 'Run out of blueberry pies a bit early — please order double next year!',
      created: fmtSql(getRelDate(-45, 18, 10))
    },
    {
      event_id: 'event-5',
      ticket: 'MV-2026-P3N4P5',
      rating: 4,
      liked: 'Great community atmosphere; welcoming to all majors from physics to arts.',
      improve: 'Clearer schedule of which competition starts at which booth.',
      created: fmtSql(getRelDate(-45, 18, 40))
    },
    {
      event_id: 'event-5',
      ticket: 'MV-2026-P4Q5R6',
      rating: 5,
      liked: 'Buffon\'s needle experiment actually estimated pi to 3.1415 across 500 drops!',
      improve: 'Keep the event going an hour longer!',
      created: fmtSql(getRelDate(-45, 19, 5))
    },
    {
      event_id: 'event-6',
      ticket: 'MV-2026-C1S2T3',
      rating: 5,
      liked: 'Cracking the multi-round RSA factorization challenges under timed pressure.',
      improve: 'A dedicated Discord channel for team hint hints would be awesome.',
      created: fmtSql(getRelDate(-80, 23, 15))
    },
    {
      event_id: 'event-6',
      ticket: 'MV-2026-C2U3V4',
      rating: 4,
      liked: 'The elliptic curve point addition puzzle was pure mathematical poetry.',
      improve: 'More intermediate-level warm-ups before jumping into 256-bit modulus attacks.',
      created: fmtSql(getRelDate(-80, 23, 45))
    },
    {
      event_id: 'event-6',
      ticket: 'MV-2026-C3W4X5',
      rating: 5,
      liked: 'Fantastic collaboration, great pizza, and thrilling live scoreboard swings.',
      improve: 'Provide power strips at each team station.',
      created: fmtSql(getRelDate(-79, 0, 10))
    },
    {
      event_id: 'event-6',
      ticket: 'MV-2026-C4Y5Z6',
      rating: 5,
      liked: 'The historical cipher decryption stages (Vigenere, Enigma rotor simulations) were fascinating.',
      improve: 'Schedule it on a Saturday so teams can hack longer.',
      created: fmtSql(getRelDate(-79, 10, 20))
    },
    {
      event_id: 'event-4',
      ticket: 'MV-2026-2D326A',
      rating: 4,
      liked: 'The numerical differential equation solver benchmarks.',
      improve: 'Slightly faster Wi-Fi in Computer Lab.',
      created: fmtSql(getRelDate(-19, 14, 0))
    },
    {
      event_id: 'event-5',
      ticket: 'MV-2026-REV002',
      rating: 4,
      liked: 'The friendly trivia buzzer rounds and Pi-themed geometry problem set.',
      improve: 'More seating inside Seminar Hall 4.',
      created: fmtSql(getRelDate(-44, 11, 0))
    },
    {
      event_id: 'event-6',
      ticket: 'MV-2026-REV003',
      rating: 5,
      liked: 'Top tier challenge design by the club executives. Best hackathon of the year.',
      improve: 'Host a cryptography challenge every semester!',
      created: fmtSql(getRelDate(-79, 16, 30))
    }
  ];

  for (const fb of demoFeedback) {
    insertFb.run(fb.event_id, fb.ticket, fb.rating, fb.liked, fb.improve, fb.created);
  }
  console.log(`✓ Seeded ${demoFeedback.length} rich feedback reviews across past events.`);

  console.log('\n🌟 [MathVerse Seeder] Demo database successfully seeded!');
  console.log('------------------------------------------------------------');
  console.log('• 12 Demo Members created with code format MV-M-0001 .. MV-M-0012');
  console.log(`• Shared demo password: "${demoPassword}"`);
  console.log('• Season Leaderboard & Profiles now populated with scores & badges');
  console.log('• Attendance & verifiable certificates ready for review');
  console.log('------------------------------------------------------------\n');
}

function autoSeedIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    if (count === 0) {
      console.log('🚀 SEED_DEMO=true detected and database is empty. Running initial demo seed...');
      seedDatabase(true);
    } else {
      console.log(`ℹ️ SEED_DEMO=true detected, but database already has ${count} members. Skipping auto-seed.`);
    }
  } catch (err) {
    console.error('Error during autoSeedIfEmpty:', err);
  }
}

// Execute when invoked directly via CLI (npm run seed or node seed.js)
if (require.main === module) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, autoSeedIfEmpty };
