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

module.exports = db;
