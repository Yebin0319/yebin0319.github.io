// 2.5D head: the profile photo is lifted into a relief mesh (depth map) that turns toward the cursor.
(function () {
  var wrap = document.querySelector('.hero-avatar');
  if (!wrap || !window.THREE) return;
  var canvas = wrap.querySelector('canvas');
  var THREE = window.THREE;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); } catch (e) { wrap.classList.add('no-3d'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 0, 6);
  var pivot = new THREE.Group();
  scene.add(pivot);

  var loader = new THREE.TextureLoader();
  var base = 'assets/img/';
  var colorTex = loader.load(base + 'me-head.png', build);
  colorTex.encoding = THREE.sRGBEncoding;
  colorTex.anisotropy = 4;
  var depthImg = new Image();
  depthImg.onload = build;
  depthImg.src = base + 'me-depth.png';
  var built = false;

  function build() {
    if (built || !colorTex.image || !depthImg.complete || !depthImg.naturalWidth) return;
    built = true;
    var dc = document.createElement('canvas');
    dc.width = depthImg.naturalWidth; dc.height = depthImg.naturalHeight;
    var dx = dc.getContext('2d'); dx.drawImage(depthImg, 0, 0);
    var dd = dx.getImageData(0, 0, dc.width, dc.height).data;
    function depthAt(u, v) {
      var x = Math.min(dc.width - 1, Math.max(0, Math.round(u * (dc.width - 1))));
      var y = Math.min(dc.height - 1, Math.max(0, Math.round((1 - v) * (dc.height - 1))));
      return dd[(y * dc.width + x) * 4] / 255;
    }
    var aspect = colorTex.image.width / colorTex.image.height;
    var H = 2, W = H * aspect, DEPTH = 0.55;
    var geo = new THREE.PlaneGeometry(W, H, 90, 110);
    var pos = geo.attributes.position, uv = geo.attributes.uv;
    for (var i = 0; i < pos.count; i++) pos.setZ(i, depthAt(uv.getX(i), uv.getY(i)) * DEPTH);
    geo.computeVertexNormals();
    var mat = new THREE.MeshBasicMaterial({ map: colorTex, transparent: true, alphaTest: 0.04 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -0.05, -DEPTH * 0.7);   // pivot near the middle of the head
    pivot.add(mesh);
    wrap.classList.add('ready');
  }

  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var tx = 0, ty = 0, cx = 0, cy = 0, lastMove = -1e9;
  function aim(clientX, clientY) {
    var r = wrap.getBoundingClientRect();
    var ox = r.left + r.width / 2, oy = r.top + r.height * 0.4;
    tx = Math.max(-1, Math.min(1, (clientX - ox) / (window.innerWidth * 0.5)));
    ty = Math.max(-1, Math.min(1, (clientY - oy) / (window.innerHeight * 0.5)));
    lastMove = performance.now();
  }
  window.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('pointerleave', function () { tx = ty = 0; });

  var prev = performance.now(), visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(wrap);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !built) return;
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    var idle = now - lastMove > 2500;
    var gx = idle ? Math.sin(now / 1400) * 0.35 : tx;
    var gy = idle ? Math.sin(now / 1900) * 0.15 : ty;
    var k = 1 - Math.exp(-7 * dt);
    cx += (gx - cx) * k; cy += (gy - cy) * k;
    pivot.rotation.y = cx * 0.55;
    pivot.rotation.x = cy * 0.3;
    pivot.rotation.z = -cx * 0.04;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
