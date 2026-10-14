# MathVerse 🧮

A live, real-time math quiz platform built for the college Mathematics Club. MathVerse delivers high-energy, interactive math competitions with instant response tracking and an immersive dark-themed experience.

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Plain HTML5, CSS3 (Modern Glassmorphism & Animations), Vanilla JavaScript (No build step required)
- **Real-Time:** WebSockets via Socket.IO

## Project Structure

```text
Mathverse/
├── docs/               # Project documentation (.gitkeep)
├── screenshots/        # Visual preview assets (.gitkeep)
├── public/             # Static web client assets
│   ├── css/
│   │   └── style.css   # Dark theme, glassmorphism & floating math symbols
│   ├── js/
│   │   └── app.js      # Socket.IO connection & dynamic status indicator
│   └── index.html      # MathVerse landing page
├── package.json        # Dependencies & scripts
├── server.js           # Express app & Socket.IO server
├── .gitignore          # Git ignore rules
└── README.md           # Documentation
```

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open the application:**
   Visit [http://localhost:3000](http://localhost:3000) in your web browser.
