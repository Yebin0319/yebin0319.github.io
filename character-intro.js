// Onboarding: a 3D character version of me floats over a soft pastel backdrop and turns its head
// toward the cursor. Scroll / touch / click / key press (or a short delay) dissolves it into the hero.
(function () {
  var root = document.documentElement;
  var overlay = document.querySelector('.char-intro');
  if (!overlay || !root.classList.contains('has-intro')) return;
  var canvas = overlay.querySelector('canvas');

  var AUTO_MS = 6000;
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

  var THREE = window.THREE;
  if (!THREE) { finish(); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); } catch (e) { finish(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var FOV_T = Math.tan(15 * Math.PI / 180);

  scene.add(new THREE.HemisphereLight(0xfff4ec, 0xf3c9d4, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 0.7); key.position.set(-3, 4, 6); scene.add(key);
  var rim = new THREE.PointLight(0xff9db8, 0.9, 20); rim.position.set(4, 2, -3); scene.add(rim);

  function mat(color, rough) { return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.55 : rough, metalness: 0 }); }
  function ell(r, sx, sy, sz, m, x, y, z, parent) {
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), m);
    mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z); (parent || scene).add(mesh); return mesh;
  }

  var SKIN = mat(0xffdcc6, 0.6), HAIR = mat(0x15101a, 0.4), CARDI = mat(0x232637, 0.7);
  var GREY = mat(0xd9d6dc, 0.8), BLACK = mat(0x1d1519, 0.25), GOLD = new THREE.MeshStandardMaterial({ color: 0xe2c383, roughness: 0.3, metalness: 0.7 });

  var chr = new THREE.Group(); scene.add(chr);

  // ---- body ----
  var body = new THREE.Group(); chr.add(body);
  ell(1, 1.35, 1.0, 0.85, CARDI, 0, -1.55, 0, body);
  ell(1, 0.62, 0.5, 0.5, GREY, 0, -0.9, 0.55, body);            // inner top
  ell(1, 0.2, 0.2, 0.2, SKIN, 0, -0.55, 0.2, body);              // neck
  ell(1, 0.26, 0.5, 0.26, CARDI, -1.62, -1.35, 0.1, body).rotation.z = -0.25;
  ell(1, 0.26, 0.5, 0.26, CARDI, 1.62, -1.35, 0.1, body).rotation.z = 0.25;

  // ---- hair behind (long, falls past shoulders) ----
  ell(1, 1.2, 1.7, 0.95, HAIR, 0, -0.35, -0.55, chr);

  // ---- head ----
  var head = new THREE.Group(); head.position.set(0, -0.35, 0); chr.add(head);
  var HY = 1.0;                                                    // head centre height in head space
  ell(1, 1.1, 1.0, 1.0, SKIN, 0, HY, 0, head);
  ell(1, 0.13, 0.18, 0.1, SKIN, -1.08, HY - 0.05, 0, head);        // ears
  ell(1, 0.13, 0.18, 0.1, SKIN, 1.08, HY - 0.05, 0, head);

  // hair cap + parted bangs + face-framing locks
  var cap = new THREE.Mesh(new THREE.SphereGeometry(1.08, 48, 32, 0, Math.PI * 2, 0, 1.28), HAIR);
  cap.scale.set(1.1, 1.05, 1.05); cap.position.set(0, HY + 0.1, -0.02); cap.rotation.x = -0.1; head.add(cap);
  var bL = ell(1, 0.62, 0.38, 0.3, HAIR, -0.46, HY + 0.72, 0.82, head); bL.rotation.z = 0.45; bL.rotation.x = -0.35;
  var bR = ell(1, 0.62, 0.38, 0.3, HAIR, 0.46, HY + 0.72, 0.82, head); bR.rotation.z = -0.45; bR.rotation.x = -0.35;
  var lockL = ell(1, 0.2, 0.95, 0.3, HAIR, -1.08, HY - 0.55, 0.35, head); lockL.rotation.z = 0.06;
  var lockR = ell(1, 0.2, 0.95, 0.3, HAIR, 1.08, HY - 0.55, 0.35, head); lockR.rotation.z = -0.06;

  // face
  var eyes = [];
  [-1, 1].forEach(function (s) {
    var g = new THREE.Group(); g.position.set(s * 0.4, HY - 0.05, 0.93); head.add(g);
    var e = ell(1, 0.095, 0.13, 0.05, BLACK, 0, 0, 0, g);
    ell(1, 0.03, 0.035, 0.03, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.03, 0.05, 0.04, g);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 10, 48), GOLD);
    ring.position.set(0, 0, 0.06); g.add(ring);
    eyes.push({ g: g, e: e });
    var blush = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: 0xff9bb0, transparent: true, opacity: 0.55 }));
    blush.position.set(s * 0.62, HY - 0.38, 0.8); blush.lookAt(s * 1.2, HY - 0.38, 2.4); head.add(blush);
  });
  var bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), GOLD);
  bridge.rotation.z = Math.PI / 2; bridge.position.set(0, HY + 0.02, 1.0); head.add(bridge);
  var mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 10, 24, Math.PI), mat(0xc2556b, 0.5));
  mouth.rotation.z = Math.PI; mouth.position.set(0, HY - 0.42, 0.97); head.add(mouth);

  // ---- floating pastel decor ----
  var decor = [];
  function deco(geo, color, x, y, z, s) {
    var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: color, roughness: 0.35 }));
    m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
    decor.push({ m: m, bx: x, by: y, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.5 }); return m;
  }
  deco(new THREE.TorusGeometry(0.5, 0.18, 16, 40), 0xe58ba3, -3.6, 1.6, -1.5, 1);
  deco(new THREE.SphereGeometry(0.42, 28, 20), 0xa2ab73, 3.4, 2.0, -1.2, 1);
  deco(new THREE.IcosahedronGeometry(0.4, 0), 0xffc98f, -3.0, -1.4, -0.5, 1);
  deco(new THREE.OctahedronGeometry(0.38, 0), 0xcc3a63, 3.1, -0.9, -0.8, 1);
  deco(new THREE.SphereGeometry(0.22, 20, 16), 0xf6c1cf, -2.0, 2.6, -2, 1);
  deco(new THREE.TorusGeometry(0.28, 0.1, 12, 32), 0xa2ab73, 2.1, -2.2, -1, 1);
  deco(new THREE.SphereGeometry(0.16, 16, 12), 0xffffff, 1.7, 2.9, -1.5, 1);

  function resize() {
    var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    var aspect = w / h;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    var visH = Math.max(6.4, 6.2 / aspect);               // keep the whole bust in frame on tall screens
    camera.position.set(0, 0.15, visH / 2 / FOV_T);
    camera.lookAt(0, 0.15, 0);
    chr.position.y = aspect < 0.9 ? -0.2 : -0.45;
  }
  window.addEventListener('resize', resize);
  resize();

  var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    lastMove = performance.now();
  }, { passive: true });

  var prev = performance.now(), blinkAt = prev + 1800, blinkEnd = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    var t = now / 1000;
    var idle = now - lastMove > 2500;
    var gx = idle ? Math.sin(t * 0.9) * 0.45 : tx;
    var gy = idle ? Math.sin(t * 1.3) * 0.12 : ty * 0.8;
    var k = 1 - Math.exp(-6 * dt);
    cx += (gx - cx) * k; cy += (gy - cy) * k;

    head.rotation.y = cx * 0.7;
    head.rotation.x = cy * 0.35;
    head.rotation.z = -cx * 0.06;
    body.rotation.y = cx * 0.16;
    body.position.y = Math.sin(t * 1.6) * 0.03;
    head.position.y = -0.35 + Math.sin(t * 1.6 + 0.4) * 0.04;

    // eyes glance a bit further than the head
    for (var i = 0; i < eyes.length; i++) { eyes[i].e.position.x = cx * 0.05; eyes[i].e.position.y = -cy * 0.04; }
    if (now > blinkAt) { blinkEnd = now + 130; blinkAt = now + 2200 + Math.random() * 2600; }
    var blink = now < blinkEnd ? 0.12 : 1;
    for (var j = 0; j < eyes.length; j++) eyes[j].e.scale.y += (0.13 * blink - eyes[j].e.scale.y) * 0.6;

    for (var d = 0; d < decor.length; d++) {
      var o = decor[d];
      o.m.position.y = o.by + Math.sin(t * o.sp + o.ph) * 0.18;
      o.m.position.x = o.bx - cx * 0.18 * (1 + d * 0.05);
      o.m.rotation.x += dt * 0.4 * o.sp; o.m.rotation.y += dt * 0.5 * o.sp;
    }
    renderer.render(scene, camera);
  }
  overlay.classList.add('gi-ready');
  raf = requestAnimationFrame(frame);
})();
