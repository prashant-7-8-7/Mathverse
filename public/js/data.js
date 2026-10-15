/**
 * ==========================================================================
 * MathVerse — Central Club Configuration & Data Store
 * ==========================================================================
 * EDIT INSTRUCTIONS:
 * You can customize any placeholder text, dates, events, team members, or
 * contact details in this file. All pages (about, events, gallery, contact,
 * etc.) dynamically read from this object.
 * ==========================================================================
 */

const MathVerseData = {
  // ------------------------------------------------------------------------
  // 1. BASIC CLUB IDENTITY (EDIT HERE)
  // ------------------------------------------------------------------------
  clubName: "Mathematics Club",
  collegeName: "MITS Gwalior",
  tagline: "Where abstract mathematics meets real-time competition, cosmic intuition, and collective brilliance.",
  foundingYear: 2018,
  department: "Department of Mathematics & Computer Science",
  location: "Science Hall, Room 402",

  // ------------------------------------------------------------------------
  // 2. MISSION & CORE PILLARS (EDIT HERE)
  // ------------------------------------------------------------------------
  missionText: "To cultivate an open, vibrant mathematical universe where students across all disciplines uncover the boundless beauty of pure mathematics, master applied quantitative reasoning, and compete in exhilarating real-time arenas.",
  storyText: "Founded in 2018 by seven passionate undergraduates in a chalkboard-walled corner of Room 402, our Mathematics Club began with informal puzzle hours and Putnam problem circles. Over eight years, it has transformed into a 500+ member student powerhouse: hosting regional olympiads, publishing student research, competing in speed integration bees, and pioneering MathVerse—our custom real-time battleground.",

  missionPillars: [
    {
      icon: "∫",
      title: "Pure Rigor",
      description: "Delving into abstract algebra, real analysis, and number theory with mathematical depth and intellectual honesty."
    },
    {
      icon: "∑",
      title: "Applied Impact",
      description: "Bridging pure mathematics with quantum computing, machine learning, algorithmic game theory, and cryptography."
    },
    {
      icon: "⚡",
      title: "Real-Time Arena",
      description: "Pioneering speed math competitions and live multiplayer quiz battles to hone instant analytical intuition."
    },
    {
      icon: "∞",
      title: "Inclusive Cosmos",
      description: "Welcoming all curious minds regardless of major—from freshman enthusiasts to graduate research scholars."
    }
  ],

  // ------------------------------------------------------------------------
  // 3. CLUB MILESTONES / TIMELINE (EDIT HERE - 5 Milestones)
  // ------------------------------------------------------------------------
  timeline: [
    {
      year: "2018",
      title: "Genesis in Room 402",
      description: "Seven math and physics students founded the club, initiating weekly blackboard problem-solving circles and calculus tutoring.",
      badge: "Founding"
    },
    {
      year: "2020",
      title: "The Digital Frontier",
      description: "Pioneered virtual calculus hackathons and launched our first livestreamed Inter-Collegiate Integration Bee during lockdowns.",
      badge: "Evolution"
    },
    {
      year: "2022",
      title: "National Podium",
      description: "Our club contest delegation secured 1st Place in the National Collegiate Mathematics Olympiad among 64 competing universities.",
      badge: "Championship"
    },
    {
      year: "2024",
      title: "Quantitative Research Grants",
      description: "Established the Undergraduate Research Colloquium with faculty endowments, sponsoring 14 student research papers in applied topology.",
      badge: "Research"
    },
    {
      year: "2026",
      title: "Launch of MathVerse",
      description: "Unveiled MathVerse, our proprietary real-time live arena, interactive knowledge hub, and official club operating universe.",
      badge: "Milestone"
    }
  ],

  // ------------------------------------------------------------------------
  // 4. EXECUTIVE TEAM (EDIT HERE - 8 Members)
  // ------------------------------------------------------------------------
  team: [
    {
      id: "member-1",
      name: "Alex Rivera",
      role: "Club President & Research Lead",
      bio: "Senior Pure Math & Physics major. Researches algebraic topology and organizes our weekly advanced problem seminars.",
      initials: "AR",
      gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)"
    },
    {
      id: "member-2",
      name: "Sophia Chen",
      role: "Vice President & Competition Director",
      bio: "Junior Applied Math & CS major. Former Putnam top-50 scorer and chief architect of our annual Integration Bee.",
      initials: "SC",
      gradient: "linear-gradient(135deg, #22d3ee, #3b82f6)"
    },
    {
      id: "member-3",
      name: "Marcus Vance",
      role: "Technical Lead & MathVerse Architect",
      bio: "Junior Computer Science & Data Science specialist. Built the real-time WebSockets synchronization engine for MathVerse.",
      initials: "MV",
      gradient: "linear-gradient(135deg, #10b981, #06b6d4)"
    },
    {
      id: "member-4",
      name: "Priya Sharma",
      role: "Head of Workshops & Colloquiums",
      bio: "Senior Statistics & Economics double major. Organizes guest faculty lectures and industry quantitative finance panels.",
      initials: "PS",
      gradient: "linear-gradient(135deg, #fbbf24, #f97316)"
    },
    {
      id: "member-5",
      name: "Liam O'Connor",
      role: "Treasurer & Industry Relations",
      bio: "Sophomore Mathematics & Finance major. Manages club endowments, sponsorship budgets, and competition prize pools.",
      initials: "LO",
      gradient: "linear-gradient(135deg, #a855f7, #6366f1)"
    },
    {
      id: "member-6",
      name: "Elena Rostova",
      role: "Creative Director & Mathematical Art",
      bio: "Sophomore Math & Digital Media major. Generates generative fractal geometry and curates the MathVerse visual universe.",
      initials: "ER",
      gradient: "linear-gradient(135deg, #f43f5e, #fb7185)"
    },
    {
      id: "member-7",
      name: "David Kim",
      role: "Head of Outreach & High School Mentorship",
      bio: "Junior Mathematics Education major. Directs our local high school olympiad training clinics and community math circles.",
      initials: "DK",
      gradient: "linear-gradient(135deg, #06b6d4, #14b8a6)"
    },
    {
      id: "member-8",
      name: "Maya Patel",
      role: "Community Manager & Problem Setter",
      bio: "Sophomore Pure Math enthusiast. Authors original challenge problems for our weekly Equation of the Day and speed drills.",
      initials: "MP",
      gradient: "linear-gradient(135deg, #eab308, #84cc16)"
    }
  ],

  // ------------------------------------------------------------------------
  // 5. EVENTS (EDIT HERE - 6 Events: 3 Upcoming, 3 Past)
  // Date format: YYYY-MM-DDTHH:MM:SS for accurate live countdown calculation
  // ------------------------------------------------------------------------
  events: [
    {
      id: "event-1",
      title: "Euler Quiz Night",
      category: "Competition",
      status: "upcoming",
      dateStr: "March 28, 2026",
      dateTimeISO: "2026-03-28T18:00:00",
      time: "6:00 PM – 8:30 PM",
      venue: "Ramanujan Hall 302 & Discord Live",
      badge: "High Stakes",
      description: "Our signature seasonal trivia and speed problem contest celebrating Leonhard Euler's masterworks across number theory, graph analysis, and infinite series. Teams of 2 or 3 compete for the coveted Euler Chalice and cash prizes.",
      details: "Format: 4 rounds of increasing difficulty (Speed Mental Math, Visual Geometry, Proof Quick-Fire, Final Lightning Buzzer). Open to all undergraduate and graduate students. Free pizza and refreshments provided."
    },
    {
      id: "event-2",
      title: "Integration Bee",
      category: "Tournament",
      status: "upcoming",
      dateStr: "April 11, 2026",
      dateTimeISO: "2026-04-11T17:30:00",
      time: "5:30 PM – 9:00 PM",
      venue: "Science Amphitheater A",
      badge: "Flagship",
      description: "The ultimate 1-on-1 single-elimination tournament of definite and indefinite integrals. Competitors face off at opposite blackboards with 3-minute timers to solve devilish calculus problems under intense stage lighting.",
      details: "Grand prize: $300 scholarship grant + custom engraved Integration Bee Trophy. Warm-up problem sets will be distributed to registrants 48 hours prior."
    },
    {
      id: "event-3",
      title: "Fibonacci Fest",
      category: "Festival",
      status: "upcoming",
      dateStr: "April 25, 2026",
      dateTimeISO: "2026-04-25T11:00:00",
      time: "11:00 AM – 4:00 PM",
      venue: "Mathematics Quad Lawn",
      badge: "Open Fair",
      description: "A campus-wide carnival celebrating recurrent sequences, the golden ratio, modular origami, fractal generation booths, and interactive algorithmic art installations.",
      details: "Interactive stations include: 3D printed polyhedral geometry, algorithmic music synthesis, spiral botany workshops, and open math puzzle lounges."
    },
    {
      id: "event-4",
      title: "Mathematical Modelling Workshop",
      category: "Workshop",
      status: "past",
      dateStr: "February 14, 2026",
      dateTimeISO: "2026-02-14T14:00:00",
      time: "2:00 PM – 5:30 PM",
      venue: "Turing Computational Lab",
      badge: "Hands-on",
      description: "A hands-on masterclass translating differential equations and Markov chains into Python and MATLAB simulations to forecast epidemiological spreads and financial markets.",
      details: "Over 80 students built and backtested real-world quantitative models with guidance from our faculty and industry quant mentors."
    },
    {
      id: "event-5",
      title: "Pi Day Carnival 2026",
      category: "Celebration",
      status: "past",
      dateStr: "March 14, 2026",
      dateTimeISO: "2026-03-14T13:59:00",
      time: "1:59 PM – 5:00 PM",
      venue: "Campus Student Union",
      badge: "Annual Tradition",
      description: "The annual March 14 celebration featuring the 100-digit Pi recitation contest, pie eating championship, and Monte Carlo dartboard estimation of π.",
      details: "Congratulations to winner Sarah Jenkins for reciting 384 digits of π without hesitation!"
    },
    {
      id: "event-6",
      title: "Cipher Hunt & Cryptography Night",
      category: "Hackathon",
      status: "past",
      dateStr: "January 23, 2026",
      dateTimeISO: "2026-01-23T18:00:00",
      time: "6:00 PM – 11:00 PM",
      venue: "Cyber Security Wing & Online",
      badge: "Security",
      description: "An evening of cryptographic puzzle solving: deciphering classical substitution ciphers, breaking RSA vulnerabilities, and cracking elliptic curve handshakes.",
      details: "24 student teams raced against the clock to decrypt five progressively encrypted treasure chests scattered across campus servers."
    }
  ],

  // ------------------------------------------------------------------------
  // 6. GALLERY ITEMS (EDIT HERE - 8 Mathematical Geometric Artworks)
  // Procedurally illustrated with modern SVG vector formulas
  // ------------------------------------------------------------------------
  gallery: [
    {
      id: "art-1",
      title: "Golden Spiral & Fibonacci Nautilus",
      category: "Geometry",
      date: "2026",
      badge: "Self-Similarity",
      description: "Logarithmic spiral based on the golden ratio φ ≈ 1.618033, mirroring self-similar growth patterns found in galaxies, nautilus shells, and sunflower seed phyllotaxis.",
      svgType: "golden-spiral"
    },
    {
      id: "art-2",
      title: "Lorenz Strange Attractor",
      category: "Chaos Theory",
      date: "2026",
      badge: "Non-Linear Dynamics",
      description: "A three-dimensional chaotic solution to the Lorenz system of differential equations, illustrating sensitive dependence on initial conditions (the butterfly effect).",
      svgType: "lorenz"
    },
    {
      id: "art-3",
      title: "Mandelbrot Fractal Horizon",
      category: "Fractals",
      date: "2026",
      badge: "Complex Numbers",
      description: "The boundary of the set defined by z_{n+1} = z_n^2 + c in the complex plane, revealing infinitely intricate, non-repeating filament structures.",
      svgType: "mandelbrot"
    },
    {
      id: "art-4",
      title: "Penrose Aperiodic Tiling",
      category: "Tessellation",
      date: "2026",
      badge: "5-Fold Symmetry",
      description: "A non-periodic tiling of the plane generated by thick and thin rhombs with matching rules, exhibiting long-range five-fold rotational quasi-crystal symmetry.",
      svgType: "penrose"
    },
    {
      id: "art-5",
      title: "Calabi-Yau 6D Manifold Projection",
      category: "Topology",
      date: "2026",
      badge: "String Theory",
      description: "A two-dimensional cross-section projection of a six-dimensional Ricci-flat Kähler manifold, crucial in superstring compactification models.",
      svgType: "calabi-yau"
    },
    {
      id: "art-6",
      title: "Toroidal Knot Vector Field",
      category: "Knot Theory",
      date: "2026",
      badge: "(p, q)-Torus",
      description: "A (3, 7)-torus knot wrapping seamlessly around the surface of a donut-shaped manifold, mapped through a continuous tangential vector streamline field.",
      svgType: "torus-knot"
    },
    {
      id: "art-7",
      title: "Hyperbolic Poincaré Disk",
      category: "Non-Euclidean",
      date: "2026",
      badge: "Lobachevskian Space",
      description: "Conformal representation of hyperbolic geometry inside a unit disk, where straight lines are represented as circular arcs orthogonal to the boundary.",
      svgType: "poincare"
    },
    {
      id: "art-8",
      title: "Platonic Icosahedral Constellation",
      category: "Polyhedra",
      date: "2026",
      badge: "Euler Characteristic",
      description: "A nested stellated icosahedron satisfying Euler's polyhedral formula V - E + F = 2, surrounded by concentric celestial orbital rings.",
      svgType: "icosahedron"
    }
  ],

  // ------------------------------------------------------------------------
  // 7. CONTACT & LOCATION INFO (EDIT HERE)
  // ------------------------------------------------------------------------
  contact: {
    email: "mathclub@mitsgwalior.in",
    supportEmail: "arena-support@mitsgwalior.in",
    phone: "+1 (555) 314-1592",
    altPhone: "+1 (555) 271-8281",
    office: "Room 402, Science Hall, North Campus",
    address: "Department of Mathematics & Computer Science, Science Hall, MITS Gwalior",
    hours: "Monday – Friday: 10:00 AM – 6:00 PM (Study lounge open 24/7 for members)",
    socials: {
      github: "https://github.com",
      discord: "https://discord.gg",
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
      twitter: "https://x.com"
    }
  },

  // ------------------------------------------------------------------------
  // 8. FREQUENTLY ASKED QUESTIONS (EDIT HERE - For contact.html Accordion)
  // ------------------------------------------------------------------------
  faqs: [
    {
      question: "Who is eligible to join the Mathematics Club?",
      answer: "Any registered student enrolled at our college! While many of our members major in Mathematics, Computer Science, Physics, or Engineering, our club enthusiastically welcomes members from all majors who share a curiosity for puzzles, quantitative problem solving, and analytical thinking."
    },
    {
      question: "Are there any membership fees or prerequisites to participate?",
      answer: "No! Membership is 100% free. All our regular workshops, guest lectures, problem-solving sessions, and open tournament spectator seats are freely open to the entire college community thanks to departmental sponsorship."
    },
    {
      question: "How will the live Quiz Arena work?",
      answer: "The Arena is built with real-time WebSockets. When a tournament round begins, participants join with a 6-digit game code from any device (phone or laptop). Math questions with LaTeX rendering appear synchronously on every screen with speed-weighted countdown scoring and instant leaderboard updates."
    },
    {
      question: "How can I register to compete in the upcoming Integration Bee or Euler Quiz?",
      answer: "Full online tournament registration and participant bracket management will officially launch in Phase 3. In the meantime, you can attend our weekly prep sessions in Room 402 or sign up at our physical booth during club hours!"
    },
    {
      question: "Can members propose workshop topics or student-led talks?",
      answer: "Absolutely! We love member-driven colloquiums. If you have explored an intriguing math topic, theorem, or computational model, reach out via our contact form or speak with Priya Sharma (Head of Workshops) to schedule a presentation slot."
    },
    {
      question: "Do you offer tutoring or mentorship for undergraduate math courses?",
      answer: "Yes. Our senior members and graduate affiliates run drop-in peer tutoring every Tuesday and Thursday from 3:00 PM to 6:00 PM in Science Hall 402, covering Calculus I–III, Linear Algebra, Discrete Math, and Differential Equations."
    }
  ]
};

// Export to window for global access across all client pages
if (typeof window !== 'undefined') {
  window.MathVerseData = MathVerseData;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathVerseData;
}
