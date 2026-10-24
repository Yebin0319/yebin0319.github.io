// Onboarding: my Memoji-style illustrated character (upper body) pulls different faces while its
// SVG layers shift at different depths so the head seems to turn toward the cursor.
// Scroll / touch / key press (or a short delay) dissolves it into the hero; clicking the character
// changes its expression.
(function () {
  var root = document.documentElement;
  var overlay = document.querySelector('.char-intro');
  if (!overlay || !root.classList.contains('has-intro')) return;

  var AUTO_MS = 8000;
  var done = false, timer = 0, raf = 0;

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    try { sessionStorage.setItem('glassIntroSeen', '1'); } catch (e) {}
    overlay.classList.add('gi-out');
    root.classList.add('intro-done');
    window.scrollTo(0, 0);
    setTimeout(function () {
      root.classList.remove('has-intro');
      overlay.remove();
      cancelAnimationFrame(raf);
    }, 700);
    ['wheel', 'touchmove', 'keydown'].forEach(function (t) { window.removeEventListener(t, onUser); });
  }
  function onUser(e) {
    if (e.type === 'keydown' && [' ', 'ArrowDown', 'PageDown', 'Enter', 'End'].indexOf(e.key) === -1) return;
    finish();
  }
  ['wheel', 'touchmove', 'keydown'].forEach(function (t) { window.addEventListener(t, onUser, { passive: true }); });
  timer = setTimeout(finish, AUTO_MS);

  function $(id) { return document.getElementById(id); }
  var L = {
    hairBack: $('cHairBack'), tail: $('cTail'), body: $('cBody'), neck: $('cNeck'), locks: $('cLocks'),
    head: $('cHead'), face: $('cFace'), bangs: $('cBangs'), brows: $('cBrows'),
    eyeL: $('cEyeL'), eyeR: $('cEyeR'), mouth: $('cMouth'), blush: [$('cBlush1'), $('cBlush2')]
  };
  var decos = overlay.querySelectorAll('.ci-deco');
  var fx = overlay.querySelector('.ci-fx');
  function set(el, x, y) { el.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')'); }

  // ---- expressions ----
  var FACES = [
    { l: 'open',  r: 'open',  m: 'smile', brow: 0,  blush: 0.45 },
    { l: 'wink',  r: 'open',  m: 'smirk', brow: -2, blush: 0.55 },
    { l: 'happy', r: 'happy', m: 'laugh', brow: -5, blush: 0.7,  fx: 'star' },
    { l: 'wide',  r: 'wide',  m: 'o',     brow: -10, blush: 0.3 },
    { l: 'heart', r: 'heart', m: 'smile', brow: -3, blush: 0.75, fx: 'heart' },
    { l: 'open',  r: 'wink',  m: 'cat',   brow: -2, blush: 0.6 }
  ];
  var cur = 0, face = FACES[0];
  function pick(group, state) {
    var kids = group.children;
    for (var i = 0; i < kids.length; i++) kids[i].style.display = kids[i].getAttribute('data-s') === state ? '' : 'none';
  }
  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11Z" fill="#ff6f95"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 1l2.6 7.4L22 12l-7.4 3.6L12 23l-2.6-7.4L2 12l7.4-3.6Z" fill="#ffd36b"/></svg>';
  function burst(kind) {
    for (var n = 0; n < 4; n++) {
      (function (n) {
        setTimeout(function () {
          var i = document.createElement('i');
          i.innerHTML = kind === 'heart' ? HEART : STAR;
          i.style.left = (8 + Math.random() * 78) + '%'; i.style.top = (2 + Math.random() * 34) + '%';
          fx.appendChild(i); setTimeout(function () { i.remove(); }, 1600);
        }, n * 140);
      })(n);
    }
  }
  function setFace(i) {
    cur = i; face = FACES[i];
    pick(L.eyeL, face.l); pick(L.eyeR, face.r); pick(L.mouth, face.m);
    L.blush[0].setAttribute('opacity', face.blush); L.blush[1].setAttribute('opacity', face.blush);
    if (face.fx) burst(face.fx);
  }
  setFace(0);
  var nextFace = performance.now() + 2600;
  function nextExpression() { setFace((cur + 1 + Math.floor(Math.random() * (FACES.length - 1))) % FACES.length); nextFace = performance.now() + 2800; }

  overlay.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.ci-stage')) nextExpression(); else finish();
  });

  var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    lastMove = performance.now();
  }, { passive: true });

  var prev = performance.now(), blinkAt = prev + 1800, blinkEnd = 0, brow = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    var t = now / 1000;
    var idle = now - lastMove > 2500;
    var gx = idle ? Math.sin(t * 0.9) * 0.5 : tx;
    var gy = idle ? Math.sin(t * 1.3) * 0.15 : ty * 0.8;
    var k = 1 - Math.exp(-6 * dt);
    cx += (gx - cx) * k; cy += (gy - cy) * k;
    var bob = Math.sin(t * 1.6) * 2.5;

    if (now > nextFace) nextExpression();

    // layers closer to the viewer travel further -> parallax reads as a head turn
    set(L.body, cx * 3, bob * 0.3);
    set(L.neck, cx * 5, bob * 0.5);
    set(L.hairBack, -cx * 6, bob * 0.6);
    set(L.tail, -cx * 14, bob * 0.8 - cy * 4);
    set(L.locks, cx * 4, bob * 0.4);
    L.head.setAttribute('transform', 'translate(' + (cx * 9).toFixed(2) + ' ' + (bob + cy * 5).toFixed(2) + ') rotate(' + (cx * 4.5).toFixed(2) + ' 200 300)');
    set(L.face, cx * 10, cy * 7);
    set(L.bangs, cx * 4, cy * 3);

    brow += (face.brow - brow) * 0.25;
    set(L.brows, 0, brow);

    // blink (only while the eyes are plain open)
    if (now > blinkAt) { blinkEnd = now + 130; blinkAt = now + 2400 + Math.random() * 2600; }
    var blinking = now < blinkEnd;
    var sides = [[L.eyeL, face.l], [L.eyeR, face.r]];
    for (var s = 0; s < 2; s++) {
      var g = sides[s][0], state = sides[s][1];
      var sc = blinking && state === 'open' ? 0.1 : 1;
      g.setAttribute('transform', 'translate(0 ' + (214 * (1 - sc)).toFixed(1) + ') scale(1 ' + sc + ')');
      var iris = g.querySelectorAll('.iris');
      for (var q = 0; q < iris.length; q++) iris[q].setAttribute('transform', 'translate(' + (cx * 4).toFixed(1) + ' ' + (cy * 3).toFixed(1) + ')');
    }

    for (var d = 0; d < decos.length; d++) {
      decos[d].style.transform = 'translate(' + (-cx * (10 + d * 5)).toFixed(1) + 'px,' + (-cy * (6 + d * 3)).toFixed(1) + 'px)';
    }
  }
  raf = requestAnimationFrame(frame);
})();
