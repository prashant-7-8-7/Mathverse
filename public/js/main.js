/**
 * MathVerse — Main Application Script
 * Shared across all pages: Navigation, Custom Cursor, Particle Universe,
 * KaTeX Equations, 3D Tilt Cards, GSAP ScrollTriggers & Socket.IO.
 * Phase 2 Extensions: Dynamic Data rendering for About, Events, Gallery, Contact.
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const data = window.MathVerseData || {};

  /* ========================================================================
     1. Custom Glowing Cursor (Disabled on Touch/Mobile)
     ======================================================================== */
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!isTouchDevice) {
    const dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    const trail = document.createElement('div');
    trail.className = 'custom-cursor-trail';
    document.body.appendChild(dot);
    document.body.appendChild(trail);

    let mouseX = -100;
    let mouseY = -100;
    let trailX = -100;
    let trailY = -100;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    // Smooth lerp for outer aura
    function renderCursor() {
      trailX += (mouseX - trailX) * 0.16;
      trailY += (mouseY - trailY) * 0.16;
      trail.style.transform = `translate(${trailX}px, ${trailY}px)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Expand cursor on hoverable elements
    const hoverTargets = 'a, button, .tilt-card, .btn-rotate-equation, .eq-dot, [role="button"], input, select, textarea, .gallery-card, .event-card, .filter-tab, .faq-summary, details';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) {
        document.body.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  /* ========================================================================
     2. Sticky Navigation & Mobile Hamburger Menu
     ======================================================================== */
  const navbar = document.querySelector('.navbar');
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 25) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  if (navToggle && mobileMenu) {
    const toggleMenu = (open) => {
      const isOpen = open !== undefined ? open : !mobileMenu.classList.contains('open');
      navToggle.classList.toggle('open', isOpen);
      mobileMenu.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    navToggle.addEventListener('click', () => toggleMenu());

    // Close on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        toggleMenu(false);
      }
    });

    // Close on clicking any link inside mobile menu
    mobileMenu.querySelectorAll('.mobile-link, .btn-nav-join').forEach(link => {
      link.addEventListener('click', () => toggleMenu(false));
    });
  }

  /* ========================================================================
     3. Socket.IO Connection & Live Status Indicator
     ======================================================================== */
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');

  function setSocketStatus(connected) {
    if (!statusBadge) return;
    if (connected) {
      statusBadge.classList.remove('status-disconnected');
      statusBadge.classList.add('status-connected');
      if (statusText) statusText.textContent = 'Connected';
    } else {
      statusBadge.classList.remove('status-connected');
      statusBadge.classList.add('status-disconnected');
      if (statusText) statusText.textContent = 'Disconnected';
    }
  }

  if (typeof io !== 'undefined') {
    try {
      const socket = io();
      socket.on('connect', () => {
        setSocketStatus(true);
      });
      socket.on('disconnect', () => {
        setSocketStatus(false);
      });
      socket.on('connect_error', () => {
        setSocketStatus(false);
      });
    } catch (err) {
      console.warn('[MathVerse Socket] Connection notice:', err.message);
      setSocketStatus(false);
    }
  }

  /* ========================================================================
     4. Mathematical Universe Particle System (~1500 particles)
     ======================================================================== */
  const canvas = document.getElementById('hero-canvas');
  if (canvas && !prefersReducedMotion) {
    initHeroParticleUniverse(canvas);
  }

  function initHeroParticleUniverse(canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.parentElement.clientWidth;
    let height = canvas.height = canvas.parentElement.clientHeight;

    const PARTICLE_COUNT = 1500;
    const particles = [];
    const colors = ['#8b5cf6', '#22d3ee', '#fbbf24', '#c084fc', '#38bdf8', '#fef08a'];

    let mouse = { x: -9999, y: -9999, active: false };

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = (mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height);
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    window.addEventListener('resize', () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      calculateAllTargets();
    });

    let currentShapeIndex = 0;
    const shapeNames = [
      'Lissajous Resonance',
      'Rhodonea Rose Curve',
      'MathVerse Constellation',
      'Cosmic Nebula'
    ];
    const morphIndicator = document.getElementById('morph-shape-name');

    const targets = {
      lissajous: [],
      rose: [],
      text: [],
      nebula: []
    };

    function calculateLissajousTargets() {
      const list = [];
      const cx = width / 2;
      const cy = height / 2;
      const rx = Math.min(width * 0.38, 420);
      const ry = Math.min(height * 0.36, 240);
      const a = 3;
      const b = 4;
      const delta = Math.PI / 2;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = (i / PARTICLE_COUNT) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 14;
        list.push({
          x: cx + rx * Math.sin(a * t + delta) + jitter,
          y: cy + ry * Math.sin(b * t) + jitter
        });
      }
      return list;
    }

    function calculateRoseTargets() {
      const list = [];
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width * 0.34, 270);
      const k = 4;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = (i / PARTICLE_COUNT) * Math.PI * 2;
        const r = maxR * Math.cos(k * theta);
        const jitter = (Math.random() - 0.5) * 12;
        list.push({
          x: cx + (r + jitter) * Math.cos(theta),
          y: cy + (r + jitter) * Math.sin(theta)
        });
      }
      return list;
    }

    function calculateTextTargets() {
      const list = [];
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');
      offscreen.width = width;
      offscreen.height = height;

      const fontSize = Math.min(Math.max(width * 0.1, 48), 120);
      offCtx.font = `800 ${fontSize}px 'Space Grotesk', sans-serif`;
      offCtx.fillStyle = '#ffffff';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillText('MathVerse', width / 2, height / 2);

      const imgData = offCtx.getImageData(0, 0, width, height).data;
      const sampledPixels = [];
      const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 80000)));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          if (imgData[idx + 3] > 140) {
            sampledPixels.push({ x, y });
          }
        }
      }

      if (sampledPixels.length === 0) {
        return calculateLissajousTargets();
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = sampledPixels[Math.floor(Math.random() * sampledPixels.length)];
        list.push({
          x: p.x + (Math.random() - 0.5) * 6,
          y: p.y + (Math.random() - 0.5) * 6
        });
      }
      return list;
    }

    function calculateNebulaTargets() {
      const list = [];
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(width, height) * 0.45;
        list.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius
        });
      }
      return list;
    }

    function calculateAllTargets() {
      targets.lissajous = calculateLissajousTargets();
      targets.rose = calculateRoseTargets();
      targets.text = calculateTextTargets();
      targets.nebula = calculateNebulaTargets();
    }

    calculateAllTargets();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        baseSize: Math.random() * 1.8 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.65 + 0.35,
        targetIndex: i
      });
    }

    function advanceShape() {
      currentShapeIndex = (currentShapeIndex + 1) % 4;
      if (morphIndicator) {
        morphIndicator.textContent = shapeNames[currentShapeIndex];
      }
    }
    setInterval(advanceShape, 7500);

    function getCurrentTargetArray() {
      switch (currentShapeIndex) {
        case 0: return targets.lissajous;
        case 1: return targets.rose;
        case 2: return targets.text;
        case 3: default: return targets.nebula;
      }
    }

    let lastTime = performance.now();
    function animate(now) {
      lastTime = now;
      ctx.clearRect(0, 0, width, height);
      const currentTargets = getCurrentTargetArray();

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        const target = currentTargets[i] || currentTargets[0];

        const dx = target.x - p.x;
        const dy = target.y - p.y;
        p.vx += dx * 0.035;
        p.vy += dy * 0.035;

        p.vx *= 0.82;
        p.vy *= 0.82;

        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          const maxDist = 180;
          if (dist < maxDist && dist > 1) {
            const force = (1 - dist / maxDist) * 3.5;
            p.vx += (mdx / dist) * force;
            p.vy += (mdy / dist) * force;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  /* ========================================================================
     5. Live Stats Strip — Count-Up Animation (ScrollTrigger / Observer)
     ======================================================================== */
  const statNumbers = document.querySelectorAll('.stat-count');
  if (statNumbers.length > 0) {
    const animateCount = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 2000;
      const start = performance.now();

      function updateNumber(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(ease * target);
        el.textContent = current.toLocaleString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          el.textContent = target.toLocaleString() + suffix;
        }
      }
      requestAnimationFrame(updateNumber);
    };

    if ('IntersectionObserver' in window) {
      const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.35 });

      statNumbers.forEach(num => statsObserver.observe(num));
    } else {
      statNumbers.forEach(num => animateCount(num));
    }
  }

  /* ========================================================================
     6. Equation of the Day Card (KaTeX Rotation)
     ======================================================================== */
  const equations = [
    {
      name: "Euler's Identity",
      tag: "Mathematical Beauty",
      latex: "e^{i\\pi} + 1 = 0",
      description: "Universally hailed as the most beautiful formula in mathematics, harmonizing 0, 1, e, i, and π in a single profound truth."
    },
    {
      name: "Schrödinger's Wave Equation",
      tag: "Quantum Mechanics",
      latex: "i\\hbar \\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r}, t) = \\hat{H}\\Psi(\\mathbf{r}, t)",
      description: "The mathematical heart of quantum physics, governing the deterministic evolution of wavefunctions across space and time."
    },
    {
      name: "The Gaussian Integral",
      tag: "Probability & Analysis",
      latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}",
      description: "The pillar of probability distributions, normal curves, diffusion, and statistical mechanics throughout the natural world."
    },
    {
      name: "Continuous Fourier Transform",
      tag: "Harmonic Analysis",
      latex: "\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x)\\, e^{-2\\pi i x \\xi} \\, dx",
      description: "Decomposes any complex continuous wave into its fundamental frequencies, powering modern signal processing and physics."
    },
    {
      name: "Einstein's Field Equations",
      tag: "General Relativity",
      latex: "R_{\\mu\\nu} - \\frac{1}{2}R g_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}",
      description: "Reveals how spacetime geometry responds and curves dynamically under the distribution of mass, energy, and momentum."
    },
    {
      name: "Riemann Zeta Reflection Formula",
      tag: "Analytic Number Theory",
      latex: "\\zeta(s) = 2^s \\pi^{s-1} \\sin\\!\\left(\\frac{\\pi s}{2}\\right) \\Gamma(1-s) \\zeta(1-s)",
      description: "Unveils deep global symmetry in the complex plane, guarding the deepest secrets of prime number distribution."
    }
  ];

  const eqTarget = document.getElementById('equation-target');
  const eqName = document.getElementById('equation-name');
  const eqDesc = document.getElementById('equation-desc');
  const eqTag = document.getElementById('equation-tag');
  const btnNextEq = document.getElementById('btn-next-equation');
  const eqDotsContainer = document.getElementById('equation-dots');

  let currentEqIndex = 0;
  let eqRotationInterval = null;

  function renderEquation(index) {
    if (!eqTarget) return;
    const item = equations[index];

    eqTarget.style.opacity = '0';
    eqTarget.style.transform = 'translateY(8px)';

    setTimeout(() => {
      if (typeof katex !== 'undefined') {
        katex.render(item.latex, eqTarget, {
          displayMode: true,
          throwOnError: false
        });
      } else {
        eqTarget.textContent = item.latex;
      }

      if (eqName) eqName.textContent = item.name;
      if (eqDesc) eqDesc.textContent = item.description;
      if (eqTag) eqTag.textContent = item.tag;

      if (eqDotsContainer) {
        eqDotsContainer.querySelectorAll('.eq-dot').forEach((dot, dIdx) => {
          dot.classList.toggle('active', dIdx === index);
        });
      }

      eqTarget.style.opacity = '1';
      eqTarget.style.transform = 'translateY(0)';
    }, 200);
  }

  if (eqDotsContainer) {
    eqDotsContainer.innerHTML = '';
    equations.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = `eq-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('title', equations[idx].name);
      dot.addEventListener('click', () => {
        currentEqIndex = idx;
        renderEquation(currentEqIndex);
        resetEqInterval();
      });
      eqDotsContainer.appendChild(dot);
    });
  }

  if (btnNextEq) {
    btnNextEq.addEventListener('click', () => {
      currentEqIndex = (currentEqIndex + 1) % equations.length;
      renderEquation(currentEqIndex);
      resetEqInterval();
    });
  }

  function resetEqInterval() {
    clearInterval(eqRotationInterval);
    eqRotationInterval = setInterval(() => {
      currentEqIndex = (currentEqIndex + 1) % equations.length;
      renderEquation(currentEqIndex);
    }, 9000);
  }

  if (eqTarget) {
    renderEquation(0);
    resetEqInterval();
  }

  /* ========================================================================
     7. 3D Hover Tilt Effect on Teaser Cards
     ======================================================================== */
  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (prefersReducedMotion) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -9;
      const rotateY = ((x - centerX) / centerX) * 9;

      card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

  /* ========================================================================
     8. GSAP Scroll-Reveal & Page Entrance Animations
     ======================================================================== */
  if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (document.querySelector('.universe-badge')) {
      heroTl.from('.universe-badge', { y: -20, opacity: 0, duration: 0.8, delay: 0.1 });
    }
    if (document.querySelector('.hero-title')) {
      heroTl.from('.hero-title', { y: 35, opacity: 0, duration: 1 }, '-=0.5');
    }
    if (document.querySelector('.hero-tagline')) {
      heroTl.from('.hero-tagline', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6');
    }
    if (document.querySelector('.hero-buttons')) {
      heroTl.from('.hero-buttons .btn-primary, .hero-buttons .btn-secondary', {
        y: 20,
        opacity: 0,
        stagger: 0.15,
        duration: 0.7
      }, '-=0.5');
    }
    if (document.querySelector('.hero-morph-indicator')) {
      heroTl.from('.hero-morph-indicator', { opacity: 0, duration: 0.8 }, '-=0.4');
    }

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.from('.stat-card', {
        scrollTrigger: {
          trigger: '.stats-section',
          start: 'top 85%'
        },
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.85,
        ease: 'power2.out'
      });

      gsap.from('.equation-card', {
        scrollTrigger: {
          trigger: '.equation-section',
          start: 'top 80%'
        },
        y: 45,
        opacity: 0,
        duration: 1,
        ease: 'power2.out'
      });

      gsap.from('.tilt-card', {
        scrollTrigger: {
          trigger: '.teasers-section',
          start: 'top 85%'
        },
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: 'power2.out'
      });
    }
  }

  /* ========================================================================
     9. ABOUT PAGE INITIALIZER (about.html)
     ======================================================================== */
  const missionGrid = document.getElementById('about-mission-grid');
  const timelineContainer = document.getElementById('about-timeline-list');
  const teamGrid = document.getElementById('about-team-grid');
  const storyContainer = document.getElementById('about-story-text');

  if (storyContainer && data.storyText) {
    storyContainer.textContent = data.storyText;
  }

  // Populate Mission Pillars
  if (missionGrid && Array.isArray(data.missionPillars)) {
    missionGrid.innerHTML = data.missionPillars.map(p => `
      <div class="mission-card">
        <div class="mission-icon">${p.icon}</div>
        <h3 class="mission-title">${p.title}</h3>
        <p class="mission-desc">${p.description}</p>
      </div>
    `).join('');
  }

  // Populate Vertical Animated Timeline
  if (timelineContainer && Array.isArray(data.timeline)) {
    timelineContainer.innerHTML = data.timeline.map((item, idx) => `
      <div class="timeline-item" data-index="${idx}">
        <div class="timeline-node" aria-hidden="true"></div>
        <div class="timeline-content">
          <span class="timeline-year">${item.year} &bull; ${item.badge}</span>
          <h3 class="timeline-heading">${item.title}</h3>
          <p class="timeline-desc">${item.description}</p>
        </div>
      </div>
    `).join('');

    // Timeline scroll progress bar tracker
    const timelineSection = document.querySelector('.timeline-section');
    const progressBar = document.getElementById('timeline-progress-bar');
    if (timelineSection && progressBar) {
      window.addEventListener('scroll', () => {
        const rect = timelineSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalHeight = rect.height;
        const startOffset = windowHeight * 0.65;
        const currentY = startOffset - rect.top;

        let pct = (currentY / totalHeight) * 100;
        pct = Math.max(0, Math.min(100, pct));
        progressBar.style.height = `${pct}%`;

        // Highlight active nodes
        const items = timelineContainer.querySelectorAll('.timeline-item');
        items.forEach(el => {
          const itemRect = el.getBoundingClientRect();
          if (itemRect.top < windowHeight * 0.7) {
            el.classList.add('active-node');
          } else {
            el.classList.remove('active-node');
          }
        });
      }, { passive: true });
    }
  }

  // Populate Team Members Grid (Hover 3D Tilt Cards)
  if (teamGrid && Array.isArray(data.team)) {
    teamGrid.innerHTML = data.team.map(m => `
      <div class="team-card tilt-card" id="${m.id}">
        <div class="team-avatar" style="background: ${m.gradient};">
          ${m.initials}
        </div>
        <h3 class="team-name">${m.name}</h3>
        <span class="team-role">${m.role}</span>
        <p class="team-bio">${m.bio}</p>
      </div>
    `).join('');

    // Attach 3D tilt to team cards
    teamGrid.querySelectorAll('.team-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        if (prefersReducedMotion) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  /* ========================================================================
     10. EVENTS PAGE INITIALIZER (events.html)
     ======================================================================== */
  const eventsGrid = document.getElementById('events-grid');
  const searchInput = document.getElementById('events-search-input');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const eventModal = document.getElementById('event-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalRegisterBtn = document.getElementById('btn-modal-register');
  const registrationNotice = document.getElementById('modal-reg-notice');

  let activeFilter = 'all';
  let searchQuery = '';

  // Live Countdown Timer for Next Upcoming Event
  if (Array.isArray(data.events)) {
    const upcomingEvents = data.events.filter(e => e.status === 'upcoming');
    const nextEvent = upcomingEvents[0];

    if (nextEvent && document.getElementById('next-event-title')) {
      document.getElementById('next-event-title').textContent = nextEvent.title;
      document.getElementById('next-event-date').textContent = nextEvent.dateStr;
      document.getElementById('next-event-venue').textContent = nextEvent.venue;

      const targetTime = new Date(nextEvent.dateTimeISO).getTime();

      function updateCountdown() {
        const now = Date.now();
        const diff = Math.max(0, targetTime - now);

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        const dEl = document.getElementById('timer-days');
        const hEl = document.getElementById('timer-hours');
        const mEl = document.getElementById('timer-minutes');
        const sEl = document.getElementById('timer-seconds');

        if (dEl) dEl.textContent = String(days).padStart(2, '0');
        if (hEl) hEl.textContent = String(hours).padStart(2, '0');
        if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
        if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
      }

      updateCountdown();
      setInterval(updateCountdown, 1000);
    }
  }

  // Render Event Cards
  function renderEvents() {
    if (!eventsGrid || !Array.isArray(data.events)) return;

    const filtered = data.events.filter(item => {
      const matchesTab = activeFilter === 'all' || item.status === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.venue.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });

    if (filtered.length === 0) {
      eventsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-family: var(--font-heading); font-size: 1.3rem; color: var(--text-pure); margin-bottom: 0.5rem;">No Events Found</h3>
          <p>No matching competitions or workshops match your search. Try resetting the filters.</p>
        </div>
      `;
      return;
    }

    eventsGrid.innerHTML = filtered.map(item => `
      <div class="event-card" data-event-id="${item.id}">
        <div class="event-card-top">
          <div class="event-badge-row">
            <span class="event-category-pill">${item.category}</span>
            <div class="event-status-indicator">
              ${item.status === 'upcoming'
                ? '<span class="status-upcoming-dot"></span><span class="status-upcoming-text">Upcoming</span>'
                : '<span class="status-past-text">Past Event</span>'
              }
            </div>
          </div>
          <h3 class="event-title">${item.title}</h3>
          <div class="event-meta-info">
            <div class="event-meta-item"><span>📅</span> <span>${item.dateStr} &bull; ${item.time}</span></div>
            <div class="event-meta-item"><span>📍</span> <span>${item.venue}</span></div>
          </div>
          <p class="event-desc-snippet">${item.description}</p>
        </div>
        <div class="event-card-bottom">
          <span class="btn-view-event">View Details <span class="arrow">→</span></span>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--neon-gold);">${item.badge}</span>
        </div>
      </div>
    `).join('');

    // Add click listeners to cards to open modal
    eventsGrid.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-event-id');
        openEventModal(id);
      });
    });
  }

  function openEventModal(eventId) {
    if (!eventModal || !Array.isArray(data.events)) return;
    const item = data.events.find(e => e.id === eventId);
    if (!item) return;

    document.getElementById('modal-event-title').textContent = item.title;
    document.getElementById('modal-event-category').textContent = item.category;
    document.getElementById('modal-event-date').textContent = `${item.dateStr} • ${item.time}`;
    document.getElementById('modal-event-venue').textContent = item.venue;
    document.getElementById('modal-event-desc').textContent = item.description;
    document.getElementById('modal-event-details').textContent = item.details || '';

    if (registrationNotice) {
      registrationNotice.style.display = 'none';
    }

    eventModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeEventModal() {
    if (!eventModal) return;
    eventModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeEventModal);
  }

  if (eventModal) {
    eventModal.addEventListener('click', (e) => {
      if (e.target === eventModal) closeEventModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && eventModal.classList.contains('open')) {
        closeEventModal();
      }
    });
  }

  if (modalRegisterBtn && registrationNotice) {
    modalRegisterBtn.addEventListener('click', () => {
      registrationNotice.style.display = 'block';
      registrationNotice.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Filter tab events
  if (filterTabs.length > 0) {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.getAttribute('data-filter');
        renderEvents();
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderEvents();
    });
  }

  renderEvents();

  /* ========================================================================
     11. GALLERY PAGE INITIALIZER (gallery.html)
     ======================================================================== */
  const galleryGrid = document.getElementById('gallery-grid');
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxClose = document.getElementById('lightbox-close-btn');
  const btnLightboxPrev = document.getElementById('btn-lightbox-prev');
  const btnLightboxNext = document.getElementById('btn-lightbox-next');

  let currentLightboxIndex = 0;

  function getMathematicalSvg(type) {
    switch (type) {
      case 'golden-spiral':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="180" height="180" rx="12" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
          <rect x="25" y="25" width="92" height="92" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="4 2"/>
          <rect x="117" y="25" width="58" height="58" stroke="#22d3ee" stroke-width="1.5"/>
          <rect x="139" y="83" width="36" height="36" stroke="#fbbf24" stroke-width="1.5"/>
          <rect x="117" y="97" width="22" height="22" stroke="#ec4899" stroke-width="1.5"/>
          <path d="M 25 117 A 92 92 0 0 1 117 25 A 58 58 0 0 1 175 83 A 36 36 0 0 1 139 119 A 22 22 0 0 1 117 97 A 14 14 0 0 1 131 83" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round"/>
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee"/>
              <stop offset="50%" stop-color="#8b5cf6"/>
              <stop offset="100%" stop-color="#fbbf24"/>
            </linearGradient>
          </defs>
        </svg>`;
      case 'lorenz':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lorenzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#8b5cf6"/>
              <stop offset="50%" stop-color="#22d3ee"/>
              <stop offset="100%" stop-color="#ec4899"/>
            </linearGradient>
          </defs>
          <path d="M 100 130 C 60 170 20 120 40 70 C 60 20 95 60 100 100 C 105 60 140 20 160 70 C 180 120 140 170 100 130 Z" stroke="url(#lorenzGrad)" stroke-width="2.5" fill="none"/>
          <path d="M 100 125 C 70 155 35 115 50 78 C 65 40 92 70 100 95 C 108 70 135 40 150 78 C 165 115 130 155 100 125 Z" stroke="#22d3ee" stroke-width="1.2" opacity="0.6" fill="none"/>
          <path d="M 100 120 C 80 140 50 110 60 85 C 70 60 90 80 100 90 C 110 80 130 60 140 85 C 150 110 120 140 100 120 Z" stroke="#fbbf24" stroke-width="1" opacity="0.4" fill="none"/>
          <circle cx="100" cy="100" r="4" fill="#fbbf24"/>
        </svg>`;
      case 'mandelbrot':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="mandelGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.2"/>
              <stop offset="70%" stop-color="#8b5cf6" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="transparent"/>
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="85" fill="url(#mandelGrad)"/>
          <path d="M 115 100 C 145 60 85 45 65 75 C 45 105 65 125 115 100 Z" fill="rgba(139,92,246,0.3)" stroke="#8b5cf6" stroke-width="2"/>
          <circle cx="50" cy="100" r="22" fill="rgba(34,211,238,0.25)" stroke="#22d3ee" stroke-width="1.8"/>
          <circle cx="24" cy="100" r="6" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
          <circle cx="85" cy="62" r="12" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
          <circle cx="85" cy="138" r="12" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
          <line x1="18" y1="100" x2="8" y2="100" stroke="#fbbf24" stroke-width="1.5"/>
          <line x1="85" y1="50" x2="85" y2="35" stroke="#22d3ee" stroke-width="1.5"/>
          <line x1="85" y1="150" x2="85" y2="165" stroke="#22d3ee" stroke-width="1.5"/>
        </svg>`;
      case 'penrose':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="100,20 120,70 175,70 130,105 148,155 100,125 52,155 70,105 25,70 80,70" stroke="#8b5cf6" stroke-width="2" fill="rgba(139,92,246,0.15)"/>
          <polygon points="100,50 112,80 145,80 118,100 128,130 100,112 72,130 82,100 55,80 88,80" stroke="#22d3ee" stroke-width="1.8" fill="rgba(34,211,238,0.18)"/>
          <polygon points="100,75 106,90 122,90 109,100 114,115 100,106 86,115 91,100 78,90 94,90" stroke="#fbbf24" stroke-width="1.5" fill="rgba(251,191,36,0.2)"/>
          <circle cx="100" cy="100" r="70" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 3"/>
        </svg>`;
      case 'calabi-yau':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 30 100 Q 65 30 100 100 T 170 100" stroke="#22d3ee" stroke-width="2" fill="none"/>
          <path d="M 30 100 Q 65 170 100 100 T 170 100" stroke="#8b5cf6" stroke-width="2" fill="none"/>
          <path d="M 100 30 Q 30 65 100 100 T 100 170" stroke="#ec4899" stroke-width="1.8" fill="none"/>
          <path d="M 100 30 Q 170 65 100 100 T 100 170" stroke="#fbbf24" stroke-width="1.8" fill="none"/>
          <ellipse cx="100" cy="100" rx="60" ry="25" stroke="rgba(34,211,238,0.4)" stroke-dasharray="4 2"/>
          <ellipse cx="100" cy="100" rx="25" ry="60" stroke="rgba(139,92,246,0.4)" stroke-dasharray="4 2"/>
          <circle cx="100" cy="100" r="5" fill="#22d3ee"/>
        </svg>`;
      case 'torus-knot':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="100" cy="100" rx="75" ry="40" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
          <path d="M 60 70 C 80 30 140 40 150 90 C 160 140 90 170 50 130 C 10 90 70 40 120 60 C 170 80 150 150 100 160 C 50 170 30 110 70 80" stroke="url(#torusGrad)" stroke-width="3" stroke-linecap="round" fill="none"/>
          <defs>
            <linearGradient id="torusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee"/>
              <stop offset="50%" stop-color="#8b5cf6"/>
              <stop offset="100%" stop-color="#fbbf24"/>
            </linearGradient>
          </defs>
        </svg>`;
      case 'poincare':
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="75" stroke="#8b5cf6" stroke-width="2.5" fill="rgba(14,20,44,0.5)"/>
          <path d="M 25 100 A 53 53 0 0 0 100 175" stroke="#22d3ee" stroke-width="1.6" fill="none"/>
          <path d="M 100 175 A 53 53 0 0 0 175 100" stroke="#22d3ee" stroke-width="1.6" fill="none"/>
          <path d="M 175 100 A 53 53 0 0 0 100 25" stroke="#22d3ee" stroke-width="1.6" fill="none"/>
          <path d="M 100 25 A 53 53 0 0 0 25 100" stroke="#22d3ee" stroke-width="1.6" fill="none"/>
          <line x1="25" y1="100" x2="175" y2="100" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="3 3"/>
          <line x1="100" y1="25" x2="100" y2="175" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="3 3"/>
        </svg>`;
      case 'icosahedron':
      default:
        return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="100,25 165,65 165,135 100,175 35,135 35,65" stroke="#8b5cf6" stroke-width="2" fill="rgba(139,92,246,0.12)"/>
          <polygon points="100,60 140,85 140,115 100,140 60,115 60,85" stroke="#22d3ee" stroke-width="1.5" fill="rgba(34,211,238,0.15)"/>
          <line x1="100" y1="25" x2="100" y2="60" stroke="#fbbf24" stroke-width="1.5"/>
          <line x1="165" y1="65" x2="140" y2="85" stroke="#fbbf24" stroke-width="1.5"/>
          <line x1="165" y1="135" x2="140" y2="115" stroke="#fbbf24" stroke-width="1.5"/>
          <line x1="100" y1="175" x2="100" y2="140" stroke="#fbbf24" stroke-width="1.5"/>
          <line x1="35" y1="135" x2="60" y2="115" stroke="#fbbf24" stroke-width="1.5"/>
          <line x1="35" y1="65" x2="60" y2="85" stroke="#fbbf24" stroke-width="1.5"/>
          <circle cx="100" cy="100" r="82" stroke="rgba(251,191,36,0.3)" stroke-dasharray="2 4"/>
        </svg>`;
    }
  }

  if (galleryGrid && Array.isArray(data.gallery)) {
    galleryGrid.innerHTML = data.gallery.map((item, idx) => `
      <div class="gallery-card" data-index="${idx}">
        <div class="gallery-artwork-frame">
          ${getMathematicalSvg(item.svgType)}
        </div>
        <div class="gallery-card-content">
          <div>
            <div class="gallery-card-meta">
              <span class="gallery-category">${item.category}</span>
              <span class="gallery-date">${item.date}</span>
            </div>
            <h3 class="gallery-card-title">${item.title}</h3>
            <p class="gallery-card-desc">${item.description}</p>
          </div>
          <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--neon-cyan);">${item.badge}</span>
            <span style="font-size: 0.85rem; color: var(--text-muted);">View ↗</span>
          </div>
        </div>
      </div>
    `).join('');

    galleryGrid.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        openLightbox(idx);
      });
    });
  }

  function openLightbox(index) {
    if (!lightbox || !Array.isArray(data.gallery)) return;
    currentLightboxIndex = index;
    const item = data.gallery[index];

    document.getElementById('lightbox-title').textContent = item.title;
    document.getElementById('lightbox-category').textContent = item.category;
    document.getElementById('lightbox-badge').textContent = item.badge;
    document.getElementById('lightbox-desc').textContent = item.description;
    document.getElementById('lightbox-visual-target').innerHTML = getMathematicalSvg(item.svgType);
    document.getElementById('lightbox-counter').textContent = `${index + 1} of ${data.gallery.length}`;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    window.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') {
        currentLightboxIndex = (currentLightboxIndex - 1 + data.gallery.length) % data.gallery.length;
        openLightbox(currentLightboxIndex);
      }
      if (e.key === 'ArrowRight') {
        currentLightboxIndex = (currentLightboxIndex + 1) % data.gallery.length;
        openLightbox(currentLightboxIndex);
      }
    });
  }

  if (btnLightboxPrev) {
    btnLightboxPrev.addEventListener('click', () => {
      if (!Array.isArray(data.gallery)) return;
      currentLightboxIndex = (currentLightboxIndex - 1 + data.gallery.length) % data.gallery.length;
      openLightbox(currentLightboxIndex);
    });
  }

  if (btnLightboxNext) {
    btnLightboxNext.addEventListener('click', () => {
      if (!Array.isArray(data.gallery)) return;
      currentLightboxIndex = (currentLightboxIndex + 1) % data.gallery.length;
      openLightbox(currentLightboxIndex);
    });
  }

  /* ========================================================================
     12. CONTACT PAGE INITIALIZER (contact.html)
     ======================================================================== */
  const contactForm = document.getElementById('contact-form');
  const formSuccessBanner = document.getElementById('form-success-banner');
  const btnResetForm = document.getElementById('btn-reset-form');
  const faqAccordion = document.getElementById('faq-accordion');

  // Populate Contact details
  if (data.contact) {
    const emailEl = document.getElementById('contact-email-val');
    const phoneEl = document.getElementById('contact-phone-val');
    const officeEl = document.getElementById('contact-office-val');
    const hoursEl = document.getElementById('contact-hours-val');

    if (emailEl) emailEl.textContent = data.contact.email;
    if (phoneEl) phoneEl.textContent = data.contact.phone;
    if (officeEl) officeEl.textContent = data.contact.address;
    if (hoursEl) hoursEl.textContent = data.contact.hours;
  }

  // Populate FAQ Accordion
  if (faqAccordion && Array.isArray(data.faqs)) {
    faqAccordion.innerHTML = data.faqs.map(faq => `
      <details class="faq-item" name="mathverse-faq">
        <summary class="faq-summary">
          <span>${faq.question}</span>
          <span class="faq-chevron" aria-hidden="true">▼</span>
        </summary>
        <div class="faq-body">
          <p>${faq.answer}</p>
        </div>
      </details>
    `).join('');
  }

  // Form Client-side Validation and Animated Success Submission
  if (contactForm && formSuccessBanner) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      const nameInput = document.getElementById('form-name');
      const emailInput = document.getElementById('form-email');
      const subjectInput = document.getElementById('form-subject');
      const messageInput = document.getElementById('form-message');

      // Clear previous error states
      contactForm.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));

      if (!nameInput.value.trim()) {
        nameInput.closest('.form-group').classList.add('has-error');
        isValid = false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
        emailInput.closest('.form-group').classList.add('has-error');
        isValid = false;
      }

      if (!subjectInput.value.trim()) {
        subjectInput.closest('.form-group').classList.add('has-error');
        isValid = false;
      }

      if (!messageInput.value.trim()) {
        messageInput.closest('.form-group').classList.add('has-error');
        isValid = false;
      }

      if (isValid) {
        contactForm.style.display = 'none';
        formSuccessBanner.style.display = 'block';
        formSuccessBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    if (btnResetForm) {
      btnResetForm.addEventListener('click', () => {
        contactForm.reset();
        contactForm.style.display = 'block';
        formSuccessBanner.style.display = 'none';
      });
    }
  }
});
