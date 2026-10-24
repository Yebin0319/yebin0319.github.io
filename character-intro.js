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

  scene.add(new THREE.HemisphereLight(0xfff4ec, 0xf3c9d4, 0.5));
  var key = new THREE.DirectionalLight(0xffffff, 0.6); key.position.set(-3, 4, 6); scene.add(key);
  var rim = new THREE.PointLight(0xff9db8, 0.9, 20); rim.position.set(4, 2, -3); scene.add(rim);

  function mat(color, rough) { return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.55 : rough, metalness: 0 }); }
  function ell(r, sx, sy, sz, m, x, y, z, parent) {
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), m);
    mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z); (parent || scene).add(mesh); return mesh;
  }

  var SKIN = new THREE.MeshStandardMaterial({ color: 0xffdcc2, roughness: 0.5, emissive: 0x4a2414, emissiveIntensity: 0.35 }), HAIR = new THREE.MeshStandardMaterial({ color: 0x0e0d10, roughness: 0.55, metalness: 0 });
  var BROW = mat(0x3a3434, 0.6), LIP = mat(0xb3615f, 0.4);

  var chr = new THREE.Group(); scene.add(chr);
  var head = new THREE.Group(); chr.add(head);

  // ---- head: egg-shaped, narrowing toward a soft chin ----
  var hg = new THREE.SphereGeometry(1, 72, 56), hp = hg.attributes.position;
  for (var i = 0; i < hp.count; i++) {
    var x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    var t = Math.min(1, Math.max(0, (0.15 - y) / 1.15));
    var n = 1 - 0.34 * Math.pow(t, 1.4);
    hp.setXYZ(i, x * 1.08 * n, y * 1.0, z * (1 - 0.1 * t) * (z > 0 ? 1 : 0.95) + (z > 0 ? 0.04 * t : 0));
  }
  hg.computeVertexNormals();
  head.add(new THREE.Mesh(hg, SKIN));
  ell(1, 0.13, 0.2, 0.1, SKIN, -1.11, 0.0, -0.05, head);
  ell(1, 0.13, 0.2, 0.1, SKIN, 1.11, 0.0, -0.05, head);
  ell(1, 0.09, 0.08, 0.09, SKIN, 0, -0.15, 1.01, head);                 // nose

  // ---- face ----
  var eyes = [];
  [-1, 1].forEach(function (sd) {
    var g = new THREE.Group(); g.position.set(sd * 0.4, 0.02, 0.9); g.rotation.y = sd * 0.42; head.add(g);
    var white = ell(1, 0.15, 0.1, 0.05, new THREE.MeshStandardMaterial({ color: 0xfbf6f0, roughness: 0.4 }), 0, 0, 0, g);
    var iris = ell(1, 0.1, 0.1, 0.05, new THREE.MeshStandardMaterial({ color: 0x4b3425, roughness: 0.25 }), 0, 0, 0.03, g);
    ell(1, 0.05, 0.05, 0.03, BLACKISH(), 0, 0, 0.07, g);
    ell(1, 0.028, 0.028, 0.02, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.035, 0.035, 0.1, g);
    var lid = ell(1, 0.165, 0.11, 0.07, SKIN, 0, 0.1, 0.01, g);        // upper lid, slides down to blink
    eyes.push({ g: g, iris: iris, lid: lid, side: sd });
    var brow = ell(1, 0.2, 0.028, 0.04, BROW, sd * 0.4, 0.32, 0.93, head);
    brow.rotation.z = sd * -0.1; brow.rotation.y = sd * 0.42;
    var blush = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: 0xff9bb0, transparent: true, opacity: 0.35 }));
    blush.position.set(sd * 0.62, -0.28, 0.8); blush.lookAt(sd * 1.3, -0.28, 2.4); head.add(blush);
  });
  function BLACKISH() { return new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 0.2 }); }
  var mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.026, 10, 28, Math.PI * 0.8), LIP);
  mouth.rotation.z = Math.PI * 1.1; mouth.position.set(0.03, -0.5, 0.93); mouth.rotation.y = 0.06; head.add(mouth);

  // ---- hair: glossy cap with blunt fringe, volume behind, high ponytail ----
  var cap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 40, 0, Math.PI * 2, 0, 1.78), HAIR);
  cap.scale.set(1.12, 1.08, 1.1); cap.position.set(0, 0.1, -0.04); cap.rotation.x = -0.28; head.add(cap);
  ell(1, 1.1, 1.0, 0.8, HAIR, 0, 0.18, -0.55, head);                    // back volume
  ell(1, 0.14, 0.55, 0.45, HAIR, -1.08, 0.12, 0.0, head);               // side hair in front of ears
  ell(1, 0.14, 0.55, 0.45, HAIR, 1.08, 0.12, 0.0, head);
  ell(1, 0.5, 0.42, 0.45, HAIR, 0.52, 1.05, -0.62, head);               // ponytail knot
  var tailPts = [[0.6, 0.95, -0.7], [0.85, 0.55, -0.85], [1.05, 0.0, -0.8], [1.12, -0.6, -0.65], [1.05, -1.15, -0.5], [0.95, -1.55, -0.35]];
  var curve = new THREE.CatmullRomCurve3(tailPts.map(function (q) { return new THREE.Vector3(q[0], q[1], q[2]); }));
  for (var k = 0; k <= 40; k++) {
    var u = k / 40, pt = curve.getPoint(u), r = 0.36 * (1 - u * 0.88) + 0.04;
    ell(1, r, r * 1.35, r, HAIR, pt.x, pt.y, pt.z, head);
  }

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
    var visH = Math.max(6.4, 5.8 / aspect);               // keep the whole bust in frame on tall screens
    camera.position.set(0, 0, visH / 2 / FOV_T);
    camera.lookAt(0, 0, 0);
    chr.position.y = -0.85;
  }
  window.addEventListener('resize', resize);
  resize();

  var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    lastMove = performance.now();
  }, { passive: true });

  var prev = performance.now(), blinkAt = prev + 1800, blinkEnd = 0, winkSide = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    var t = now / 1000;
    var idle = now - lastMove > 2500;
    var gx = idle ? Math.sin(t * 0.9) * 0.45 : tx;
    var gy = idle ? Math.sin(t * 1.3) * 0.12 : ty * 0.8;
    var k = 1 - Math.exp(-6 * dt);
    cx += (gx - cx) * k; cy += (gy - cy) * k;

    head.rotation.y = cx * 0.6;
    head.rotation.x = cy * 0.3;
    head.rotation.z = -cx * 0.07 + Math.sin(t * 0.8) * 0.02;
    head.position.y = Math.sin(t * 1.6) * 0.04;

    if (now > blinkAt) {
      blinkEnd = now + 140; blinkAt = now + 2400 + Math.random() * 2600;
      winkSide = (Math.random() < 0.3) ? (Math.random() < 0.5 ? -1 : 1) : 0;
    }
    var closing = now < blinkEnd;
    for (var i2 = 0; i2 < eyes.length; i2++) {
      var E = eyes[i2];
      var shut = closing && (winkSide === 0 || winkSide === E.side);
      if (winkSide === E.side && now < blinkEnd + 380 && now > blinkEnd - 140) shut = true;
      E.lid.position.y += ((shut ? 0.0 : 0.1) - E.lid.position.y) * 0.6;
      E.iris.position.x = cx * 0.05; E.iris.position.y = -cy * 0.03;
    }

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
