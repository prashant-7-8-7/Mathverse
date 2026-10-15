const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mathverse.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance & concurrency
db.pragma('journal_mode = WAL');

// Automatically create tables on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    venue TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 60,
    status TEXT DEFAULT 'upcoming',
    badge TEXT DEFAULT '',
    date_iso TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    enrollment_no TEXT NOT NULL,
    branch TEXT NOT NULL,
    year TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checked_in INTEGER DEFAULT 0,
    FOREIGN KEY(event_id) REFERENCES events(id)
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_email_event ON registrations(email, event_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_ticket ON registrations(ticket_code);

  -- Live Quiz Arena Tables
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    time_limit_sec INTEGER DEFAULT 20,
    points INTEGER DEFAULT 1000,
    FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    room_code TEXT NOT NULL,
    event_id TEXT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
  );

  CREATE TABLE IF NOT EXISTS session_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    final_score INTEGER DEFAULT 0,
    final_rank INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    member_id INTEGER NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    chosen_index INTEGER,
    is_correct INTEGER,
    time_ms INTEGER,
    points_awarded INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES questions(id),
    FOREIGN KEY(player_id) REFERENCES session_players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    branch TEXT NOT NULL,
    year TEXT NOT NULL,
    bio TEXT DEFAULT '',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_room ON sessions(room_code);
  CREATE INDEX IF NOT EXISTS idx_session_players_session ON session_players(session_id);
  CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
  CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);
  CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

  -- Phase 6: Certificates
  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cert_code TEXT UNIQUE NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NULL,
    event_id TEXT NULL,
    session_id INTEGER NULL,
    type TEXT NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id),
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(cert_code);
  CREATE INDEX IF NOT EXISTS idx_certificates_email ON certificates(recipient_email);
  CREATE INDEX IF NOT EXISTS idx_certificates_event ON certificates(event_id);
  CREATE INDEX IF NOT EXISTS idx_certificates_session ON certificates(session_id);

  -- Phase 6: Event Feedback
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    ticket_code TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    liked TEXT,
    improve TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_code, event_id),
    FOREIGN KEY(event_id) REFERENCES events(id)
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_event ON feedback(event_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_ticket ON feedback(ticket_code);
`);

// Safe migration: Add member_id column to session_players if existing table didn't have it
const sessionPlayerCols = db.prepare("PRAGMA table_info(session_players)").all();
if (!sessionPlayerCols.some(c => c.name === 'member_id')) {
  db.exec("ALTER TABLE session_players ADD COLUMN member_id INTEGER NULL REFERENCES members(id);");
  console.log('[DB] Safely migrated session_players table: added member_id column.');
}
db.exec("CREATE INDEX IF NOT EXISTS idx_session_players_member ON session_players(member_id);");

// Safe migration: Add checked_in_at column to registrations if not present
const regCols = db.prepare("PRAGMA table_info(registrations)").all();
if (!regCols.some(c => c.name === 'checked_in_at')) {
  db.exec("ALTER TABLE registrations ADD COLUMN checked_in_at DATETIME NULL;");
  console.log('[DB] Safely migrated registrations table: added checked_in_at column.');
}

// Safely migrate events table to ensure date_iso column exists
try {
  db.exec("ALTER TABLE events ADD COLUMN date_iso TEXT DEFAULT '';");
  console.log('[DB] Safely migrated events table: added date_iso column.');
} catch (e) {
  // column already exists
}

function getFreshEvents() {
  const getRelDate = (days, hours) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hours, 0, 0, 0);
    return d;
  };
  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fmtISO = (d) => {
    const Y = d.getFullYear(), M = String(d.getMonth() + 1).padStart(2, '0'), D = String(d.getDate()).padStart(2, '0');
    const H = String(d.getHours()).padStart(2, '0');
    return `${Y}-${M}-${D}T${H}:00:00`;
  };

  const d1 = getRelDate(6, 10);
  const d2 = getRelDate(13, 14);
  const d3 = getRelDate(20, 10);
  const d7 = getRelDate(34, 14);
  const d4 = getRelDate(-20, 14);
  const d5 = getRelDate(-45, 10);
  const d6 = getRelDate(-80, 14);

  return [
    {
      id: "event-1",
      title: "Euler Quiz Night",
      date: fmtDate(d1),
      date_iso: fmtISO(d1),
      time: "10:00 AM – 1:00 PM",
      venue: "Colloquium Hall",
      category: "Competition",
      description: "Our signature seasonal trivia and speed problem contest celebrating Leonhard Euler's masterworks across number theory, graph analysis, and infinite series. Teams of 2 or 3 compete for the coveted Euler Chalice and cash prizes.",
      capacity: 60,
      status: "upcoming",
      badge: "High Stakes"
    },
    {
      id: "event-2",
      title: "Integration Bee",
      date: fmtDate(d2),
      date_iso: fmtISO(d2),
      time: "2:00 PM – 5:30 PM",
      venue: "Student Activity Center (SAC)",
      category: "Tournament",
      description: "The ultimate 1-on-1 single-elimination tournament of definite and indefinite integrals. Competitors face off at opposite blackboards with 3-minute timers to solve devilish calculus problems under intense stage lighting.",
      capacity: 48,
      status: "upcoming",
      badge: "Flagship"
    },
    {
      id: "event-3",
      title: "Fibonacci Fest",
      date: fmtDate(d3),
      date_iso: fmtISO(d3),
      time: "10:00 AM – 4:00 PM",
      venue: "SH1",
      category: "Festival",
      description: "A campus-wide carnival celebrating recurrent sequences, the golden ratio, modular origami, fractal generation booths, and interactive algorithmic art installations.",
      capacity: 150,
      status: "upcoming",
      badge: "Open Fair"
    },
    {
      id: "event-7",
      title: "Maths Aptitude & Placement Masterclass",
      date: fmtDate(d7),
      date_iso: fmtISO(d7),
      time: "2:00 PM – 5:00 PM",
      venue: "SH3",
      category: "Workshop",
      description: "A comprehensive placement preparation masterclass focusing on high-speed quantitative arithmetic, probability models, logical deduction puzzles, and analytical problem solving for top recruitment tests.",
      capacity: 80,
      status: "upcoming",
      badge: "Career Prep"
    },
    {
      id: "event-4",
      title: "Mathematical Modelling Workshop",
      date: fmtDate(d4),
      date_iso: fmtISO(d4),
      time: "2:00 PM – 5:30 PM",
      venue: "Computer Lab",
      category: "Workshop",
      description: "A hands-on masterclass translating differential equations and Markov chains into Python and MATLAB simulations to forecast epidemiological spreads and financial markets.",
      capacity: 40,
      status: "past",
      badge: "Hands-on"
    },
    {
      id: "event-5",
      title: "Pi Day Carnival 2026",
      date: fmtDate(d5),
      date_iso: fmtISO(d5),
      time: "10:00 AM – 3:00 PM",
      venue: "Seminar Hall 4",
      category: "Celebration",
      description: "The annual celebration featuring the 100-digit Pi recitation contest, pie eating championship, and Monte Carlo dartboard estimation of π.",
      capacity: 100,
      status: "past",
      badge: "Annual Tradition"
    },
    {
      id: "event-6",
      title: "Cipher Hunt & Cryptography Night",
      date: fmtDate(d6),
      date_iso: fmtISO(d6),
      time: "2:00 PM – 8:00 PM",
      venue: "SH2",
      category: "Hackathon",
      description: "An evening of cryptographic puzzle solving: deciphering classical substitution ciphers, breaking RSA vulnerabilities, and cracking elliptic curve handshakes.",
      capacity: 50,
      status: "past",
      badge: "Security"
    }
  ];
}

function ensureFreshEvents(database) {
  const existing = database.prepare('SELECT id, venue, date_iso, status FROM events').all();
  const oldVenues = ['Ramanujan', 'Amphitheater', 'Quad Lawn', 'Turing', 'Student Union', 'Cyber Security'];
  const hasOldVenue = existing.some(ev => oldVenues.some(ov => ev.venue && ev.venue.includes(ov)));
  const now = Date.now();
  const hasExpiredUpcoming = existing.some(ev => ev.status === 'upcoming' && ev.date_iso && new Date(ev.date_iso).getTime() <= now);
  const isMissingNewEvents = existing.length < 6;

  if (existing.length === 0 || hasOldVenue || hasExpiredUpcoming || isMissingNewEvents) {
    const fresh = getFreshEvents();
    const upsertStmt = database.prepare(`
      INSERT INTO events (id, title, date, time, venue, category, description, capacity, status, badge, date_iso)
      VALUES (@id, @title, @date, @time, @venue, @category, @description, @capacity, @status, @badge, @date_iso)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        date = excluded.date,
        time = excluded.time,
        venue = excluded.venue,
        category = excluded.category,
        description = excluded.description,
        capacity = excluded.capacity,
        status = excluded.status,
        badge = excluded.badge,
        date_iso = excluded.date_iso
    `);
    const runMany = database.transaction((evs) => {
      for (const ev of evs) upsertStmt.run(ev);
    });
    runMany(fresh);
    console.log('[DB] Synchronized events: fresh relative dates & MITS-style venues active.');
  }
}

// Ensure fresh events on startup
ensureFreshEvents(db);

db.getFreshEvents = getFreshEvents;
db.ensureFreshEvents = ensureFreshEvents;

// Seed Demo Quiz "Euler Warm-Up" if quizzes table is empty
const quizCountStmt = db.prepare('SELECT COUNT(*) as count FROM quizzes');
const { count: quizCount } = quizCountStmt.get();

if (quizCount === 0) {
  const insertQuizStmt = db.prepare('INSERT INTO quizzes (title) VALUES (?)');
  const insertQuestionStmt = db.prepare(`
    INSERT INTO questions (quiz_id, text, options, correct_index, time_limit_sec, points)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    const quizInfo = insertQuizStmt.run('Euler Warm-Up');
    const quizId = quizInfo.lastInsertRowid;

    const demoQuestions = [
      {
        text: "Which celebrated formula is known as Euler's identity, linking $e$, $i$, $\\pi$, $1$, and $0$?",
        options: JSON.stringify([
          "$e^{i\\pi} + 1 = 0$",
          "$e^{i\\pi} - 1 = 0$",
          "$e^{2\\pi i} + 1 = 0$",
          "\\ln(i) = \\pi"
        ]),
        correct_index: 0,
        time_limit_sec: 20,
        points: 1000
      },
      {
        text: "What is the closed-form exact value of the Basel Problem sum: $\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$?",
        options: JSON.stringify([
          "$\\frac{\\pi}{4}$",
          "$\\frac{\\pi^2}{6}$",
          "$\\frac{\\pi^2}{8}$",
          "$\\frac{\\pi^4}{90}$"
        ]),
        correct_index: 1,
        time_limit_sec: 20,
        points: 1000
      },
      {
        text: "Using the Fundamental Theorem of Calculus, evaluate $\\frac{d}{dx} \\left( \\int_0^x e^{-t^2} dt \\right)$:",
        options: JSON.stringify([
          "$2x e^{-x^2}$",
          "$-2x e^{-x^2}$",
          "$e^{-x^2}$",
          "$\\frac{\\sqrt{\\pi}}{2} e^{-x^2}$"
        ]),
        correct_index: 2,
        time_limit_sec: 20,
        points: 1000
      },
      {
        text: "For any convex planar polyhedron with $V$ vertices, $E$ edges, and $F$ faces, Euler's polyhedron characteristic states:",
        options: JSON.stringify([
          "$V - E + F = 2$",
          "$V + E - F = 2$",
          "$V - E - F = 2$",
          "$V + E + F = 1$"
        ]),
        correct_index: 0,
        time_limit_sec: 20,
        points: 1000
      },
      {
        text: "Compute the fundamental trigonometric limit: $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$:",
        options: JSON.stringify([
          "$0$",
          "$1$",
          "Does not exist",
          "$3$"
        ]),
        correct_index: 3,
        time_limit_sec: 20,
        points: 1000
      }
    ];

    for (const q of demoQuestions) {
      insertQuestionStmt.run(quizId, q.text, q.options, q.correct_index, q.time_limit_sec, q.points);
    }
  });

  seedTransaction();
  console.log('[DB] Seeded demo quiz "Euler Warm-Up" with 5 math questions.');
}

module.exports = db;

