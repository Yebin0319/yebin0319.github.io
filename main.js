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

// Cards sit on a ring; the one at the front plays its video and shows its info panel below.
function initRing(root) {
  const stage = root.querySelector('.ring-stage');
  const cards = [...root.querySelectorAll('.ring-card')];
  const panels = [...root.querySelectorAll('.ring-panel')];
  const dotsWrap = root.querySelector('.ring-dots');
  const n = cards.length;
  if (!stage || n === 0) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = (2 * Math.PI) / n;
  const AUTO_MS = 6000;

  let pos = 0;          // current (animated) ring position, in card units
  let target = 0;       // position we are easing towards
  let active = -1;
  let raf = 0;
  let drag = null;
  let autoplay = !reduceMotion;
  let hovering = false;
  let visible = true;

  const mod = (i) => ((i % n) + n) % n;
  const wrap = (d) => mod(d + n / 2) - n / 2; // shortest signed distance, in [-n/2, n/2)

  const dots = cards.map((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'ring-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', card.querySelector('figcaption')?.textContent || `프로젝트 ${i + 1}`);
    dot.addEventListener('click', () => { stopAuto(); goTo(i); });
    dotsWrap?.appendChild(dot);
    return dot;
  });

  function layout() {
    const w = cards[0].offsetWidth;
    const radius = w * 0.78;
    cards.forEach((card, i) => {
      const d = wrap(i - pos);
      const a = d * step;
      const x = Math.sin(a) * radius;
      const z = (Math.cos(a) - 1) * radius;
      const tilt = Math.max(-60, Math.min(60, (a * 180) / Math.PI * 0.4));
      const far = Math.abs(d);
      card.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${tilt.toFixed(2)}deg)`;
      card.style.opacity = String(Math.max(0.25, 1 - Math.max(0, far - 1) * 0.6));
      card.style.zIndex = String(100 - Math.round(far * 10));
      card.style.setProperty('--dim', String(Math.min(0.45, far * 0.32).toFixed(3)));
    });
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((card, k) => {
      const on = k === i;
      card.classList.toggle('is-active', on);
      card.setAttribute('aria-hidden', on ? 'false' : 'true');
      const video = card.querySelector('video');
      if (!video) return;
      if (on && visible) video.play().catch(() => {});
      else video.pause();
    });
    panels.forEach((panel, k) => panel.classList.toggle('is-active', k === i));
    dots.forEach((dot, k) => dot.setAttribute('aria-selected', k === i ? 'true' : 'false'));
  }

  function tick() {
    raf = 0;
    if (!drag) {
      const diff = target - pos;
      pos = Math.abs(diff) < 0.001 || reduceMotion ? target : pos + diff * 0.12;
    }
    layout();
    setActive(mod(Math.round(pos)));
    if (drag || pos !== target) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function goTo(i) { target += wrap(i - mod(Math.round(target))); kick(); }
  const next = () => { target = Math.round(target) + 1; kick(); };
  const prev = () => { target = Math.round(target) - 1; kick(); };

  // Auto-advance until the visitor takes control
  let timer = 0;
  function stopAuto() { autoplay = false; clearInterval(timer); }
  if (autoplay) {
    timer = setInterval(() => {
      if (!hovering && !drag && visible && !document.hidden) next();
    }, AUTO_MS);
  }

  root.querySelector('[data-ring-next]')?.addEventListener('click', () => { stopAuto(); next(); });
  root.querySelector('[data-ring-prev]')?.addEventListener('click', () => { stopAuto(); prev(); });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stopAuto(); prev(); }
  });
  root.addEventListener('mouseenter', () => { hovering = true; });
  root.addEventListener('mouseleave', () => { hovering = false; });

  // Drag / swipe to spin; a tap on a side card brings it to the front
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, start: pos, moved: false, card: e.target.closest('.ring-card') };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; stage.classList.add('is-dragging'); stopAuto(); }
    pos = drag.start - dx / (cards[0].offsetWidth * 0.9);
    target = pos;
    kick();
  });
  const endDrag = () => {
    if (!drag) return;
    const { moved, card, start } = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (moved) {
      // A deliberate swipe always moves at least one card
      const dir = Math.sign(pos - start);
      target = Math.round(pos);
      if (target === Math.round(start) && Math.abs(pos - start) > 0.12) target += dir;
    } else if (card) {
      const i = cards.indexOf(card);
      stopAuto();
      if (i === active) {
        const video = card.querySelector('video');
        if (video) video.paused ? video.play().catch(() => {}) : video.pause();
      } else {
        goTo(i);
      }
    }
    kick();
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Only play while the carousel is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      const video = cards[active]?.querySelector('video');
      if (!video) return;
      if (visible) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.25 }).observe(stage);
  }

  window.addEventListener('resize', layout);
  root.classList.add('is-ready');
  layout();
  setActive(0);
}
