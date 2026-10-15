# 🌌 Mathematics Club

> **The Living Digital Universe & Live Competition Arena for Collegiate Mathematics**

![Mathematics Club Banner](screenshots/hero.png)

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.3-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math%20Typesetting-3298dc?logo=latex&logoColor=white)](https://katex.org/)
[![GSAP](https://img.shields.io/badge/Animations-GSAP%203-0ae448?logo=greensock&logoColor=white)](https://greensock.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Pitch & Vision

**MathVerse** is an all-in-one web platform and real-time multiplayer arena designed specifically for college Mathematics Clubs. 

Far beyond a static club homepage, MathVerse treats the mathematics club as a **"living universe"**—unifying event registrations, camera-based QR attendance, live mathematical esports tournaments with millisecond scoring, seasonal Elo leaderboards, cryptographic certificate issuance, and attendee feedback into a single, cohesive, zero-build web platform.

---

## 🧩 The Problem MathVerse Solves

1. **Academic Operational Silos**: College clubs juggle disparate tools—Google Forms for registration, paper sign-in sheets at the door, Kahoot (which natively lacks rich mathematical $\LaTeX$ typesetting), and Google Slides or Canva for manual certificates.
2. **Mathematical Notation Gaps**: Generic quiz platforms scramble complex equations, matrices, integrals, and Greek symbols. MathVerse features deep, first-class **KaTeX** integration across questions, options, player screens, and host editors.
3. **Attendee Disengagement**: Traditional seminar attendance drops over the semester. MathVerse introduces gamified **Seasonal Leaderboards**, milestone achievement badges, and verifiable profile accolades that reward ongoing participation.
4. **Credential Forgery**: Printed paper certificates are easily faked and tedious to distribute. MathVerse issues verifiable, cryptographically traceable credentials with integrated QR verification links.

---

## ⚡ Core Feature Modules

### 1. 🌌 Living Universe Discovery & Art Portal
- **Particle Universe Hero**: Canvas visualization where ~1,500 particles react to cursor gravity and dynamically morph between mathematical curves (Lissajous resonance, Rose curves, and the MathVerse typography).
- **Equation of the Day**: Rotating mathematical beauty highlights rendered via KaTeX with contextual explanations.
- **Math Art Gallery**: Procedurally inspired geometric exhibits illustrating chaos theory, non-Euclidean geometry, fractals, and topology.
- **Club Timeline & Executive Board**: Dynamic milestone chronicles and leadership cards driven from a central data schema (`data.js`).

### 2. 🎫 Event Registration & Digital Passes
- **Dynamic Seat Capacity**: Live capacity tracking with auto-closing registrations upon sell-out.
- **Cryptographic Ticket Pass**: Instant unique ticket generation (`MV-2026-XXXXXX`) paired with a downloadable SVG/PNG QR pass.
- **Automated Anti-Duplicate Guard**: Server-level prevention against multiple submissions with the same email.

### 3. ⚡ Live Quiz Arena (Multiplayer Esports for Math)
- **Real-Time WebSockets**: Powered by Socket.IO with zero polling and sub-15ms sync latency.
- **KaTeX Question Engine**: Math equations in both question stems and all 4 options ($e^{i\pi}+1=0$, $\int_0^\infty x^2 dx$, etc.).
- **Host Control Console (`arena-host.html`)**: Real-time lobby monitor, live answer count telemetry, question progression, and manual overrides protected by admin tokens.
- **Dynamic Scoring**: Score decay algorithm awarding up to 1,000 points based on submission speed in milliseconds.
- **Animated Victory Podium**: Gold, Silver, and Bronze pedestal celebration with falling confetti and real-time score reveal.

### 4. 👥 Member Accounts, Profiles & Seasonal Leaderboards
- **Cryptographic Security**: Passwords hashed with Node's built-in `crypto.scrypt` with random 16-byte salts and timing-safe comparisons.
- **Login Rate Limiting**: Automatic IP-based throttling (5 failed attempts per 10 minutes) preventing brute force.
- **Seasonal Elo Leaderboard**: Comprehensive points tally across quizzes with podium badges, win streaks, and rank tiers.
- **Customizable Public Profiles**: Members showcase their bio, college branch, year, attended tournaments, and unlocked badges (`Integration Master`, `Euler Prodigy`, `Centurion`, etc.).

### 5. 📷 Fast Attendance Check-In Kiosk
- **Camera QR Scanner (`admin-checkin.html`)**: Built-in camera feed powered by `html5-qrcode` to scan digital passes directly from attendee screens.
- **Instant Keyboard / Barcode Input**: Fallback input field supporting hardware USB barcode guns or manual ticket entry.
- **Duplicate Entry Defense**: Displays instant visual feedback (green success card, red rejection, or amber warning if already checked in with exact timestamp).

### 6. 📜 Cryptographic Certificates & Public Verification
- **Verifiable Certificate Generation**: Direct programmatic PDF and SVG generation with club signatures, seals, and recipient credentials.
- **Honors Classification**: Distinctive styling for *Participation*, *Runner-Up*, *Third Place*, and *Championship Winner*.
- **Instant Public Verification (`verify.html`)**: Scan or visit `/verify.html?code=MV-CERT-XXXXXXXX` to validate certificate authenticity, event details, and issue date against the immutable database.

### 7. ⭐ Attendee Feedback & Experience Analytics
- **Verified Ticket Gate**: Feedback submissions require a valid checked-in ticket code, preventing spam.
- **5-Star Rating & Insights**: Attendees rate organization, challenge level, and submit qualitative comments.
- **Admin Feedback Dashboard**: Live average rating calculations, rating distribution charts, and one-click CSV export.

### 8. 🛡️ Master Executive Admin Panel (`admin.html`)
- **Centralized Command**: Overview of registrations, capacity utilization, attendee roster search, and real-time live events.
- **CSV Data Export**: Instant attendee and feedback roster export for collegiate academic records.
- **Demo Member Indicators**: Seeded demo accounts are clearly tagged with an amber `Demo` badge.

---

## 🎨 Signature Touches & Easter Eggs

- **Hidden Mandelbrot Fractal Explorer**: Typing `pi` or entering the legendary **Konami Code** (`↑ ↑ ↓ ↓ ← → ← → B A`) on any page triggers a full-screen, interactive Mandelbrot fractal explorer with dynamic zoom, pan, and real-time KaTeX coordinate telemetry.
- **First-Visit Mathematical Sequence**: First-time visitors are welcomed with a brief, high-performance mathematical curve drawing animation before smoothly entering the universe.
- **404 Cosmic Singularity**: Custom error page simulating a gravitational singularity with orbiting limits ($\lim_{x \to 0} \frac{1}{x} = \infty$) and quick escape vectors.
- **Rocket Launch Scroll-to-Top**: Ambient `#btn-back-to-top` with smooth rocket propulsion physics.
- **Universal Accessibility**: Strict `:focus-visible` neon cyan outline rings, complete ARIA descriptions, and responsive layout scaling down to 375px mobile screens without horizontal jitter.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Server Runtime** | Node.js (v18+ recommended) |
| **HTTP Framework** | Express 5.x |
| **Real-Time Network** | WebSockets via Socket.IO 4.x |
| **Database** | SQLite 3 via `better-sqlite3` (with WAL mode) |
| **Security** | Helmet HTTP security headers, Scrypt password hashing, timing-safe buffers, IP rate limiting |
| **Math Typesetting** | KaTeX (CDN, zero runtime dependencies) |
| **Motion & Dynamics** | GSAP 3 & ScrollTrigger (CDN) |
| **Document Generation** | PDFKit & node-qrcode |
| **Frontend Framework** | Pure Semantic HTML5, CSS3 Variables & Glassmorphism, Vanilla ES6+ JavaScript (**No build step, no npm build required**) |
| **Design Typography** | Space Grotesk (Headings), Inter (Body), JetBrains Mono (Code & Math Accents) |

---

## 📸 Screenshots

| Landing Universe & Morphing Curve | Live Multiplayer Quiz Arena |
|:---:|:---:|
| ![Landing Page](screenshots/landing.png) | ![Quiz Arena](screenshots/arena.png) |

| Event Pass & QR Ticket | Season Leaderboard & Podium |
|:---:|:---:|
| ![Ticket Pass](screenshots/ticket.png) | ![Leaderboard](screenshots/leaderboard.png) |

| Camera Attendance Scanner | Cryptographic Certificate Verification |
|:---:|:---:|
| ![Attendance Scanner](screenshots/checkin.png) | ![Certificate Verification](screenshots/verify.png) |

*(Place screenshots in the `screenshots/` directory)*

---

## 🚀 Quickstart & Windows Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or later)
- Windows PowerShell, Command Prompt, or terminal of your choice

### 1. Clone & Enter Repository
```powershell
git clone https://github.com/prashant-7-8-7/Mathverse.git
cd Mathverse
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `.env` in your editor and configure your credentials:
```env
# Server Port
PORT=3000

# Executive Master Admin Password (REQUIRED: admin login refuses authentication if empty)
ADMIN_PASSWORD=your_secure_password_here

# Automatic Demo Seeding (Set to 'true' to auto-populate a fresh database on startup)
SEED_DEMO=true

# Demo Member Shared Password (Used for all seeded demo member profiles)
DEMO_PASSWORD=demo1234
```

### 4. Start the Application
```powershell
npm start
```
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Demo Data Mode (Instant Evaluation)

To populate MathVerse with realistic sample club members, past/upcoming events, completed live arena sessions, podium statistics, certificates, and reviews:

### Option A: Automatic Startup Seeding
Set `SEED_DEMO=true` in your `.env` file. On startup, if the database has zero members, it will automatically populate the complete demo suite.

### Option B: Manual CLI Seeding
Run the standalone seed script at any time:
```powershell
npm run seed
```

### Seeded Credentials & Accounts:
- **Admin Password**: Configured in `.env` (`ADMIN_PASSWORD`)
- **Demo Member Accounts**: 12 accounts (`devin.patel@demo.mathverse.org`, `elena.rostova@demo.mathverse.org`, etc.)
- **Shared Demo Password**: `demo1234` (or whatever is set in `DEMO_PASSWORD`)
- **Member Codes**: `MV-M-0001` through `MV-M-0012`

---

## 📂 Project Directory Structure

```text
Mathverse/
├── data/                       # Local SQLite database (gitignored)
│   └── mathverse.db            # Persistent database
├── docs/                       # Architecture documentation & guides
├── screenshots/                # Showcase imagery & mockups
├── public/                     # Static client application (No build step)
│   ├── css/
│   │   └── style.css           # Glassmorphism, neon universe theme & animations
│   ├── js/
│   │   ├── data.js             # Centralized club profile & fallback data schema
│   │   ├── main.js             # Shared navigation, cursors, Easter eggs & loader
│   │   └── app.js              # Connection & status telemetry
│   ├── index.html              # Living universe landing page & 5-step lifecycle
│   ├── about.html              # Club mission, timeline & executive committee
│   ├── events.html             # Events calendar, seat capacity & registrations
│   ├── gallery.html            # Mathematical fractal & procedural art gallery
│   ├── arena.html              # Live multiplayer player client
│   ├── arena-host.html         # Quiz builder, session host console & telemetry
│   ├── leaderboard.html        # Seasonal Elo standings & tournament podium
│   ├── members.html            # Public member directory & point ranks
│   ├── profile.html            # Member profile, bio editor & achievement badges
│   ├── member-login.html       # Member signup & authentication portal
│   ├── ticket.html             # Digital QR ticket pass & verification
│   ├── admin.html              # Master executive administration panel
│   ├── admin-checkin.html      # Camera QR attendance check-in scanner
│   ├── certificates.html       # Public certificate search & PDF downloads
│   ├── verify.html             # Cryptographic certificate verification portal
│   ├── feedback.html           # Attendee event rating & suggestions
│   └── 404.html                # Mathematical singularity error page
├── .env.example                # Template for environment configuration
├── db.js                       # SQLite initialization, schema migrations & seeds
├── seed.js                     # Rich demo data generation script
├── server.js                   # Express, Socket.IO real-time engine & APIs
├── package.json                # Dependencies & npm scripts
└── README.md                   # Project documentation
```

---

## 🔮 Future Roadmap & Enhancements

- [ ] **Interactive $\LaTeX$ Scratchpad**: In-arena handwriting recognition allowing competitors to sketch proofs on stylus tablets.
- [ ] **Inter-Collegiate Tournament Brackets**: Regional federated brackets connecting math clubs across different universities.
- [ ] **Discord & Telegram Bots**: Automated notifications broadcasting live quiz room codes and upcoming event capacity alerts.
- [ ] **Mathematical Graph Sandbox**: Desmos-style inline graphing tools for multi-step calculus challenges.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — feel free to adapt and expand it for your university or community mathematics society.

*Crafted with rigor, curiosity, and code for mathematicians everywhere.* 🌌
