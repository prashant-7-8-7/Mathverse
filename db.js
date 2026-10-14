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
    badge TEXT DEFAULT ''
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
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
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

  CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_room ON sessions(room_code);
  CREATE INDEX IF NOT EXISTS idx_session_players_session ON session_players(session_id);
  CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
`);

// Seed events if table is empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM events');
const { count } = countStmt.get();

if (count === 0) {
  const seedEvents = [
    {
      id: "event-1",
      title: "Euler Quiz Night",
      date: "March 28, 2026",
      time: "6:00 PM – 8:30 PM",
      venue: "Ramanujan Hall 302 & Discord Live",
      category: "Competition",
      description: "Our signature seasonal trivia and speed problem contest celebrating Leonhard Euler's masterworks across number theory, graph analysis, and infinite series. Teams of 2 or 3 compete for the coveted Euler Chalice and cash prizes.",
      capacity: 60,
      status: "upcoming",
      badge: "High Stakes"
    },
    {
      id: "event-2",
      title: "Integration Bee",
      date: "April 11, 2026",
      time: "5:30 PM – 9:00 PM",
      venue: "Science Amphitheater A",
      category: "Tournament",
      description: "The ultimate 1-on-1 single-elimination tournament of definite and indefinite integrals. Competitors face off at opposite blackboards with 3-minute timers to solve devilish calculus problems under intense stage lighting.",
      capacity: 48,
      status: "upcoming",
      badge: "Flagship"
    },
    {
      id: "event-3",
      title: "Fibonacci Fest",
      date: "April 25, 2026",
      time: "11:00 AM – 4:00 PM",
      venue: "Mathematics Quad Lawn",
      category: "Festival",
      description: "A campus-wide carnival celebrating recurrent sequences, the golden ratio, modular origami, fractal generation booths, and interactive algorithmic art installations.",
      capacity: 150,
      status: "upcoming",
      badge: "Open Fair"
    },
    {
      id: "event-4",
      title: "Mathematical Modelling Workshop",
      date: "February 14, 2026",
      time: "2:00 PM – 5:30 PM",
      venue: "Turing Computational Lab",
      category: "Workshop",
      description: "A hands-on masterclass translating differential equations and Markov chains into Python and MATLAB simulations to forecast epidemiological spreads and financial markets.",
      capacity: 40,
      status: "past",
      badge: "Hands-on"
    },
    {
      id: "event-5",
      title: "Pi Day Carnival 2026",
      date: "March 14, 2026",
      time: "1:59 PM – 5:00 PM",
      venue: "Campus Student Union",
      category: "Celebration",
      description: "The annual March 14 celebration featuring the 100-digit Pi recitation contest, pie eating championship, and Monte Carlo dartboard estimation of π.",
      capacity: 100,
      status: "past",
      badge: "Annual Tradition"
    },
    {
      id: "event-6",
      title: "Cipher Hunt & Cryptography Night",
      date: "January 23, 2026",
      time: "6:00 PM – 11:00 PM",
      venue: "Cyber Security Wing & Online",
      category: "Hackathon",
      description: "An evening of cryptographic puzzle solving: deciphering classical substitution ciphers, breaking RSA vulnerabilities, and cracking elliptic curve handshakes.",
      capacity: 50,
      status: "past",
      badge: "Security"
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO events (id, title, date, time, venue, category, description, capacity, status, badge)
    VALUES (@id, @title, @date, @time, @venue, @category, @description, @capacity, @status, @badge)
  `);

  const insertMany = db.transaction((events) => {
    for (const ev of events) insertStmt.run(ev);
  });

  insertMany(seedEvents);
  console.log('[DB] Initialized and seeded 6 events into MathVerse database.');
}

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

