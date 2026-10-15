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
     2.1 Member Account Nav State & Dropdown
     ======================================================================== */
  function initMemberNavState() {
    const token = localStorage.getItem('mathverse_member_token');
    const userJson = localStorage.getItem('mathverse_member_user');
    const joinBtns = document.querySelectorAll('.btn-nav-join');

    if (!token || !userJson) {
      // If not logged in, point "Join the Club" buttons to member-login.html
      joinBtns.forEach(btn => {
        btn.setAttribute('href', 'member-login.html');
      });
      return;
    }

    let member;
    try {
      member = JSON.parse(userJson);
    } catch (e) {
      localStorage.removeItem('mathverse_member_token');
      localStorage.removeItem('mathverse_member_user');
      return;
    }

    const firstName = member.name ? member.name.split(' ')[0] : 'Member';
    const initials = member.name ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'MV';

    // Update desktop button
    const desktopJoinBtn = document.querySelector('.nav-actions .btn-nav-join');
    if (desktopJoinBtn) {
      const container = document.createElement('div');
      container.className = 'nav-user-dropdown';
      container.id = 'nav-user-menu';
      container.innerHTML = `
        <button class="btn-nav-member" id="btn-nav-user-toggle" aria-expanded="false" aria-haspopup="true">
          <span class="nav-member-avatar">${initials}</span>
          <span class="nav-member-name">${firstName}</span>
          <span style="font-size: 0.72rem; opacity: 0.7;">▼</span>
        </button>
        <div class="nav-dropdown-menu" id="nav-user-dropdown-panel" role="menu">
          <div style="padding: 0.75rem 1.2rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div style="font-weight: 700; color: #fff; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${member.name}</div>
            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--neon-cyan);">${member.member_code}</div>
          </div>
          <a href="profile.html?code=${encodeURIComponent(member.member_code)}" class="nav-dropdown-item" role="menuitem">
            <span>👤</span> My Profile & Badges
          </a>
          <a href="leaderboard.html" class="nav-dropdown-item" role="menuitem">
            <span>🏆</span> Season Leaderboard
          </a>
          <div class="nav-dropdown-divider"></div>
          <button type="button" id="btn-nav-logout" class="nav-dropdown-item" style="color: #fca5a5;" role="menuitem">
            <span>🚪</span> Log Out
          </button>
        </div>
      `;
      desktopJoinBtn.replaceWith(container);

      const toggle = container.querySelector('#btn-nav-user-toggle');
      const panel = container.querySelector('#nav-user-dropdown-panel');
      const logoutBtn = container.querySelector('#btn-nav-logout');

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = panel.classList.contains('open');
        panel.classList.toggle('open', !isOpen);
        toggle.setAttribute('aria-expanded', !isOpen);
      });

      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          panel.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });

      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await fetch('/api/members/logout', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (err) {
            console.error('Logout error:', err);
          }
          localStorage.removeItem('mathverse_member_token');
          localStorage.removeItem('mathverse_member_user');
          window.location.reload();
        });
      }
    }

    // Update mobile menu join button
    const mobileJoinBtn = document.querySelector('#mobile-menu .btn-nav-join');
    if (mobileJoinBtn) {
      const mobileMemberBox = document.createElement('div');
      mobileMemberBox.style.cssText = 'padding: 1rem 2rem; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; display: flex; flex-direction: column; gap: 0.75rem;';
      mobileMemberBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="nav-member-avatar" style="width: 36px; height: 36px; font-size: 0.9rem;">${initials}</span>
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 1rem;">${member.name}</div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--neon-cyan);">${member.member_code}</div>
          </div>
        </div>
        <a href="profile.html?code=${encodeURIComponent(member.member_code)}" class="btn-primary" style="justify-content: center; padding: 0.7rem;">
          <span>👤 View Profile</span>
        </a>
        <button type="button" id="btn-mobile-nav-logout" class="btn-secondary" style="border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; justify-content: center; padding: 0.65rem;">
          <span>🚪 Log Out</span>
        </button>
      `;
      mobileJoinBtn.replaceWith(mobileMemberBox);

      const mobileLogout = mobileMemberBox.querySelector('#btn-mobile-nav-logout');
      if (mobileLogout) {
        mobileLogout.addEventListener('click', async () => {
          try {
            await fetch('/api/members/logout', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (err) {}
          localStorage.removeItem('mathverse_member_token');
          localStorage.removeItem('mathverse_member_user');
          window.location.reload();
        });
      }
    }
  }

  initMemberNavState();

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
  const whatWeDoGrid = document.getElementById('about-what-we-do-grid');
  const teamGrid = document.getElementById('about-team-grid');

  // Populate What We Do Grid dynamically from data.js if empty
  if (whatWeDoGrid && Array.isArray(data.whatWeDo) && whatWeDoGrid.children.length === 0) {
    whatWeDoGrid.innerHTML = data.whatWeDo.map(item => `
      <div class="what-we-do-card">
        <div class="what-we-do-icon">${item.icon}</div>
        <h3 class="what-we-do-title">${item.title}</h3>
        <p class="what-we-do-desc">${item.description}</p>
      </div>
    `).join('');
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

  // Modal Views & Controls
  const modalViewDetails = document.getElementById('modal-view-details');
  const modalViewForm = document.getElementById('modal-view-form');
  const modalViewTicket = document.getElementById('modal-view-ticket');
  const btnModalOpenForm = document.getElementById('btn-modal-open-form');
  const btnBackToDetails = document.getElementById('btn-back-to-details');
  const formEventSubtitle = document.getElementById('form-event-subtitle');
  const regForm = document.getElementById('event-registration-form');
  const regFormError = document.getElementById('reg-form-error');
  const btnSubmitRegistration = document.getElementById('btn-submit-registration');
  const modalTicketContainer = document.getElementById('modal-ticket-container');
  const btnDownloadModalTicket = document.getElementById('btn-download-modal-ticket');
  const btnViewTicketPage = document.getElementById('btn-view-ticket-page');

  let activeFilter = 'upcoming';
  let searchQuery = '';
  let eventsData = [];

  // Reusable Canvas Ticket Downloader
  window.downloadTicketAsCanvas = function(ticket, qrDataUrl) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 460;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 460);
    bgGrad.addColorStop(0, '#0a0e28');
    bgGrad.addColorStop(1, '#050713');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 460);

    // Accent top border
    const topGrad = ctx.createLinearGradient(0, 0, 800, 0);
    topGrad.addColorStop(0, '#22d3ee');
    topGrad.addColorStop(0.5, '#8b5cf6');
    topGrad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 800, 6);

    // Header branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Space Grotesk", sans-serif';
    ctx.fillText('MathVerse Official Event Entry Pass', 40, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('College Mathematics Club • Verified Credential', 40, 75);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(760, 95);
    ctx.stroke();
    ctx.setLineDash([]);

    // Event title
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 24px "Space Grotesk", sans-serif';
    const evTitle = ticket.event_title || (ticket.event && ticket.event.title) || 'Event Pass';
    ctx.fillText(evTitle, 40, 140);

    // Metadata entries
    function drawMeta(label, val, x, y) {
      ctx.fillStyle = '#8b5cf6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(label.toUpperCase(), x, y);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '15px "Space Grotesk", sans-serif';
      ctx.fillText(val || '—', x, y + 22);
    }

    drawMeta('Attendee Name', ticket.name, 40, 185);
    drawMeta('Enrollment ID', ticket.enrollment_no, 260, 185);
    const dateStr = ticket.event_date || (ticket.event && ticket.event.date) || '';
    const timeStr = ticket.event_time || (ticket.event && ticket.event.time) || '';
    drawMeta('Date & Time', `${dateStr} • ${timeStr}`, 40, 255);
    drawMeta('Venue', ticket.event_venue || (ticket.event && ticket.event.venue) || '', 260, 255);
    drawMeta('Branch / Major', ticket.branch, 40, 325);
    drawMeta('Academic Year', ticket.year, 260, 325);
    drawMeta('Ticket Code', ticket.ticket_code, 40, 395);

    // QR Code Container
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(550, 120, 200, 240, 16);
      ctx.fill();

      ctx.drawImage(qrImg, 565, 135, 170, 170);

      ctx.fillStyle = '#080c1f';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ticket.ticket_code, 650, 335);

      const link = document.createElement('a');
      link.download = `MathVerse-Ticket-${ticket.ticket_code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImg.src = qrDataUrl;
  };

  let countdownTimerInterval = null;

  // Live Countdown Timer for Next Upcoming Event
  function initUpcomingCountdown(events) {
    if (countdownTimerInterval) {
      clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
    }

    const titleEl = document.getElementById('next-event-title');
    const dateEl = document.getElementById('next-event-date');
    const venueEl = document.getElementById('next-event-venue');
    const metaRowEl = document.getElementById('next-event-meta-row');
    const timerContainer = document.getElementById('countdown-timer-container');
    const registerBtn = document.getElementById('btn-next-event-register');

    if (!titleEl) return;

    const now = Date.now();
    const upcomingEvents = (events || [])
      .filter(e => {
        if (e.status !== 'upcoming') return false;
        if (e.dateTimeISO) {
          const t = new Date(e.dateTimeISO).getTime();
          return !isNaN(t) && t > now;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.dateTimeISO ? new Date(a.dateTimeISO).getTime() : 0;
        const timeB = b.dateTimeISO ? new Date(b.dateTimeISO).getTime() : 0;
        return timeA - timeB;
      });

    const nextEvent = upcomingEvents[0];

    if (!nextEvent) {
      // Friendly message when there are no upcoming events
      titleEl.textContent = 'New events coming soon';
      if (metaRowEl) {
        metaRowEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.95rem;">✦ Stay tuned! We are preparing our next round of quizzes, workshops, and competitions.</span>';
      }
      if (registerBtn) registerBtn.style.display = 'none';

      if (timerContainer) {
        timerContainer.innerHTML = `
          <div style="background: rgba(9, 13, 31, 0.7); border: 1px dashed rgba(34, 211, 238, 0.35); border-radius: 20px; padding: 1.5rem; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">✦</div>
            <div style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--neon-cyan); font-weight: 700; margin-bottom: 0.25rem;">New events coming soon</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Check back soon for new club events, workshops, and tournament registrations.</p>
          </div>
        `;
      }
      return;
    }

    // Nearest upcoming event found
    titleEl.textContent = nextEvent.title;
    if (dateEl) dateEl.textContent = `${nextEvent.dateStr || nextEvent.date} • ${nextEvent.time || ''}`;
    if (venueEl) venueEl.textContent = nextEvent.venue;

    if (registerBtn) {
      registerBtn.style.display = 'inline-flex';
      const isSoldOut = Boolean(nextEvent.is_sold_out || (nextEvent.capacity > 0 && nextEvent.registered_count >= nextEvent.capacity));
      if (isSoldOut) {
        registerBtn.innerHTML = '<span>Capacity Reached (Sold Out)</span>';
        registerBtn.style.opacity = '0.6';
        registerBtn.disabled = true;
      } else {
        registerBtn.innerHTML = '<span>Register for ' + (nextEvent.title || 'Event') + '</span> <span aria-hidden="true">→</span>';
        registerBtn.style.opacity = '1';
        registerBtn.disabled = false;
        registerBtn.onclick = () => openEventModal(nextEvent.id);
      }
    }

    // Restore timer grid in timerContainer if needed
    if (timerContainer && !document.getElementById('timer-days')) {
      timerContainer.innerHTML = `
        <div class="timer-grid" id="timer-grid">
          <div class="timer-box">
            <div id="timer-days" class="timer-digits">00</div>
            <div class="timer-unit">Days</div>
          </div>
          <div class="timer-box">
            <div id="timer-hours" class="timer-digits">00</div>
            <div class="timer-unit">Hours</div>
          </div>
          <div class="timer-box">
            <div id="timer-minutes" class="timer-digits">00</div>
            <div class="timer-unit">Mins</div>
          </div>
          <div class="timer-box">
            <div id="timer-seconds" class="timer-digits">00</div>
            <div class="timer-unit">Secs</div>
          </div>
        </div>
      `;
    }

    const targetTime = new Date(nextEvent.dateTimeISO).getTime();

    function updateCountdown() {
      const curNow = Date.now();
      const diff = Math.max(0, targetTime - curNow);

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

      if (diff <= 0) {
        clearInterval(countdownTimerInterval);
        countdownTimerInterval = null;
        initUpcomingCountdown(eventsData);
      }
    }

    updateCountdown();
    countdownTimerInterval = setInterval(updateCountdown, 1000);
  }

  // Fetch /api/events with fallback to data.js
  async function loadEventsData() {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.events) && json.events.length > 0) {
          eventsData = json.events.map(ev => {
            // Merge with data.js details if present
            const staticItem = Array.isArray(data.events) ? data.events.find(d => d.id === ev.id) : null;
            return {
              ...ev,
              dateStr: ev.date,
              dateTimeISO: ev.date_iso || ev.dateTimeISO || (staticItem ? staticItem.dateTimeISO : null),
              badge: ev.badge || (staticItem ? staticItem.badge : 'Official'),
              details: ev.details || (staticItem ? staticItem.details : '')
            };
          });
          return;
        }
      }
    } catch (err) {
      console.warn('[MathVerse Events] API fetch failed, falling back to data.js:', err.message);
    }

    // Fallback to data.js
    if (Array.isArray(data.events)) {
      eventsData = data.events.map(e => ({
        ...e,
        capacity: e.capacity || 60,
        registered_count: 0,
        seats_left: e.capacity || 60,
        is_sold_out: 0
      }));
    }
  }

  // Render Event Cards with Capacity Progress Bar & Sold Out State
  function renderEvents() {
    if (!eventsGrid || !Array.isArray(eventsData)) return;

    const filtered = eventsData.filter(item => {
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
          <p>No matching competitions or workshops match your query. Try resetting the filters.</p>
        </div>
      `;
      return;
    }

    eventsGrid.innerHTML = filtered.map(item => {
      const pct = item.capacity > 0 ? Math.round((item.registered_count / item.capacity) * 100) : 0;
      const isSoldOut = Boolean(item.is_sold_out || (item.capacity > 0 && item.registered_count >= item.capacity));

      return `
        <div class="event-card" data-event-id="${item.id}">
          <div class="event-card-top">
            <div class="event-badge-row">
              <span class="event-category-pill">${item.category}</span>
              <div class="event-status-indicator">
                ${isSoldOut
                  ? '<span class="ticket-badge badge-sold-out" style="font-size: 0.72rem; font-weight: 700;">SOLD OUT</span>'
                  : (item.status === 'upcoming'
                    ? '<span class="status-upcoming-dot"></span><span class="status-upcoming-text">Upcoming</span>'
                    : `<span class="status-past-text">Past Event</span>${(item.feedback_count >= 3 && item.avg_rating) ? ` <span class="ticket-badge" style="background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; font-size: 0.75rem; margin-left: 0.35rem;" title="${item.feedback_count} verified attendee reviews">★ ${Number(item.avg_rating).toFixed(1)} (${item.feedback_count})</span>` : ''}`
                  )
                }
              </div>
            </div>
            <h3 class="event-title">${item.title}</h3>
            <div class="event-meta-info">
              <div class="event-meta-item"><span>📅</span> <span>${item.dateStr || item.date} &bull; ${item.time || ''}</span></div>
              <div class="event-meta-item"><span>📍</span> <span>${item.venue}</span></div>
            </div>
            <p class="event-desc-snippet">${item.description}</p>
          </div>

          <!-- Capacity Bar Section -->
          <div class="event-capacity-container">
            <div class="capacity-text-row">
              <span class="capacity-seats-label"><strong>${item.registered_count}</strong> / ${item.capacity} seats filled</span>
              <span>${isSoldOut ? '<strong style="color: #fca5a5;">Sold Out</strong>' : `${item.seats_left} seats left`}</span>
            </div>
            <div class="capacity-bar-track">
              <div class="capacity-bar-fill ${isSoldOut ? 'fill-full' : (pct >= 80 ? 'fill-warning' : '')}" style="width: ${Math.min(100, pct)}%;"></div>
            </div>
          </div>

          <div class="event-card-bottom">
            <span class="btn-view-event">${isSoldOut ? 'View Pass Info' : 'Register Now'} <span class="arrow">→</span></span>
            <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--neon-gold);">${item.badge || 'Official'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards to open modal
    eventsGrid.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-event-id');
        openEventModal(id);
      });
    });
  }

  // Open Event Modal with Multi-View Handling
  function openEventModal(eventId) {
    if (!eventModal || !Array.isArray(eventsData)) return;
    const item = eventsData.find(e => e.id === eventId);
    if (!item) return;

    // Reset views to Details View
    if (modalViewDetails) modalViewDetails.classList.add('active');
    if (modalViewForm) modalViewForm.classList.remove('active');
    if (modalViewTicket) modalViewTicket.classList.remove('active');
    if (regFormError) regFormError.style.display = 'none';

    // Populate Details View
    const isSoldOut = Boolean(item.is_sold_out || (item.capacity > 0 && item.registered_count >= item.capacity));
    
    document.getElementById('modal-event-title').textContent = item.title;
    document.getElementById('modal-event-category').textContent = item.category;
    document.getElementById('modal-event-date').textContent = `${item.dateStr || item.date} • ${item.time || ''}`;
    document.getElementById('modal-event-venue').textContent = item.venue;
    document.getElementById('modal-event-capacity').textContent = `${item.registered_count} / ${item.capacity} seats filled ${isSoldOut ? '(Sold Out)' : `(${item.seats_left} seats remaining)`}`;
    document.getElementById('modal-event-desc').textContent = item.description;
    document.getElementById('modal-event-details').textContent = item.details || 'Registration includes access to competitive rounds, problem booklets, and refreshments.';

    // Configure Register button on details view
    if (btnModalOpenForm) {
      if (isSoldOut) {
        btnModalOpenForm.innerHTML = '<span>Capacity Reached (Sold Out)</span>';
        btnModalOpenForm.style.opacity = '0.5';
        btnModalOpenForm.disabled = true;
      } else {
        btnModalOpenForm.innerHTML = '<span>Register for Event</span> <span aria-hidden="true">→</span>';
        btnModalOpenForm.style.opacity = '1';
        btnModalOpenForm.disabled = false;
      }
    }

    // Set hidden field on form
    const regEventIdInput = document.getElementById('reg-event-id');
    if (regEventIdInput) regEventIdInput.value = item.id;
    if (formEventSubtitle) formEventSubtitle.textContent = `Registering for: ${item.title}`;

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

  // Switch to Registration Form View
  if (btnModalOpenForm) {
    btnModalOpenForm.addEventListener('click', () => {
      if (btnModalOpenForm.disabled) return;
      if (modalViewDetails) modalViewDetails.classList.remove('active');
      if (modalViewForm) modalViewForm.classList.add('active');
    });
  }

  // Switch Back to Details View
  if (btnBackToDetails) {
    btnBackToDetails.addEventListener('click', () => {
      if (modalViewForm) modalViewForm.classList.remove('active');
      if (modalViewDetails) modalViewDetails.classList.add('active');
    });
  }

  // Handle Event Registration Form Submission
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (regFormError) regFormError.style.display = 'none';

      const eventId = document.getElementById('reg-event-id').value;
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const enrollmentNo = document.getElementById('reg-enrollment').value.trim();
      const branch = document.getElementById('reg-branch').value;
      const year = document.getElementById('reg-year').value;

      // Validation
      if (!name || !email || !phone || !enrollmentNo || !branch || !year) {
        showFormError('Please fill out all required fields before submitting.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showFormError('Please enter a valid email address.');
        return;
      }

      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        showFormError('Please enter a valid phone number with at least 7 digits.');
        return;
      }

      // Submit Registration to Server
      if (btnSubmitRegistration) {
        btnSubmitRegistration.disabled = true;
        btnSubmitRegistration.innerHTML = '<span>Processing Ticket & QR...</span>';
      }

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            name,
            email,
            phone,
            enrollment_no: enrollmentNo,
            branch,
            year
          })
        });

        const data = await res.json();

        if (res.status === 409) {
          const ticketLink = data.existing_ticket_code
            ? `<br><a href="ticket.html?code=${encodeURIComponent(data.existing_ticket_code)}" target="_blank" style="color: var(--neon-cyan); text-decoration: underline; margin-top: 0.5rem; display: inline-block;">View Your Existing Ticket Pass (${data.existing_ticket_code}) ↗</a>`
            : '';
          showFormError(`${data.error}${ticketLink}`);
          return;
        }

        if (!res.ok || !data.success) {
          showFormError(data.error || 'Registration failed. Please try again.');
          return;
        }

        // Registration successful! Switch to Ticket Pass View
        const ticket = data.ticket;
        const qrCodeUrl = data.qr_code;

        if (modalTicketContainer) {
          modalTicketContainer.innerHTML = `
            <div class="ticket-pass">
              <div class="ticket-header">
                <div class="ticket-brand">
                  <span class="brand-glyph">∫</span>
                  <span>Math<span style="color: var(--neon-cyan);">Verse</span> Pass</span>
                </div>
                <span class="ticket-badge">${ticket.event.category || 'Official Entry'}</span>
              </div>
              <div class="ticket-body">
                <div>
                  <h4 class="ticket-event-name">${ticket.event.title}</h4>
                  <div class="ticket-meta-grid">
                    <div class="ticket-meta-item">
                      <label>Attendee</label>
                      <p>${ticket.name}</p>
                    </div>
                    <div class="ticket-meta-item">
                      <label>Enrollment ID</label>
                      <p>${ticket.enrollment_no}</p>
                    </div>
                    <div class="ticket-meta-item">
                      <label>Date & Time</label>
                      <p>${ticket.event.date} • ${ticket.event.time || ''}</p>
                    </div>
                    <div class="ticket-meta-item">
                      <label>Venue</label>
                      <p>${ticket.event.venue}</p>
                    </div>
                    <div class="ticket-meta-item">
                      <label>Branch</label>
                      <p>${ticket.branch}</p>
                    </div>
                    <div class="ticket-meta-item">
                      <label>Year</label>
                      <p>${ticket.year}</p>
                    </div>
                  </div>
                </div>
                <div class="ticket-qr-box">
                  <img src="${qrCodeUrl}" alt="Ticket QR Code" class="ticket-qr-img">
                  <span class="ticket-code-label">${ticket.ticket_code}</span>
                </div>
              </div>
              <div class="ticket-footer">
                <span>Pass Code: <strong style="color: var(--neon-gold); font-family: var(--font-mono);">${ticket.ticket_code}</strong></span>
                <span>Issued: ${new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          `;
        }

        if (btnDownloadModalTicket) {
          btnDownloadModalTicket.onclick = () => {
            window.downloadTicketAsCanvas(ticket, qrCodeUrl);
          };
        }

        if (btnViewTicketPage) {
          btnViewTicketPage.href = `ticket.html?code=${encodeURIComponent(ticket.ticket_code)}`;
        }

        if (modalViewForm) modalViewForm.classList.remove('active');
        if (modalViewTicket) modalViewTicket.classList.add('active');

        // Reset form inputs
        regForm.reset();

        // Update local event count & refresh cards
        const ev = eventsData.find(e => e.id === eventId);
        if (ev) {
          ev.registered_count = (ev.registered_count || 0) + 1;
          ev.seats_left = Math.max(0, ev.capacity - ev.registered_count);
          if (ev.registered_count >= ev.capacity) ev.is_sold_out = 1;
          renderEvents();
        }

      } catch (err) {
        showFormError('Network communication error during registration. Please verify connection.');
      } finally {
        if (btnSubmitRegistration) {
          btnSubmitRegistration.disabled = false;
          btnSubmitRegistration.innerHTML = '<span>Confirm & Generate Digital Ticket ✦</span>';
        }
      }
    });
  }

  function showFormError(msg) {
    if (regFormError) {
      regFormError.innerHTML = msg;
      regFormError.style.display = 'block';
      regFormError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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

  // Socket.IO real-time capacity listener for Events page
  if (typeof io !== 'undefined') {
    try {
      const socket = io();
      socket.on('event:registered', (payload) => {
        if (Array.isArray(eventsData) && payload && payload.event_id) {
          const match = eventsData.find(e => e.id === payload.event_id);
          if (match) {
            match.registered_count = payload.new_registered_count;
            match.capacity = payload.capacity;
            match.seats_left = Math.max(0, payload.capacity - payload.new_registered_count);
            if (payload.new_registered_count >= payload.capacity) {
              match.is_sold_out = 1;
            }
            renderEvents();
          }
        }
      });
    } catch (e) {
      // ignore
    }
  }

  // Initialize Events Page
  if (eventsGrid) {
    loadEventsData().then(() => {
      initUpcomingCountdown(eventsData);
      renderEvents();
    });
  }

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

  /* ========================================================================
     Phase 7 Signature Touch 1: Back-To-Top Rocket Button
     ======================================================================== */
  let btnBackToTop = document.getElementById('btn-back-to-top');
  if (!btnBackToTop) {
    btnBackToTop = document.createElement('button');
    btnBackToTop.id = 'btn-back-to-top';
    btnBackToTop.type = 'button';
    btnBackToTop.setAttribute('aria-label', 'Scroll back to top');
    btnBackToTop.setAttribute('title', 'Launch back to top');
    btnBackToTop.innerHTML = '<span class="rocket-icon" aria-hidden="true">🚀</span>';
    document.body.appendChild(btnBackToTop);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btnBackToTop.classList.add('visible');
    } else {
      btnBackToTop.classList.remove('visible');
    }
  }, { passive: true });

  btnBackToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ========================================================================
     Nav & Action Button Press / Ripple Feedback (with reduced motion check)
     ======================================================================== */
  // Ensure aria-current="page" on all active links
  document.querySelectorAll('.nav-link.active, .mobile-link.active').forEach(el => {
    el.setAttribute('aria-current', 'page');
  });

  const rippleTargets = '.nav-link, .mobile-link, .btn-nav-join, .btn-primary, .btn-secondary, .btn-rotate-equation';

  document.addEventListener('pointerdown', (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = e.target.closest(rippleTargets);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'button-ripple-effect';
    const size = Math.max(rect.width, rect.height) * 2.2;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 600);
  });

  /* ========================================================================
     Phase 7 Signature Touch 2: Animated First-Visit Loading Screen
     ======================================================================== */
  try {
    const hasVisited = sessionStorage.getItem('mathverse_intro_seen');
    if (!hasVisited) {
      const loader = document.createElement('div');
      loader.id = 'first-visit-loader';
      loader.setAttribute('role', 'status');
      loader.setAttribute('aria-label', 'Initializing Mathematics Club Universe');
      loader.innerHTML = `
        <div class="loader-logo-wrapper">
          <img src="/images/club-logo.jpeg" alt="Mathematics Club MITS Gwalior logo" class="loader-logo-img">
        </div>
        <div class="loader-text">
          <span class="loader-sparkle">✦</span>
          <span>Mathematics Club &bull; MITS Gwalior</span>
          <span class="loader-sparkle">✦</span>
        </div>
      `;
      document.body.appendChild(loader);

      setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 600);
      }, 1200);

      sessionStorage.setItem('mathverse_intro_seen', 'true');
    }
  } catch (e) {
    // sessionStorage fallback
  }

  /* ========================================================================
     Phase 7 Signature Touch 3: Hidden Easter Egg (Konami or "pi")
     Opens interactive full-screen Mandelbrot Fractal Explorer
     ======================================================================== */
  const konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let keyIndex = 0;
  let recentKeys = '';

  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    // Check Konami Code
    const expected = konamiSeq[keyIndex];
    if (e.key === expected || (expected && expected.length === 1 && e.key.toLowerCase() === expected.toLowerCase())) {
      keyIndex++;
      if (keyIndex === konamiSeq.length) {
        keyIndex = 0;
        openMandelbrot();
        return;
      }
    } else {
      keyIndex = 0;
      if (e.key === konamiSeq[0]) keyIndex = 1;
    }

    // Check "pi"
    if (e.key && e.key.length === 1) {
      recentKeys = (recentKeys + e.key.toLowerCase()).slice(-2);
      if (recentKeys === 'pi') {
        recentKeys = '';
        openMandelbrot();
      }
    }
  });

  let mandelbrotOverlay = null;
  let mandelbrotCanvas = null;
  let mandelbrotCtx = null;
  let mbCenterX = -0.7;
  let mbCenterY = 0.0;
  let mbScale = 2.8;
  const mbMaxIter = 90;

  function openMandelbrot() {
    if (!mandelbrotOverlay) {
      mandelbrotOverlay = document.createElement('div');
      mandelbrotOverlay.id = 'mandelbrot-overlay';
      mandelbrotOverlay.innerHTML = `
        <div class="mandelbrot-hud">
          <div class="mandelbrot-hud-title">
            <span style="color: var(--neon-cyan);">✦</span>
            <span>Mandelbrot Universe Fractal</span>
          </div>
          <div class="mandelbrot-hud-stats">
            <span id="mb-center-label">Center: -0.7000 + 0.0000i</span>
            <span id="mb-zoom-label">Zoom: 1.0x</span>
          </div>
          <div class="mandelbrot-hud-hints">
            <span>🖱️ Click: Zoom In</span>
            <span>Right-Click: Zoom Out</span>
            <span>⌨️ ESC: Exit</span>
          </div>
          <button type="button" class="mandelbrot-btn-close" id="btn-close-mb">Close &times;</button>
        </div>
        <canvas id="mandelbrot-canvas"></canvas>
      `;
      document.body.appendChild(mandelbrotOverlay);

      mandelbrotCanvas = document.getElementById('mandelbrot-canvas');
      mandelbrotCtx = mandelbrotCanvas.getContext('2d');

      document.getElementById('btn-close-mb').addEventListener('click', closeMandelbrot);

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mandelbrotOverlay && mandelbrotOverlay.classList.contains('open')) {
          closeMandelbrot();
        }
      });

      mandelbrotCanvas.addEventListener('click', (e) => {
        const rect = mandelbrotCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const w = mandelbrotCanvas.width;
        const h = mandelbrotCanvas.height;
        const aspect = w / h;

        const realMin = mbCenterX - (mbScale * aspect) / 2;
        const imagMin = mbCenterY - mbScale / 2;

        mbCenterX = realMin + (mouseX / w) * (mbScale * aspect);
        mbCenterY = imagMin + (mouseY / h) * mbScale;
        mbScale *= 0.45;

        renderMandelbrot();
      });

      mandelbrotCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        mbScale /= 0.45;
        renderMandelbrot();
      });

      window.addEventListener('resize', () => {
        if (mandelbrotOverlay && mandelbrotOverlay.classList.contains('open')) {
          resizeMandelbrotCanvas();
          renderMandelbrot();
        }
      });
    }

    mandelbrotOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    resizeMandelbrotCanvas();
    renderMandelbrot();
  }

  function closeMandelbrot() {
    if (mandelbrotOverlay) {
      mandelbrotOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function resizeMandelbrotCanvas() {
    if (!mandelbrotCanvas) return;
    mandelbrotCanvas.width = Math.min(window.innerWidth, 1280);
    mandelbrotCanvas.height = Math.min(window.innerHeight, 800);
  }

  function renderMandelbrot() {
    if (!mandelbrotCtx || !mandelbrotCanvas) return;
    const w = mandelbrotCanvas.width;
    const h = mandelbrotCanvas.height;
    if (w <= 0 || h <= 0) return;

    const imgData = mandelbrotCtx.createImageData(w, h);
    const d = imgData.data;

    const aspect = w / h;
    const rMin = mbCenterX - (mbScale * aspect) / 2;
    const rMax = mbCenterX + (mbScale * aspect) / 2;
    const iMin = mbCenterY - mbScale / 2;
    const iMax = mbCenterY + mbScale / 2;

    const dr = (rMax - rMin) / w;
    const di = (iMax - iMin) / h;

    let idx = 0;
    for (let py = 0; py < h; py++) {
      const ci = iMin + py * di;
      for (let px = 0; px < w; px++) {
        const cr = rMin + px * dr;

        let zr = 0.0;
        let zi = 0.0;
        let iter = 0;

        while (zr * zr + zi * zi <= 4.0 && iter < mbMaxIter) {
          const zrNext = zr * zr - zi * zi + cr;
          zi = 2.0 * zr * zi + ci;
          zr = zrNext;
          iter++;
        }

        if (iter === mbMaxIter) {
          d[idx] = 8;
          d[idx + 1] = 12;
          d[idx + 2] = 31;
          d[idx + 3] = 255;
        } else {
          const t = iter / mbMaxIter;
          const hue = (t * 360 + 260) % 360;
          const rgb = hslToRgb(hue / 360, 0.9, 0.5 + t * 0.3);
          d[idx] = rgb[0];
          d[idx + 1] = rgb[1];
          d[idx + 2] = rgb[2];
          d[idx + 3] = 255;
        }
        idx += 4;
      }
    }

    mandelbrotCtx.putImageData(imgData, 0, 0);

    const zoomVal = (2.8 / mbScale).toFixed(1);
    const lblCenter = document.getElementById('mb-center-label');
    const lblZoom = document.getElementById('mb-zoom-label');
    if (lblCenter) lblCenter.textContent = `Center: ${mbCenterX.toFixed(4)} + ${mbCenterY.toFixed(4)}i`;
    if (lblZoom) lblZoom.textContent = `Zoom: ${zoomVal}x`;
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
});
