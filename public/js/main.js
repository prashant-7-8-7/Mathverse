/**
 * MathVerse — Main Application Script
 * Shared across all pages: Navigation, Custom Cursor, Particle Universe,
 * KaTeX Equations, 3D Tilt Cards, GSAP ScrollTriggers & Socket.IO.
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const hoverTargets = 'a, button, .tilt-card, .btn-rotate-equation, .eq-dot, [role="button"], input';
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

    // Mouse interaction coordinates
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

    // Resize handling
    window.addEventListener('resize', () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      calculateAllTargets();
    });

    // Shapes: 0 = Lissajous, 1 = Rose Curve, 2 = "MathVerse" Text, 3 = Cosmic Nebula (Drift)
    let currentShapeIndex = 0;
    const shapeNames = [
      'Lissajous Resonance',
      'Rhodonea Rose Curve',
      'MathVerse Constellation',
      'Cosmic Nebula'
    ];
    const morphIndicator = document.getElementById('morph-shape-name');

    // Targets storage
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
      const k = 4; // 8 petals

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

      // Font size responsive
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

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const target = targets.lissajous[i];
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

    // Morph state timer: cycle every 7 seconds
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

    // Animation Loop
    let lastTime = performance.now();
    function animate(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      const currentTargets = getCurrentTargetArray();

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        const target = currentTargets[i] || currentTargets[0];

        // Smooth spring toward target
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        p.vx += dx * 0.035;
        p.vy += dy * 0.035;

        // Damping / Friction
        p.vx *= 0.82;
        p.vy *= 0.82;

        // Mouse attraction when nearby
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

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Render particle
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
        // Easing out cubic
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

    // Fade transition
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

      // Update dots
      if (eqDotsContainer) {
        eqDotsContainer.querySelectorAll('.eq-dot').forEach((dot, dIdx) => {
          dot.classList.toggle('active', dIdx === index);
        });
      }

      eqTarget.style.opacity = '1';
      eqTarget.style.transform = 'translateY(0)';
    }, 200);
  }

  // Setup equation dots
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

      const rotateX = ((y - centerY) / centerY) * -9; // Max 9 deg
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

    // Hero entrance
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

    // Scroll reveal for cards & sections
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
});
