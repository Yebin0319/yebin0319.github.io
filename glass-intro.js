// Liquid-glass intro: a refractive 3D torus drifts over the title, then dissolves into the hero
// on scroll / touch / key press or after a short delay.
(function () {
  var root = document.documentElement;
  var overlay = document.querySelector('.glass-intro');
  if (!overlay || !root.classList.contains('has-intro')) return;
  var canvas = overlay.querySelector('canvas');

  var AUTO_MS = 2200;
  var done = false;
  var timer = 0;
  var raf = 0;

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

  var opts = { antialias: false, alpha: true, premultipliedAlpha: true };
  var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) { finish(); return; }

  var VS = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos,0.0,1.0); }';

  var PLATE_FS = [
    'precision highp float;',
    'uniform sampler2D uPlate; uniform vec2 uRes;',
    'void main(){ gl_FragColor = texture2D(uPlate, gl_FragCoord.xy / uRes); }'
  ].join('\n');

  var GLASS_FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uAspect; uniform float uTanHalf;',
    'uniform sampler2D uPlate; uniform sampler2D uEnv;',
    'uniform mat3 uRot; uniform mat3 uRotT; uniform vec3 uCenter;',
    'uniform float uScale; uniform float uBoundR; uniform float uTube;',
    'uniform float uDisp; uniform float uFrost;',
    'const float PI = 3.14159265359;',
    'const float IOR = 1.5; const float THICKNESS = 2.0; const float CORE = 1.0;',
    'float map(vec3 p){ vec2 q = vec2(length(p.xy) - 0.8, p.z); return length(q) - uTube; }',
    'vec3 mapNormal(vec3 p){ const float e = 0.0015; vec2 k = vec2(1.0,-1.0);',
    '  return normalize(k.xyy*map(p+k.xyy*e) + k.yyx*map(p+k.yyx*e) + k.yxy*map(p+k.yxy*e) + k.xxx*map(p+k.xxx*e)); }',
    'float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }',
    'void main(){',
    '  vec2 screenUv = gl_FragCoord.xy / uRes; vec2 ndc = screenUv*2.0-1.0;',
    '  vec3 D = normalize(vec3(ndc.x*uTanHalf*uAspect, ndc.y*uTanHalf, -1.0));',
    '  vec3 rd = normalize(uRotT * D); vec3 ro = (uRotT * -uCenter) / uScale;',
    '  float bb = dot(ro, rd); float cc = dot(ro, ro) - uBoundR*uBoundR; float hh = bb*bb - cc;',
    '  if (hh < 0.0) discard;',
    '  hh = sqrt(hh); float t = max(-bb - hh, 0.0); float tMax = -bb + hh;',
    '  bool hit = false;',
    '  for (int i = 0; i < 80; i++){ if (t > tMax) break; float d = map(ro + rd*t); if (d < 0.0009){ hit = true; break; } t += d*0.9; }',
    '  if (!hit) discard;',
    '  vec3 pObj = ro + rd*t; vec3 nObj = mapNormal(pObj);',
    '  vec3 vP = uCenter + uScale*(uRot*pObj); vec3 normal = normalize(uRot*nObj); vec3 viewDir = normalize(-vP);',
    '  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);',
    '  float core = pow(max(dot(normal, viewDir), 0.0), 2.0);',
    '  vec2 lens = (screenUv - 0.5) * (CORE*0.15) * core;',
    '  vec3 rv = refract(-viewDir, normal, 1.0/IOR);',
    '  vec2 offset = rv.xy * (THICKNESS*0.1) - lens;',
    '  vec3 rf = reflect(-viewDir, normal);',
    '  vec2 eq = vec2(atan(rf.z, rf.x)/(2.0*PI) + 0.5, asin(clamp(rf.y,-1.0,1.0))/PI + 0.5);',
    '  vec3 reflection = texture2D(uEnv, eq).rgb * 2.5;',
    '  vec3 tr = vec3(0.0);',
    '  vec2 uvR = screenUv + offset*(1.0+uDisp); vec2 uvG = screenUv + offset; vec2 uvB = screenUv + offset*(1.0-uDisp);',
    '  float rnd = rand(screenUv) * 6.2831853;',
    '  float blur = uFrost * 0.025; float radius = 0.0;',
    '  for (int i = 0; i < 16; i++){',
    '    float th = float(i)*2.39996323 + rnd; radius += 1.0/16.0;',
    '    vec2 bo = vec2(cos(th), sin(th)) * radius * blur;',
    '    tr.r += texture2D(uPlate, clamp(uvR+bo, 0.0, 1.0)).r;',
    '    tr.g += texture2D(uPlate, clamp(uvG+bo, 0.0, 1.0)).g;',
    '    tr.b += texture2D(uPlate, clamp(uvB+bo, 0.0, 1.0)).b;',
    '  }',
    '  tr /= 16.0;',
    '  vec3 finalColor = mix(tr, reflection, fresnel*0.8);',
    '  gl_FragColor = vec4(finalColor, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('glass-intro shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function link(fs) {
    var v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }
  var plateProg = link(PLATE_FS), glassProg = link(GLASS_FS);
  if (!plateProg || !glassProg) { finish(); return; }

  function uni(p, n) { return gl.getUniformLocation(p, n); }
  var up = { plate: uni(plateProg, 'uPlate'), res: uni(plateProg, 'uRes') };
  var ug = {};
  ['uRes', 'uAspect', 'uTanHalf', 'uPlate', 'uEnv', 'uRot', 'uRotT', 'uCenter', 'uScale', 'uBoundR', 'uTube', 'uDisp', 'uFrost']
    .forEach(function (n) { ug[n] = uni(glassProg, n); });
  var aPlate = gl.getAttribLocation(plateProg, 'aPos');
  var aGlass = gl.getAttribLocation(glassProg, 'aPos');

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  function makeTex(wrapS) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  var plateTex = makeTex(gl.CLAMP_TO_EDGE);
  var envTex = makeTex(gl.REPEAT);

  // Studio-softbox environment (NPOT-safe via CLAMP/REPEAT-less 1024x512 power-of-two)
  (function () {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var x = c.getContext('2d');
    x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, 1024, 512);
    function box(bx, by, w, h, k) {
      var g = x.createLinearGradient(bx, by, bx, by + h);
      g.addColorStop(0, 'rgba(255,255,255,' + k + ')');
      g.addColorStop(1, 'rgba(50,50,50,' + (k * 0.2) + ')');
      x.fillStyle = g; x.shadowColor = '#fff'; x.shadowBlur = 80;
      x.beginPath(); if (x.roundRect) x.roundRect(bx, by, w, h, 60); else x.rect(bx, by, w, h); x.fill();
    }
    box(50, 100, 300, 312, 1); box(674, 100, 300, 312, 1); box(350, -50, 324, 150, 0.9);
    gl.bindTexture(gl.TEXTURE_2D, envTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  })();

  var vw = 1, vh = 1, dpr = 1, plateReady = false;

  function cssVar(n, fb) { return getComputedStyle(root).getPropertyValue(n).trim() || fb; }

  function bakePlate() {
    var c = document.createElement('canvas'); c.width = vw; c.height = vh;
    var x = c.getContext('2d');
    x.fillStyle = cssVar('--bg', '#fff7eb'); x.fillRect(0, 0, vw, vh);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var fam = "'Griun Gowoon', sans-serif";
    var big = Math.min(vw * 0.2, vh * 0.34);
    x.font = '700 ' + big + 'px ' + fam;
    x.fillStyle = cssVar('--text', '#33362a');
    x.fillText('구예빈의', vw / 2, vh / 2 - big * 0.05);
    x.fillStyle = cssVar('--accent-2', '#cc3a63');
    x.font = '700 ' + big + 'px ' + fam;
    x.fillText('포트폴리오', vw / 2, vh / 2 + big * 1.0);
    var sm = Math.max(11 * dpr, big * 0.1);
    x.font = '500 ' + sm + 'px ' + "'JetBrains Mono', monospace";
    x.fillStyle = cssVar('--accent', '#a2ab73');
    x.fillText('— BACKEND DEVELOPER —', vw / 2, vh / 2 - big * 0.95);
    gl.bindTexture(gl.TEXTURE_2D, plateTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    plateReady = true;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round((canvas.clientWidth || window.innerWidth) * dpr));
    var h = Math.max(1, Math.round((canvas.clientHeight || window.innerHeight) * dpr));
    if (w === vw && h === vh) return;
    vw = canvas.width = w; vh = canvas.height = h;
    if (plateReady) bakePlate();
  }
  window.addEventListener('resize', resize);
  resize();

  // rotation helpers (column-major mat3)
  function rotYX(yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    return new Float32Array([cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx]);
  }
  function transpose(m) { return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]); }

  var DEG = Math.PI / 180, FOV = 45 * DEG, CAM = 5;
  var baseYaw = 0, basePitch = 0, tiltX = 0, tiltY = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', function (e) {
    tx = ((e.clientX / window.innerWidth) * 2 - 1) * 0.5;
    ty = (-(e.clientY / window.innerHeight) * 2 + 1) * 0.5;
  });

  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  var prev = performance.now(), elapsed = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - prev) / 1000, 0.05); prev = now; elapsed += dt;
    if (!plateReady) return;

    var k = 1 - Math.exp(-5 * dt);
    tiltX += (tx - tiltX) * k; tiltY += (ty - tiltY) * k;
    var spin = 2; // speed 100
    baseYaw += spin * 0.5 * dt; basePitch += spin * 0.2 * dt;

    var yaw = baseYaw + tiltX;
    var pitch = Math.max(-1.45, Math.min(1.45, basePitch - tiltY)) + 100 * DEG;
    var rot = rotYX(yaw, pitch), rotT = transpose(rot);

    var halfFrame = CAM * Math.tan(FOV / 2);
    var tube = 0.16;
    var refHalf = 0.8 + tube;
    var sizePct = vw / vh < 0.8 ? 70 : 60;
    var scale = (sizePct / 100) * halfFrame / refHalf;
    var aspect = vw / vh;

    gl.viewport(0, 0, vw, vh);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);

    gl.useProgram(plateProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, plateTex);
    gl.uniform1i(up.plate, 0); gl.uniform2f(up.res, vw, vh);
    gl.enableVertexAttribArray(aPlate); gl.vertexAttribPointer(aPlate, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(glassProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, plateTex); gl.uniform1i(ug.uPlate, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, envTex); gl.uniform1i(ug.uEnv, 1);
    gl.uniform2f(ug.uRes, vw, vh);
    gl.uniform1f(ug.uAspect, aspect);
    gl.uniform1f(ug.uTanHalf, Math.tan(FOV / 2));
    gl.uniformMatrix3fv(ug.uRot, false, rot);
    gl.uniformMatrix3fv(ug.uRotT, false, rotT);
    gl.uniform3f(ug.uCenter, 0, Math.sin(elapsed * 2) * 0.05, -CAM);
    gl.uniform1f(ug.uScale, scale);
    gl.uniform1f(ug.uBoundR, refHalf);
    gl.uniform1f(ug.uTube, tube);
    gl.uniform1f(ug.uDisp, 0.025);
    gl.uniform1f(ug.uFrost, 0.5);
    gl.enableVertexAttribArray(aGlass); gl.vertexAttribPointer(aGlass, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var fontReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load("700 100px 'Griun Gowoon'", '구예빈의 포트폴리오'), document.fonts.ready])
    : Promise.resolve();
  fontReady.catch(function () {}).then(function () {
    if (done) return;
    resize(); bakePlate();
    overlay.classList.add('gi-ready');
  });
  raf = requestAnimationFrame(frame);
})();
