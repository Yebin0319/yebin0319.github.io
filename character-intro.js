// Onboarding: my 3D character (cut-out renders) leans toward the cursor and swaps between poses.
// Scroll / touch / key press (or a short delay) dissolves it into the hero; clicking the
// character changes the pose, clicking elsewhere enters.
(function () {
  var root = document.documentElement;
  var overlay = document.querySelector('.char-intro');
  if (!overlay || !root.classList.contains('has-intro')) return;

  var AUTO_MS = 9000;
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

  // Every pose is aligned by its eye line so faces stay put while the image swaps.
  // eye = midpoint between the eyes and the distance between them, in source pixels.
  var POSES = [
    { file: 'assets/img/char/blazer-glasses.webp', w: 1024, h: 1024, mx: 512, my: 375, d: 175 },
    { file: 'assets/img/char/blazer-coffee.webp',  w: 1024, h: 1024, mx: 538, my: 325, d: 153 }
  ];
  var tilt = overlay.querySelector('.ci-tilt');
  var stage = overlay.querySelector('.ci-stage');
  var fx = overlay.querySelector('.ci-fx');
  var decos = overlay.querySelectorAll('.ci-deco');
  var imgs = POSES.map(function (p, i) {
    var im = new Image(); im.alt = ''; im.draggable = false; im.src = p.file; im.className = 'ci-pose' + (i ? '' : ' on');
    tilt.appendChild(im); return im;
  });
  var cur = 0;
  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight;
    POSES.forEach(function (p, i) {
      var s = (0.2 * W) / p.d;
      var im = imgs[i];
      im.style.width = (p.w * s) + 'px'; im.style.height = (p.h * s) + 'px';
      im.style.left = (W * 0.5 - p.mx * s) + 'px'; im.style.top = (H * 0.33 - p.my * s) + 'px';
    });
  }
  window.addEventListener('resize', layout);
  layout();

  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11Z" fill="#ff6f95"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 1l2.6 7.4L22 12l-7.4 3.6L12 23l-2.6-7.4L2 12l7.4-3.6Z" fill="#ffd36b"/></svg>';
  function burst() {
    for (var n = 0; n < 4; n++) {
      (function (n) {
        setTimeout(function () {
          var i = document.createElement('i');
          i.innerHTML = Math.random() < 0.5 ? HEART : STAR;
          i.style.left = (6 + Math.random() * 84) + '%'; i.style.top = (2 + Math.random() * 30) + '%';
          fx.appendChild(i); setTimeout(function () { i.remove(); }, 1600);
        }, n * 140);
      })(n);
    }
  }
  var nextSwap = performance.now() + 3200;
  function swap() {
    imgs[cur].classList.remove('on');
    cur = (cur + 1) % imgs.length;
    imgs[cur].classList.add('on');
    burst();
    nextSwap = performance.now() + 3400;
  }
  overlay.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.ci-stage')) swap(); else finish();
  });

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
    var bob = Math.sin(t * 1.6) * 4;
    if (imgs.length > 1 && now > nextSwap) swap();

    tilt.style.transform = 'translateY(' + bob.toFixed(1) + 'px)';
    for (var d = 0; d < decos.length; d++) {
      decos[d].style.transform = 'translate(' + (-cx * (10 + d * 5)).toFixed(1) + 'px,' + (-cy * (6 + d * 3)).toFixed(1) + 'px)';
    }
  }
  raf = requestAnimationFrame(frame);
})();
