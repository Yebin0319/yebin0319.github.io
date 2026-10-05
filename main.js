// 구예빈의 포트폴리오 — shared behavior

document.addEventListener('DOMContentLoaded', () => {
  // ---- Mobile menu toggle ----
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // ---- Dropdown: click-to-toggle for touch devices (hover still works via CSS) ----
  document.querySelectorAll('.nav-item.has-dropdown > .nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (window.matchMedia('(hover: none)').matches) {
        e.preventDefault();
        link.parentElement.classList.toggle('is-open');
      }
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-item.has-dropdown.is-open').forEach((item) => {
      if (!item.contains(e.target)) item.classList.remove('is-open');
    });
  });

  // ---- Scroll reveal ----
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ---- Project ring carousel ----
  document.querySelectorAll('[data-ring]').forEach(initRing);

  // ---- Active nav link highlight ----
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
    if (link.dataset.page === path) link.classList.add('active');
  });
});

// Cards sit on a ring that slowly drifts on its own; cards near the front play their videos,
// and the info panel below follows whichever card is in front.
function initRing(root) {
  const stage = root.querySelector('.ring-stage');
  const cards = [...root.querySelectorAll('.ring-card')];
  const panels = [...root.querySelectorAll('.ring-panel')];
  const dotsWrap = root.querySelector('.ring-dots');
  const n = cards.length;
  if (!stage || n === 0) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = (2 * Math.PI) / n;
  const DRIFT = 1 / 3;      // cards per second — one card every ~3s
  const HOLD_MS = 7000;     // pause after the visitor picks a card

  let pos = 0;              // ring position, in card units
  let target = null;        // set when easing to a chosen card; null while drifting
  let vel = 0;
  let holdUntil = 0;
  let active = -1;
  let drag = null;
  let hovering = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  const playing = cards.map(() => false);

  // Cards vary in shape (phone vs. desktop recordings), so spacing is based on the shared box width
  const slot = () => Math.max(...cards.map((c) => c.offsetWidth)); // the widest card spans the full box
  const mod = (i) => ((i % n) + n) % n;
  const wrap = (d) => mod(d + n / 2) - n / 2; // shortest signed distance, in [-n/2, n/2)

  // Demo videos open with intro screens, so start each one from its midpoint
  cards.forEach((card) => {
    const video = card.querySelector('video');
    if (!video) return;
    const seekMid = () => { if (video.duration) video.currentTime = video.duration / 2; };
    if (video.readyState >= 1) seekMid();
    else video.addEventListener('loadedmetadata', seekMid, { once: true });
  });

  const dots = cards.map((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'ring-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', card.querySelector('figcaption')?.textContent || `프로젝트 ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap?.appendChild(dot);
    return dot;
  });

  function layout() {
    const radius = slot() * 0.78;
    cards.forEach((card, i) => {
      const d = wrap(i - pos);
      const a = d * step;
      const far = Math.abs(d);
      const tilt = Math.max(-60, Math.min(60, (a * 180) / Math.PI * 0.4));
      card.style.transform = `translate(-50%, -50%) translate3d(${(Math.sin(a) * radius).toFixed(1)}px, 0, ${((Math.cos(a) - 1) * radius).toFixed(1)}px) rotateY(${tilt.toFixed(2)}deg)`;
      card.style.opacity = String(Math.max(0.25, 1 - Math.max(0, far - 1) * 0.6));
      card.style.zIndex = String(100 - Math.round(far * 10));
      card.style.setProperty('--dim', Math.min(0.45, far * 0.32).toFixed(3));

      // Front and neighbouring cards play; the ones around the back rest
      const shouldPlay = visible && far < 1.5;
      if (shouldPlay !== playing[i]) {
        playing[i] = shouldPlay;
        const video = card.querySelector('video');
        if (video) shouldPlay ? video.play().catch(() => {}) : video.pause();
      }
    });
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((card, k) => {
      card.classList.toggle('is-active', k === i);
      card.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    panels.forEach((panel, k) => panel.classList.toggle('is-active', k === i));
    dots.forEach((dot, k) => dot.setAttribute('aria-selected', k === i ? 'true' : 'false'));
  }

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;

    if (drag) {
      // position follows the pointer
    } else if (target !== null) {
      const diff = target - pos;
      pos = Math.abs(diff) < 0.001 || reduceMotion ? target : pos + diff * Math.min(1, dt * 7);
      vel = 0;
      if (pos === target) { target = null; holdUntil = now + HOLD_MS; }
    } else {
      const paused = reduceMotion || hovering || now < holdUntil || document.hidden;
      vel += ((paused ? 0 : DRIFT) - vel) * Math.min(1, dt * (paused ? 5 : 1.5));
      pos += vel * dt;
    }

    layout();
    setActive(mod(Math.round(pos)));

    const settled = !drag && target === null && (reduceMotion || Math.abs(vel) < 1e-4) && (reduceMotion || hovering);
    if (visible && !settled) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };

  function goTo(i) { const base = Math.round(pos); target = base + wrap(i - mod(base)); kick(); }
  const next = () => { target = Math.round(target ?? pos) + 1; kick(); };
  const prev = () => { target = Math.round(target ?? pos) - 1; kick(); };

  root.querySelector('[data-ring-next]')?.addEventListener('click', next);
  root.querySelector('[data-ring-prev]')?.addEventListener('click', prev);
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });
  // Hovering the cards slows the ring to a stop so a video can be watched
  stage.addEventListener('mouseenter', () => { hovering = true; });
  stage.addEventListener('mouseleave', () => { hovering = false; kick(); });

  // Drag / swipe to spin; a tap on a side card brings it to the front
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, start: pos, moved: false, card: e.target.closest('.ring-card') };
    target = null;
    stage.setPointerCapture(e.pointerId);
    kick();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; stage.classList.add('is-dragging'); }
    pos = drag.start - dx / (slot() * 0.9);
  });
  const endDrag = () => {
    if (!drag) return;
    const { moved, card, start } = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (moved) {
      // A deliberate swipe always moves at least one card
      target = Math.round(pos);
      if (target === Math.round(start) && Math.abs(pos - start) > 0.12) target += Math.sign(pos - start);
    } else if (card) {
      const i = cards.indexOf(card);
      if (i === active) {
        const video = card.querySelector('video');
        if (video) video.paused ? video.play().catch(() => {}) : video.pause();
        holdUntil = performance.now() + HOLD_MS;
      } else {
        goTo(i);
      }
    }
    kick();
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Only animate and play while the carousel is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      layout();
      if (visible) kick();
    }, { threshold: 0.2 }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  window.addEventListener('resize', layout);
  root.classList.add('is-ready');
  layout();
  setActive(0);
  kick();
}
