// Onboarding: an illustrated chibi version of me, built from SVG layers that shift at different
// depths so the head seems to turn toward the cursor. Scroll / touch / click / key (or a short
// delay) dissolves it into the hero.
(function () {
  var root = document.documentElement;
  var overlay = document.querySelector('.char-intro');
  if (!overlay || !root.classList.contains('has-intro')) return;

  var AUTO_MS = 6500;
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
  overlay.addEventListener('click', finish);
  timer = setTimeout(finish, AUTO_MS);

  function $(id) { return document.getElementById(id); }
  var L = {
    hairBack: $('cHairBack'), tail: $('cTail'), body: $('cBody'), neck: $('cNeck'), locks: $('cLocks'),
    head: $('cHead'), face: $('cFace'), bangs: $('cBangs'),
    eyeL: $('cEyeL'), eyeR: $('cEyeR'), irisL: $('cIrisL'), irisR: $('cIrisR')
  };
  var decos = overlay.querySelectorAll('.ci-deco');
  function set(el, x, y) { el.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')'); }

  var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    lastMove = performance.now();
  }, { passive: true });

  var prev = performance.now(), blinkAt = prev + 1800, blinkEnd = 0, winkSide = 0, lid = [1, 1];
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

    // layers closer to the viewer travel further -> parallax reads as a head turn
    set(L.body, cx * 3, bob * 0.3);
    set(L.neck, cx * 5, bob * 0.5);
    set(L.hairBack, -cx * 6, bob * 0.6);
    set(L.tail, -cx * 14, bob * 0.8 - cy * 4);
    set(L.locks, cx * 4, bob * 0.4);
    L.head.setAttribute('transform', 'translate(' + (cx * 9).toFixed(2) + ' ' + (bob + cy * 5).toFixed(2) + ') rotate(' + (cx * 4.5).toFixed(2) + ' 200 300)');
    set(L.face, cx * 10, cy * 7);
    set(L.bangs, cx * 4, cy * 3);

    if (now > blinkAt) {
      blinkEnd = now + 130; blinkAt = now + 2400 + Math.random() * 2600;
      winkSide = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    }
    var closing = now < blinkEnd;
    var tgtL = closing && (winkSide === 0 || winkSide === -1) ? 0.1 : 1;
    var tgtR = closing && (winkSide === 0 || winkSide === 1) ? 0.1 : 1;
    lid[0] += (tgtL - lid[0]) * 0.6; lid[1] += (tgtR - lid[1]) * 0.6;
    L.eyeL.setAttribute('transform', 'translate(0 ' + (214 * (1 - lid[0])).toFixed(1) + ') scale(1 ' + lid[0].toFixed(2) + ')');
    L.eyeR.setAttribute('transform', 'translate(0 ' + (214 * (1 - lid[1])).toFixed(1) + ') scale(1 ' + lid[1].toFixed(2) + ')');
    var ix = cx * 4, iy = cy * 3;
    L.irisL.setAttribute('cx', 160 + ix); L.irisL.setAttribute('cy', 214 + iy);
    L.irisR.setAttribute('cx', 240 + ix); L.irisR.setAttribute('cy', 214 + iy);

    for (var d = 0; d < decos.length; d++) {
      decos[d].style.transform = 'translate(' + (-cx * (10 + d * 5)).toFixed(1) + 'px,' + (-cy * (6 + d * 3)).toFixed(1) + 'px)';
    }
  }
  raf = requestAnimationFrame(frame);
})();
