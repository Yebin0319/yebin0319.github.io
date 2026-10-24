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

  var img = overlay.querySelector('.ci-memoji'), shadow = overlay.querySelector('.ci-shadow');
  var decos = overlay.querySelectorAll('.ci-deco');
  var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    lastMove = performance.now();
  }, { passive: true });

  var prev = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    var t = now / 1000;
    var idle = now - lastMove > 2500;
    var gx = idle ? Math.sin(t * 0.9) * 0.45 : tx;
    var gy = idle ? Math.sin(t * 1.3) * 0.12 : ty * 0.8;
    var k = 1 - Math.exp(-6 * dt);
    cx += (gx - cx) * k; cy += (gy - cy) * k;
    var bob = Math.sin(t * 1.6) * 6;
    // the head leans toward the cursor in 3D
    img.style.transform = 'translate(' + (cx * 14).toFixed(1) + 'px,' + (bob + cy * 8).toFixed(1) + 'px) rotateY(' + (cx * 16).toFixed(2) + 'deg) rotateX(' + (-cy * 10).toFixed(2) + 'deg) rotateZ(' + (cx * 3).toFixed(2) + 'deg)';
    shadow.style.transform = 'translateX(' + (cx * 10).toFixed(1) + 'px) scaleX(' + (1 - Math.abs(bob) * 0.01).toFixed(3) + ')';
    for (var d = 0; d < decos.length; d++) {
      decos[d].style.transform = 'translate(' + (-cx * (10 + d * 5)).toFixed(1) + 'px,' + (-cy * (6 + d * 3)).toFixed(1) + 'px)';
    }
  }
  raf = requestAnimationFrame(frame);
})();
