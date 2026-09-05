/* main.js — the world, v8 (2D, self-verified).
   Closed folio with a parted-opening seam, gatefold unravel with sweeping
   shadows, then a full-screen sheet (the desk is never seen again) and the
   ink-birth. Debug stages via ?auto= for headless screenshots. */
'use strict';
window.MoM = window.MoM || {};

(async () => {
  const W = MoM.WORLD.w, H = MoM.WORLD.h;
  const colW = W / 3;                      // legacy (creases)
  const CX = W / 2;
  const FACE_W = 1280;                     // wide folded face, like the prop
  const HALF = FACE_W / 2;                 // cover flap width
  const OUT = (W - FACE_W - 2 * HALF) / 2; // narrow outer flap (wave 2)
  const FOLIO_L = CX - HALF;
  const FOLIO_R = CX + HALF;
  const AUTO = new URLSearchParams(location.search).get('auto') || '';

  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
  try {
    await withTimeout(Promise.all([
      PIXI.Assets.load('assets/parchment.jpg'),
      PIXI.Assets.load(['assets/animals/bison.png', 'assets/animals/bear.png',
        'assets/animals/elk.png', 'assets/animals/deer.png',
        'assets/animals/fox.png', 'assets/animals/marmot.png']),
      document.fonts.load('46px MedievalSharp'),
      document.fonts.load('italic 21px "IM Fell English"'),
      document.fonts.load('22px "La Belle Aurore"'),
    ]), 4500);
  } catch { /* fallbacks */ }

  const app = new PIXI.Application({
    resizeTo: window, antialias: true, backgroundColor: 0x0d0a06,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
  });
  document.querySelector('#game').appendChild(app.view);

  const world = new PIXI.Container();
  app.stage.addChild(world);

  // a quiet dark surface: near-void with the faintest cloth grain
  const bgCv = document.createElement('canvas');
  bgCv.width = 512; bgCv.height = 512;
  const bg = bgCv.getContext('2d');
  bg.fillStyle = '#141110';
  bg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    bg.fillStyle = `rgba(${30 + Math.random() * 18},${26 + Math.random() * 14},${22 + Math.random() * 12},0.5)`;
    bg.fillRect(Math.random() * 512, Math.random() * 512, 1.4, 1.4);
  }
  const backdrop = new PIXI.TilingSprite(PIXI.Texture.from(bgCv), W * 1.8, H * 1.8);
  backdrop.position.set(-W * 0.4, -H * 0.4);
  world.addChild(backdrop);

  const sheet = new PIXI.Container();
  sheet.pivot.set(W / 2, H / 2);
  sheet.position.set(W / 2, H / 2);
  sheet.rotation = -0.018;
  world.addChild(sheet);

  // ---------- shadows ----------
  const folioShadow = new PIXI.Graphics();
  folioShadow.beginFill(0x000000, 0.62);
  folioShadow.drawRoundedRect(FOLIO_L - 20, -10, FACE_W + 44, H + 46, 20);
  folioShadow.endFill();
  folioShadow.filters = [new PIXI.BlurFilter(28)];
  sheet.addChild(folioShadow);
  const sheetShadow = new PIXI.Graphics();
  sheetShadow.beginFill(0x000000, 0.6);
  sheetShadow.drawRoundedRect(-26, -10, W + 62, H + 54, 26);
  sheetShadow.endFill();
  sheetShadow.filters = [new PIXI.BlurFilter(30)];
  sheetShadow.alpha = 0;
  sheet.addChild(sheetShadow);

  // ---------- page bulk beneath the folio ----------
  const parchTex = PIXI.Texture.from('assets/parchment.jpg');
  const base = parchTex.baseTexture;
  const tw = base.width, th = base.height;
  const bulk = new PIXI.Container();
  for (let i = 3; i >= 1; i--) {
    const layer = new PIXI.Sprite(parchTex);
    layer.width = FACE_W + i * 16; layer.height = H + i * 12;
    layer.position.set(FOLIO_L - i * 8 + i * 2, -i * 4 + i * i * 1.5);
    layer.tint = [0xffffff, 0xB09468, 0x8f7550, 0x6f5a3c][i];
    bulk.addChild(layer);
  }
  sheet.addChild(bulk);

  // ---------- texture slices (pixel-mapped to world columns) ----------
  const px = tw / W;                       // world -> texture scale
  const fr = (wx, ww) => new PIXI.Texture(base, new PIXI.Rectangle(wx * px, 0, ww * px, th));

  // world column layout when open:
  // [0..OUT][OUT..OUT+HALF][FACE][symmetric right side]
  const L2X = 0, L1X = OUT, FACEX = OUT + HALF;      // = FOLIO_L
  const R1X = FOLIO_R, R2X = FOLIO_R + HALF;

  // the wide face inside the folio footprint
  const core = new PIXI.Sprite(fr(FACEX, FACE_W));
  core.position.set(FOLIO_L, 0);
  core.width = FACE_W; core.height = H;
  sheet.addChild(core);

  // cover flaps lying ON the face, meeting at the parted seam
  const coverL = new PIXI.Sprite(fr(L1X, HALF));
  coverL.position.set(FOLIO_L, 0);
  coverL.width = HALF - 6; coverL.height = H;          // 6px shy: the gap
  const coverR = new PIXI.Sprite(fr(R1X, HALF));
  coverR.anchor.set(1, 0);
  coverR.position.set(FOLIO_R, 0);
  coverR.width = HALF - 6; coverR.height = H;
  sheet.addChild(coverL, coverR);

  // ---------- the parted opening ----------
  // dark interior gap with uneven wavy edges + curl shading + rim light
  const seamCv = document.createElement('canvas');
  seamCv.width = 340; seamCv.height = 2048;
  const sg = seamCv.getContext('2d');
  for (let y = 0; y < 2048; y += 2) {
    const u = y / 2048;
    const wob = Math.sin(y * 0.004) * 5 + Math.sin(y * 0.015) * 2.5;
    const cx = 170 + wob;
    const gapW = 5 + 6 * Math.sin(u * Math.PI);
    // soft interior shadow (a fold parting, not a tear)
    const inner = sg.createLinearGradient(cx - gapW * 2, y, cx + gapW * 2, y);
    inner.addColorStop(0, 'rgba(0,0,0,0)');
    inner.addColorStop(0.5, 'rgba(46, 28, 10, 0.55)');
    inner.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = inner;
    sg.fillRect(cx - gapW * 2, y, gapW * 4, 2);
    // gentle rim light on the parted edges
    sg.fillStyle = 'rgba(255, 240, 205, 0.20)';
    sg.fillRect(cx - gapW - 2, y, 2.5, 2);
    sg.fillRect(cx + gapW, y, 2.5, 2);
    // broad soft curl shading rolling away
    const roll = sg.createLinearGradient(cx - 90, y, cx - gapW, y);
    roll.addColorStop(0, 'rgba(0,0,0,0)');
    roll.addColorStop(1, 'rgba(80, 52, 18, 0.22)');
    sg.fillStyle = roll;
    sg.fillRect(cx - 90, y, 90 - gapW, 2);
    const rollR = sg.createLinearGradient(cx + gapW, y, cx + 90, y);
    rollR.addColorStop(0, 'rgba(80, 52, 18, 0.22)');
    rollR.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = rollR;
    sg.fillRect(cx + gapW, y, 90 - gapW, 2);
  }
  const seam = new PIXI.Sprite(PIXI.Texture.from(seamCv));
  seam.anchor.set(0.5, 0);
  seam.position.set(CX, 0);
  seam.width = 300; seam.height = H;
  sheet.addChild(seam);

  // sweeping shadow used while flaps move
  const sweepCv = document.createElement('canvas');
  sweepCv.width = 128; sweepCv.height = 8;
  const swg = sweepCv.getContext('2d');
  const swgrad = swg.createLinearGradient(0, 0, 128, 0);
  swgrad.addColorStop(0, 'rgba(0,0,0,0.5)');
  swgrad.addColorStop(1, 'rgba(0,0,0,0)');
  swg.fillStyle = swgrad;
  swg.fillRect(0, 0, 128, 8);
  const sweepTex = PIXI.Texture.from(sweepCv);

  // full sheet + creases (hidden until unravel completes)
  const paper = new PIXI.Sprite(parchTex);
  paper.width = W; paper.height = H;
  paper.alpha = 0;
  sheet.addChild(paper);
  const creases = new PIXI.Graphics();
  creases.lineStyle(3, 0x4a3210, 0.10);
  creases.moveTo(W / 3, 0); creases.lineTo(W / 3, H);
  creases.moveTo((W / 3) * 2, 0); creases.lineTo((W / 3) * 2, H);
  creases.moveTo(CX, 0); creases.lineTo(CX, H);
  creases.alpha = 0;
  sheet.addChild(creases);

  const ink = new MoM.Ink(W, H);
  sheet.addChild(ink.sprite);
  const art = MoM.buildMap(ink);
  art.reveal.forEach((o) => { o.alpha = 0; });
  sheet.addChild(art.root);

  // ---------- fog ----------
  const fogCv = document.createElement('canvas');
  const FOG_SCALE = 0.25;
  fogCv.width = W * FOG_SCALE; fogCv.height = H * FOG_SCALE;
  const fogCtx = fogCv.getContext('2d');
  const fogTex = PIXI.Texture.from(fogCv);
  const fog = new PIXI.Sprite(fogTex);
  fog.scale.set(1 / FOG_SCALE);
  fog.alpha = 0;
  function fogFill() {
    fogCtx.globalCompositeOperation = 'source-over';
    fogCtx.fillStyle = 'rgba(20, 14, 8, 0.93)';
    fogCtx.fillRect(0, 0, fogCv.width, fogCv.height);
  }
  function fogReveal(x, y, r) {
    fogCtx.globalCompositeOperation = 'destination-out';
    const sx = x * FOG_SCALE, sy = y * FOG_SCALE, sr = r * FOG_SCALE;
    const grad = fogCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.95)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    fogCtx.fillStyle = grad;
    fogCtx.beginPath(); fogCtx.arc(sx, sy, sr, 0, Math.PI * 2); fogCtx.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.sin(x + i) * 0.6;
      fogCtx.beginPath();
      fogCtx.arc(sx + Math.cos(a) * sr * (0.8 + 0.25 * Math.sin(i * 3 + y)),
                 sy + Math.sin(a) * sr * (0.8 + 0.25 * Math.cos(i * 2 + x)),
                 sr * (0.14 + 0.1 * Math.abs(Math.sin(i + x * 0.01))), 0, Math.PI * 2);
      fogCtx.fill();
    }
    fogTex.baseTexture.update();
  }
  fogFill();
  fogReveal(MoM.LOCATIONS[0].x, MoM.LOCATIONS[0].y, 640);
  fogReveal(1050, 320, 560);

  const printsLayer = new PIXI.Container();
  sheet.addChild(printsLayer);
  sheet.addChild(fog);

  const letterLoc = MoM.LOCATIONS.find((l) => l.id === 'howler');
  const letterGlow = new PIXI.Graphics();
  letterGlow.beginFill(MoM.RED, 0.5);
  letterGlow.drawCircle(0, 0, 46);
  letterGlow.endFill();
  letterGlow.filters = [new PIXI.BlurFilter(24)];
  letterGlow.position.set(letterLoc.x, letterLoc.y);
  letterGlow.alpha = 0;
  sheet.addChild(letterGlow);

  const steamLayer = new PIXI.Container();
  steamLayer.alpha = 0;
  sheet.addChild(steamLayer);
  const wisps = [];
  for (let i = 0; i < 12; i++) {
    const s = new PIXI.Graphics();
    s.beginFill(0xf4ead2, 0.22);
    s.drawEllipse(0, 0, 30 + i * 4, 14 + i * 2);
    s.endFill();
    s.filters = [new PIXI.BlurFilter(8)];
    steamLayer.addChild(s);
    wisps.push({ s, seed: i * 37 });
  }

  const walker = { x: MoM.LOCATIONS[0].x, y: MoM.LOCATIONS[0].y, lastX: 0, lastY: 0, side: 1, dist: 0 };
  function stampPrint(x, y, angle, side) {
    const p = new PIXI.Graphics();
    p.beginFill(0x2c1c0a, 0.9);
    p.drawEllipse(0, 0, 3.6, 6.6);
    p.drawEllipse(0, -8.6, 2.2, 2.7);
    p.endFill();
    p.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    p.position.set(x + Math.cos(angle + Math.PI / 2) * 7 * side,
                   y + Math.sin(angle + Math.PI / 2) * 7 * side);
    p.rotation = angle + Math.PI / 2;
    printsLayer.addChild(p);
    gsap.to(p, { alpha: 0, duration: 2.6, delay: 0.9, ease: 'power1.in', onComplete: () => p.destroy() });
    MoM.sound.step();
  }
  function walkLeg(legIndex, onDone) {
    revealMemories(legIndex);
    const pts = MoM.LEGS[legIndex].pts.map(([x, y]) => ({ x, y }));
    walker.lastX = walker.x; walker.lastY = walker.y; walker.dist = 0;
    const tl = gsap.timeline({ onComplete: onDone });
    for (let i = 1; i < pts.length; i++) {
      const seg = pts[i], prev = pts[i - 1];
      const len = Math.hypot(seg.x - prev.x, seg.y - prev.y);
      tl.to(walker, {
        x: seg.x, y: seg.y, duration: len / 92, ease: 'none',
        onUpdate: () => {
          const dx = walker.x - walker.lastX, dy = walker.y - walker.lastY;
          walker.dist += Math.hypot(dx, dy);
          if (walker.dist > 26) {
            walker.dist = 0; walker.side *= -1;
            stampPrint(walker.x, walker.y, Math.atan2(dy, dx), walker.side);
            fogReveal(walker.x, walker.y, 700);
          }
          walker.lastX = walker.x; walker.lastY = walker.y;
        },
      });
    }
    return tl;
  }

  // ---------- camera ----------
  const camera = { x: CX, y: H / 2, zoom: 1, follow: null, clamped: false };
  function fitFolioZoom() {
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;
    return Math.min(sw / (FACE_W * 1.55), sh / (H * 1.08));
  }
  function coverZoom() {
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;
    return Math.max(sw / W, sh / H) * 1.02;
  }
  camera.zoom = fitFolioZoom();
  function applyCamera() {
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;
    if (camera.clamped) {
      const minZoom = coverZoom() / 1.02;
      if (camera.zoom < minZoom) camera.zoom = minZoom;
      const viewW = sw / camera.zoom, viewH = sh / camera.zoom;
      camera.x = Math.max(viewW / 2, Math.min(W - viewW / 2, camera.x));
      camera.y = Math.max(viewH / 2, Math.min(H - viewH / 2, camera.y));
    }
    world.scale.set(camera.zoom);
    world.position.set(sw / 2 - camera.x * camera.zoom, sh / 2 - camera.y * camera.zoom);
  }
  function clampTarget(x, y, zoom) {
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;
    const viewW = sw / zoom, viewH = sh / zoom;
    return {
      x: Math.max(viewW / 2, Math.min(W - viewW / 2, x)),
      y: Math.max(viewH / 2, Math.min(H - viewH / 2, y)),
    };
  }
  const worldToScreen = (x, y) => {
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;
    return [sw / 2 + (x - camera.x) * camera.zoom, sh / 2 + (y - camera.y) * camera.zoom];
  };

  // ---------- candle + grade ----------
  const candleFrag = `
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform vec2 uLight;
    uniform float uFlick;
    uniform float uAspect;
    void main(void) {
      vec4 c = texture2D(uSampler, vTextureCoord);
      vec2 d = vTextureCoord - uLight;
      d.x *= uAspect;
      float dist = length(d);
      float glow = smoothstep(0.72, 0.0, dist);
      float b = 0.40 + (1.05 + uFlick) * glow;
      c.rgb *= b;
      c.rgb += vec3(1.0, 0.72, 0.34) * pow(glow, 2.5) * (0.22 + uFlick * 0.6);
      gl_FragColor = c;
    }`;
  const candle = new PIXI.Filter(undefined, candleFrag, { uLight: [0.5, 0.45], uFlick: 0, uAspect: 1 });
  let grade = null;
  if (PIXI.filters && PIXI.filters.OldFilmFilter) {
    grade = new PIXI.filters.OldFilmFilter({
      sepia: 0, noise: 0.04, noiseSize: 1.2,
      scratch: 0, scratchDensity: 0, scratchWidth: 1,
      vignetting: 0.26, vignettingAlpha: 0.5, vignettingBlur: 0.3,
    });
  }
  const desat = new PIXI.ColorMatrixFilter();
  desat.saturate(-0.45, false);
  app.stage.filters = grade ? [candle, desat, grade] : [candle, desat];
  app.stage.filterArea = app.renderer.screen;

  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; });

  // ---------- DOM ink overlay on the folio face ----------
  const inkwrite = document.querySelector('#inkwrite');
  const plines = document.querySelector('#plines');
  const poath = document.querySelector('#poath');
  const hint = document.querySelector('#hint');
  let introActive = true;
  function syncOverlay() {
    if (!introActive) { inkwrite.style.opacity = 0; return; }
    const [x1, y1] = worldToScreen(FOLIO_L + FACE_W * 0.08, H * 0.15);
    const [x2, y2] = worldToScreen(FOLIO_R - FACE_W * 0.08, H * 0.85);
    inkwrite.style.left = `${x1}px`;
    inkwrite.style.top = `${y1}px`;
    inkwrite.style.width = `${x2 - x1}px`;
    inkwrite.style.height = `${y2 - y1}px`;
    const hpx = y2 - y1;
    inkwrite.style.setProperty('--title-size', `${hpx * 0.043}px`);
    inkwrite.style.setProperty('--body-size', `${hpx * 0.034}px`);
    inkwrite.style.setProperty('--oath-size', `${hpx * 0.038}px`);
  }

  // ---------- ticker ----------
  let t = 0;
  const fx = { flickBoost: 0, tremble: 0, settle: 0 };
  app.ticker.add(() => {
    const t = performance.now() / 1000;
    for (const an of memAnims) {
      if (an.range > 0) {
        // stop-and-go: amble a few steps, pause, amble back
        const p = t * an.speed + an.phase;
        const seg = Math.floor(p), f = p - seg;
        const MOVE = 0.42;                      // fraction of each beat spent walking
        const mv = Math.min(1, f / MOVE);
        const e = mv * mv * (3 - 2 * mv);       // eased step
        const total = seg + e;
        const m2 = ((total % 2) + 2) % 2;
        const tri = m2 < 1 ? m2 : 2 - m2;       // ping-pong along the patrol
        an.g.x = an.x + (tri - 0.5) * an.range * 1.7;
        const dir = (((seg % 2) + 2) % 2 === 0) ? 1 : -1;
        an.g.scale.x = dir * (an.face || 1) * an.sx;
        const walking = f < MOVE;
        // footstep bobs only while actually walking
        an.g.y = an.y - (walking ? Math.abs(Math.sin((f / MOVE) * Math.PI * 3)) * 2.6 : 0);
        // the legs scissor at the hip while stepping
        if (an.legF && an.legR) {
          const sw = walking ? Math.sin((f / MOVE) * Math.PI * 6) * 0.22 : 0;
          an.legF.rotation = sw;
          an.legR.rotation = -sw;
        }
      } else {
        // the marmot: sits still, pops up to look around now and then
        const s = Math.sin(t * an.speed + an.phase);
        an.g.x = an.x;
        an.g.y = an.y - (s > 0.72 ? (s - 0.72) * 3.6 * an.bob : 0);
      }
    }
  });
  app.ticker.add((dt) => {
    t += dt / 60;
    if (camera.follow) {
      camera.x += (camera.follow.x - camera.x) * 0.045;
      camera.y += (camera.follow.y - camera.y) * 0.045;
    }
    applyCamera();
    syncOverlay();
    const sw = app.renderer.width / app.renderer.resolution;
    const sh = app.renderer.height / app.renderer.resolution;
    const flick = Math.sin(t * 9.3) * 0.04 + Math.sin(t * 23.7) * 0.025 + Math.sin(t * 3.1) * 0.03;
    candle.uniforms.uFlick = flick + fx.flickBoost * (0.25 + Math.sin(t * 31) * 0.2);
    candle.uniforms.uAspect = sw / sh;
    candle.uniforms.uLight[0] = pointer.x / sw;
    candle.uniforms.uLight[1] = pointer.y / sh;
    if (grade) grade.seed = Math.random();
    sheet.rotation = -0.018 * (1 - fx.settle) + fx.tremble * Math.sin(t * 43) * 0.006;
    letterGlow.scale.set(1 + Math.sin(t * 0.7) * 0.15);
    wisps.forEach(({ s, seed }, i) => {
      const cyc = ((t * 0.1 + i / wisps.length) % 1);
      s.position.set(1790 + Math.sin(t * 0.35 + seed) * 90, 880 - cyc * 340);
      s.alpha = 0.3 * Math.sin(cyc * Math.PI);
    });
    ink.flush();
  });
  applyCamera();
  addEventListener('resize', applyCamera);

  // ---------- the writing ----------
  const LINES = [
    { text: 'Messrs. Moony, Wormtail,', cls: 'title-line' },
    { text: 'Padfoot & Prongs', cls: 'title-line' },
    { text: 'offer their compliments to Professor Akarsh.', cls: '' },
    { text: 'The Map has been expecting you.', cls: '' },
    { text: 'It will show itself to those who swear.', cls: '' },
  ];
  function writeLine(line, delay, perChar = 45) {
    const el = document.createElement('p');
    el.className = `pline ${line.cls}`;
    const chars = [...line.text].map((ch) => {
      const s = document.createElement('span');
      s.className = 'pchar';
      s.innerHTML = ch === ' ' ? '&nbsp;' : ch;
      el.appendChild(s);
      return s;
    });
    plines.appendChild(el);
    setTimeout(() => MoM.sound.scribbleStart(), delay);
    chars.forEach((s, i) => setTimeout(() => s.classList.add('on'), delay + i * perChar));
    setTimeout(() => MoM.sound.scribbleStop(), delay + chars.length * perChar);
    return delay + chars.length * perChar + 550;
  }

  // ---------- puzzle progression ----------
  const ORDER = ['connections', 'fieldexam', 'crossword', 'howler'];
  let activeLoc = null;
  let pulsing = null;
  function clearPulse() {
    if (!pulsing) return;
    gsap.killTweensOf(pulsing.scale);
    gsap.killTweensOf(pulsing);
    gsap.to(pulsing.scale, { x: 1, y: 1, duration: 0.6 });
    pulsing.alpha = 0.9;
    pulsing = null;
  }
  function activate(id) {
    activeLoc = id;
    // the first place to wake also wakes the snitch
    if (!snitchStarted) { snitchStarted = true; gsap.delayedCall(5, spawnSnitch); }
    if (MoM.puzzles && MoM.puzzles.prefetch) gsap.delayedCall(3, MoM.puzzles.prefetch);
    clearPulse();
    const m2 = art.markers.getChildByName(id);
    if (!m2) return;
    // the place-name itself breathes: grows and settles, asking to be touched
    const lbl = m2.children.find((ch) => ch instanceof PIXI.Text);
    if (lbl) {
      pulsing = lbl;
      gsap.to(lbl.scale, { x: 1.22, y: 1.22, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to(lbl, { alpha: 1, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }
  }
  const ANIMAL_VOICE = { marmot: 'marmotWhistle', bison: 'bisonSnort', bear: 'bearHuff' };
  app.view.addEventListener('pointerdown', (e) => {
    if (introActive) return;
    // the creatures answer if you bother them
    for (const an of memAnims) {
      const [ax, ay] = worldToScreen(an.g.x, an.g.y);
      if (Math.hypot(e.clientX - ax, e.clientY - ay) < 52) {
        const fn = ANIMAL_VOICE[an.kind];
        if (fn && MoM.sound && MoM.sound[fn]) MoM.sound[fn]();
        gsap.fromTo(an.g, { alpha: 0.75 }, { alpha: 1, duration: 0.5 });
        return;
      }
    }
    // the snitch, if it is passing
    if (snitch && !snitch.caught) {
      const [sx2, sy2] = [snitch.g.x, snitch.g.y];
      const [px, py] = worldToScreen(sx2, sy2);
      if (Math.hypot(e.clientX - px, e.clientY - py) < 60) { catchSnitch(); return; }
    }
    // the active location responds, and so does any place already conquered
    let best = null, bestD = 90;
    for (const l of MoM.LOCATIONS) {
      if (l.id === 'start') continue;
      if (l.id !== activeLoc && !MoM.puzzles.isSolved(l.id)) continue;
      const [sx, sy] = worldToScreen(l.x, l.y);
      const d = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (d < bestD) { best = { l, sx, sy }; bestD = d; }
    }
    if (best) {
      gsap.to(camera, {
        x: best.l.x, y: best.l.y,
        zoom: Math.min(camera.zoom * 1.14, coverZoom() * 1.7),
        duration: 2.6, ease: 'power2.inOut',
      });
      MoM.puzzles.open(best.l.id, best.sx, best.sy);
    }
  });
  const memAnims = [];

  // ---------- a glint of gold, rarely ----------
  let snitch = null;
  function spawnSnitch() {
    if (snitch || introActive) { scheduleSnitch(); return; }
    const g = new PIXI.Container();
    const ball = new PIXI.Graphics();
    ball.beginFill(0xc9a227, 0.95); ball.drawCircle(0, 0, 11); ball.endFill();
    ball.lineStyle(1.6, 0x8a6d1d, 0.8); ball.drawCircle(0, 0, 11);
    ball.lineStyle(1.2, 0x8a6d1d, 0.6);
    ball.moveTo(-11, 0); ball.quadraticCurveTo(0, 4, 11, 0);
    const wingL = new PIXI.Graphics();
    wingL.lineStyle(2.6, 0xb0985a, 0.9);
    wingL.moveTo(-11, -4); wingL.quadraticCurveTo(-34, -22, -48, -9);
    wingL.lineStyle(1.6, 0xb0985a, 0.6);
    wingL.moveTo(-11, -1); wingL.quadraticCurveTo(-30, -12, -42, -3);
    const wingR = new PIXI.Graphics();
    wingR.lineStyle(2.6, 0xb0985a, 0.9);
    wingR.moveTo(11, -4); wingR.quadraticCurveTo(34, -22, 48, -9);
    wingR.lineStyle(1.6, 0xb0985a, 0.6);
    wingR.moveTo(11, -1); wingR.quadraticCurveTo(30, -12, 42, -3);
    g.addChild(wingL, ball, wingR);
    // cross the current view
    const half = (innerWidth / camera.zoom) * 0.55;
    const x0 = camera.x - half, x1 = camera.x + half;
    const y0 = camera.y + (Math.random() - 0.5) * (innerHeight / camera.zoom) * 0.4;
    g.position.set(x0, y0);
    g.alpha = 0;
    world.addChild(g);
    snitch = { g, wingL, wingR, caught: false };
    const flap = gsap.to([wingL.scale, wingR.scale], { y: 0.35, duration: 0.06, yoyo: true, repeat: -1 });
    gsap.to(g, { alpha: 1, duration: 0.5 });
    const fly = gsap.to(g, {
      x: x1, duration: 4.5, ease: 'none',
      onUpdate: () => { g.y = y0 + Math.sin(g.x * 0.02) * 26; },
      onComplete: () => {
        gsap.to(g, { alpha: 0, duration: 0.5, onComplete: () => { flap.kill(); g.destroy(); snitch = null; scheduleSnitch(); } });
      },
    });
    snitch.fly = fly; snitch.flap = flap;
  }
  function catchSnitch() {
    if (!snitch || snitch.caught) return;
    snitch.caught = true;
    snitch.fly && snitch.fly.kill();
    const g = snitch.g;
    if (MoM.sound && MoM.sound.quill) MoM.sound.quill();
    gsap.to(g.scale, { x: 1.5, y: 1.5, duration: 0.4, yoyo: true, repeat: 1 });
    // the map keeps score
    const cheer = new PIXI.Text('150 points to Gryffindor.', {
      fontFamily: '"La Belle Aurore", cursive', fontSize: 64, fill: 0x8a6d1d,
    });
    cheer.anchor.set(0.5, 1);
    cheer.position.set(g.x, g.y - 26);
    cheer.alpha = 0;
    cheer.rotation = -0.03;
    world.addChild(cheer);
    gsap.to(cheer, { alpha: 0.95, y: g.y - 66, duration: 1.4, ease: 'power2.out' });
    gsap.to(cheer, {
      alpha: 0, y: g.y - 96, duration: 2.0, delay: 2.6, ease: 'power1.in',
      onComplete: () => cheer.destroy(),
    });
    gsap.to(g, {
      alpha: 0, duration: 1.6, delay: 1.4,
      onComplete: () => { snitch.flap && snitch.flap.kill(); g.destroy(); snitch = null; scheduleSnitch(); },
    });
  }
  function scheduleSnitch() { gsap.delayedCall(150 + Math.random() * 120, spawnSnitch); }
  let snitchStarted = false;
  MoM.debugSnitch = () => spawnSnitch();
  MoM.__snitch = () => snitch && { x: snitch.g.x, y: snitch.g.y, caught: snitch.caught, screen: worldToScreen(snitch.g.x, snitch.g.y) };

  // ---------- Old Faithful, faithful ----------
  let faithfulOn = false;
  function eruption() {
    if (!faithfulOn) return;
    const gx = 2030, gy = 690;
    const jet = new PIXI.Graphics();
    world.addChild(jet);
    const p = { h: 0, a: 0.85 };
    const draw = () => {
      jet.clear();
      jet.lineStyle(2.4, 0x6a5638, p.a * 0.8);
      jet.moveTo(gx - 3, gy); jet.lineTo(gx - 6, gy - p.h);
      jet.moveTo(gx + 3, gy); jet.lineTo(gx + 6, gy - p.h * 0.94);
      jet.lineStyle(1.4, 0x8a734f, p.a * 0.5);
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 12;
        jet.moveTo(gx + dx * 0.4, gy - p.h * 0.9);
        jet.lineTo(gx + dx * 1.8, gy - p.h * 0.55);
      }
    };
    gsap.to(p, { h: 150, duration: 2.2, ease: 'power2.out', onUpdate: draw });
    gsap.to(p, { a: 0, duration: 2.4, delay: 2.6, onUpdate: draw, onComplete: () => jet.destroy() });
    gsap.delayedCall(88 + Math.random() * 10, eruption);
  }
  // the pen only scratches while ink is actually moving; overlapping writers share it
  let scribbleUsers = 0;
  function penDown() { if (++scribbleUsers === 1 && MoM.sound && MoM.sound.scribbleStart) MoM.sound.scribbleStart(); }
  function penUp() { if (--scribbleUsers <= 0) { scribbleUsers = 0; if (MoM.sound && MoM.sound.scribbleStop) MoM.sound.scribbleStop(); } }
  function writeOn(cont, baseDelay = 0) {
    cont.alpha = 1;
    let delay = baseDelay;
    let lastEnd = baseDelay;
    let any = false;
    for (const ch of [...cont.children]) {
      if (!(ch instanceof PIXI.Text)) continue;
      any = true;
      const w = ch.width, h = ch.height;
      const mk = new PIXI.Graphics();
      mk.beginFill(0xffffff);
      mk.drawRect(0, -4, w + 10, h + 12);
      mk.endFill();
      mk.position.set(ch.x - w / 2 - 5, ch.y);
      mk.scale.x = 0.001;
      cont.addChild(mk);
      ch.mask = mk;
      const dur = Math.max(0.5, w / 260);
      gsap.to(mk.scale, {
        x: 1, duration: dur, ease: 'power1.inOut', delay,
        onComplete: () => { ch.mask = null; mk.destroy(); },
      });
      lastEnd = Math.max(lastEnd, delay + dur);
      delay += 0.38;
    }
    if (any) {
      gsap.delayedCall(baseDelay, penDown);
      gsap.delayedCall(lastEnd + 0.05, penUp);
    }
  }
  function revealMemories(leg, instant = false) {
    const mem = art.memories && art.memories[leg];
    if (!mem || mem.revealed) return;
    mem.revealed = true;
    if (instant) {
      mem.strokes.forEach((i) => ink.paint(i, 1));
      mem.labels.alpha = 1;
      mem.animals.forEach((an) => { an.g.alpha = 1; memAnims.push(an); });
      return;
    }
    // ink the features in as the footprints pass
    if (mem.strokes.length) {
      const p = { f: 0 };
      gsap.to(p, {
        f: 1, duration: 4, ease: 'power1.inOut', delay: 1.2,
        onUpdate: () => mem.strokes.forEach((i) => ink.paint(i, p.f)),
      });
    }
    gsap.delayedCall(2.2, () => writeOn(mem.labels));
    mem.animals.forEach((an, k) => {
      memAnims.push(an);
      gsap.to(an.g, { alpha: 1, duration: 1.6, ease: 'power2.out', delay: 2 + k * 0.5 });
    });
  }

  function startFaithful() {
    if (faithfulOn) return;
    faithfulOn = true;
    gsap.delayedCall(20, eruption);
  }
  function revealBasins(instant = false) {
    startFaithful();
    if (!art.basinStrokes || art.basinStrokes.length === 0) return;
    if (instant) {
      art.basinStrokes.forEach((i) => ink.paint(i, 1));
      art.basinLabels.alpha = 1;
      return;
    }
    const loc = MoM.LOCATIONS.find((l) => l.id === 'fieldexam');
    const order = art.basinStrokes
      .map((i) => ({ i, d: ink.strokeDistance(i, loc.x, loc.y) }))
      .sort((a2, b2) => a2.d - b2.d);
    const maxD = order[order.length - 1].d;
    const FE = 260;
    const spread = { r: 0 };
    let tick = 0;
    gsap.to(spread, {
      r: maxD + FE, duration: 5.5, ease: 'power1.inOut', delay: 0.6,
      onUpdate: () => {
        for (const { i, d } of order) if (d < spread.r) ink.paint(i, (spread.r - d) / FE);
        if (++tick % 20 === 0) MoM.sound.quill();
      },
    });
    gsap.delayedCall(2.0, () => writeOn(art.basinLabels));
  }

  function resumeProgress(animated) {
    const idx = ORDER.findIndex((id) => !MoM.puzzles.isSolved(id));
    if (idx < 0) {
      // everything conquered: the whole country lies open, and the map signs itself again
      MoM.LEGS.forEach((leg) => leg.pts.forEach(([x, y]) => fogReveal(x, y, 700)));
      for (let k = 0; k < MoM.LEGS.length; k++) revealMemories(k, true);
      revealBasins(true);
      const t = MoM.LOCATIONS.find((l) => l.id === 'howler');
      walker.x = t.x; walker.y = t.y;
      camera.x = t.x; camera.y = t.y;
      gsap.delayedCall(1.5, finale);
      return;
    }
    const cur = idx;
    for (let k = 0; k < cur; k++) {
      MoM.LEGS[k].pts.forEach(([x, y]) => fogReveal(x, y, 700));
      revealMemories(k, true);
    }
    if (MoM.puzzles.isSolved('fieldexam')) revealBasins(true);
    const target = MoM.LOCATIONS.find((l) => l.id === ORDER[cur]);
    if (animated) {
      if (cur > 0) {
        const p0 = MoM.LEGS[cur].pts[0];
        walker.x = p0[0]; walker.y = p0[1];
      }
      camera.follow = walker;
      walkLeg(cur, () => {
        camera.follow = null;
        gsap.to(camera, { x: target.x, y: target.y - 40, duration: 1.4, ease: 'power2.out' });
        activate(ORDER[cur]);
      });
    } else {
      MoM.LEGS[cur].pts.forEach(([x, y]) => fogReveal(x, y, 700));
      revealMemories(cur, true);
      walker.x = target.x; walker.y = target.y;
      camera.x = target.x; camera.y = target.y;
      activate(ORDER[cur]);
    }
  }

  function finale() {
    // the map signs itself
    const cont = new PIXI.Container();
    const mk = (t, size, y, alpha = 1) => {
      const s = new PIXI.Text(t, {
        fontFamily: '"La Belle Aurore", cursive', fontSize: size, fill: 0x2c1a08,
      });
      s.anchor.set(0.5, 0); s.position.set(0, y); s.alpha = alpha;
      cont.addChild(s);
      return s;
    };
    mk('Mischief Managed.', 150, -160);
    mk('You may now open the gift.', 54, 50);
    mk('Happy 30th, Akarsh.', 44, 130, 0.85);
    cont.position.set(CX, H * 0.5);
    cont.alpha = 0;
    world.addChild(cont);

    // a soft hush over the country while the signature writes itself
    const hush = new PIXI.Graphics();
    hush.beginFill(0xf3e7cc, 1);
    hush.drawRect(-40, -40, W + 80, H + 80);
    hush.endFill();
    hush.alpha = 0;
    world.addChildAt(hush, world.getChildIndex(cont));

    gsap.to(camera, { x: CX, y: H * 0.52, zoom: coverZoom() * 1.0, duration: 3, ease: 'power2.inOut' });
    gsap.to(hush, { alpha: 0.42, duration: 3.2, ease: 'power2.inOut', delay: 0.6 });
    gsap.to(printsLayer, { alpha: 0, duration: 4, delay: 0.8 });
    gsap.to(fog, { alpha: 0.18, duration: 5, ease: 'power2.inOut', delay: 1 });
    gsap.to(letterGlow, { alpha: 0, duration: 2, delay: 0.4 });
    if (MoM.sound && MoM.sound.suspense) MoM.sound.suspense();
    gsap.delayedCall(2.4, () => { cont.alpha = 1; writeOn(cont, 0.2); });
    gsap.delayedCall(9, () => { if (MoM.sound && MoM.sound.hum) MoM.sound.hum(); });
  }

  MoM.puzzles.onSolved = (id) => {
    clearPulse();
    const m2 = art.markers.getChildByName(id);
    if (m2) { gsap.killTweensOf(m2); m2.alpha = 1; }
    if (id === 'fieldexam') revealBasins();
    const idx = ORDER.indexOf(id);
    const legIndex = idx + 1;
    activeLoc = null;
    if (id === 'howler') { gsap.delayedCall(0.8, finale); return; }
    if (legIndex < MoM.LEGS.length) {
      // ease the camera back out from the puzzle push-in before departing
      gsap.to(camera, { zoom: coverZoom() * 1.05, duration: 1.6, ease: 'power2.inOut' });
      gsap.delayedCall(1.2, () => {
        camera.follow = walker;
        walkLeg(legIndex, () => {
          camera.follow = null;
          const next = ORDER[idx + 1];
          const nl = MoM.LOCATIONS.find((l) => l.id === next);
          gsap.to(camera, { x: nl.x, y: nl.y - 40, duration: 1.4, ease: 'power2.out' });
          activate(next);
        });
      });
    }
  };

  let awake = false, opened = false;
  function wake(fast = false) {
    if (awake) return;
    awake = true;
    MoM.sound.start();
    hint.style.opacity = 0;
    let d = fast ? 50 : 600;
    for (const line of LINES) d = writeLine(line, d, fast ? 2 : 45);
    setTimeout(() => poath.classList.add('on'), d + (fast ? 100 : 700));
  }
  app.view.addEventListener('click', () => wake(false));
  MoM.debugCam = (x, y, z) => { camera.x = x; camera.y = y; if (z) camera.zoom = z; };
  MoM.app = app;
  MoM.debug = () => {
    const out = { activeLoc, cam: { x: camera.x, y: camera.y, z: camera.zoom }, introActive };
    out.anims = memAnims.map((a) => [Math.round(a.g.x * 10) / 10, Math.round(a.g.y * 10) / 10]);
    if (activeLoc) {
      const loc = MoM.LOCATIONS.find((l) => l.id === activeLoc);
      const [sx, sy] = worldToScreen(loc.x, loc.y);
      out.marker = [Math.round(sx), Math.round(sy)];
    }
    return out;
  };

  // ---------- the oath: suspense, then the unravel ----------
  function swear() {
    if (opened) return;
    opened = true;
    poath.classList.remove('on');
    plines.style.transition = 'opacity 1.2s ease';
    plines.style.opacity = 0;
    MoM.sound.suspense(3.0);
    gsap.to(fx, { tremble: 1, flickBoost: 1, duration: 1.2, ease: 'power2.in' });
    gsap.to(fx, { tremble: 0, flickBoost: 0, duration: 0.8, delay: 2.4 });
    gsap.delayedCall(2.6, unravel);
  }
  poath.addEventListener('click', (e) => { e.stopPropagation(); swear(); });

  // a fold piece opening about hinge hx toward dir with a sweeping shadow
  function foldOpen(tl, closedSprite, openSprite, hingeX, dir, dur, pos) {
    const shadow = new PIXI.Sprite(sweepTex);
    shadow.anchor.set(dir > 0 ? 0 : 1, 0);
    shadow.position.set(hingeX, 0);
    shadow.height = H;
    shadow.width = 0;
    shadow.alpha = 0;
    if (dir < 0) shadow.scale.x *= -1;
    sheet.addChildAt(shadow, sheet.getChildIndex(closedSprite));

    const baseClosed = closedSprite.scale.x;
    const oA = { p: 0 };
    tl.to(oA, {
      p: 1, duration: dur / 2, ease: 'power2.in',
      onUpdate: () => {
        closedSprite.scale.x = Math.max(0.001, Math.cos(oA.p * Math.PI / 2)) * baseClosed;
        const v = Math.round(255 - 120 * oA.p);
        closedSprite.tint = (v << 16) | (v << 8) | v;
        shadow.alpha = 0.65 * Math.sin(oA.p * Math.PI / 2);
        shadow.width = Math.abs(closedSprite.width) + 60;
      },
    }, pos);
    const baseOpen = Math.abs(openSprite.scale.x) / 0.001;
    const oB = { p: 0 };
    tl.add(() => { openSprite.visible = true; closedSprite.visible = false; }, '>');
    tl.to(oB, {
      p: 1, duration: dur / 2, ease: 'power2.out',
      onUpdate: () => {
        openSprite.scale.x = Math.max(0.001, Math.sin(oB.p * Math.PI / 2)) * baseOpen * 0.001 * 1000;
        const v = Math.round(135 + 120 * oB.p);
        openSprite.tint = (v << 16) | (v << 8) | v;
        shadow.alpha = 0.65 * (1 - oB.p);
        shadow.width = Math.abs(openSprite.width) + 60;
      },
    }, '>');
    tl.add(() => shadow.destroy(), '>');
  }

  function mkOpenPiece(texture, hingeX, dir, w) {
    const sp = new PIXI.Sprite(texture);
    sp.anchor.set(dir > 0 ? 0 : 1, 0);
    sp.position.set(hingeX, 0);
    sp.width = w; sp.height = H;
    sp.scale.x *= 0.001;
    sp.visible = false;
    sheet.addChildAt(sp, sheet.getChildIndex(paper));
    return sp;
  }

  function unravel() {
    // wave 1 reveals: the HALF-wide strips flanking the face
    const openL1 = mkOpenPiece(fr(L1X, HALF), FOLIO_L, -1, HALF);
    const openR1 = mkOpenPiece(fr(R1X, HALF), FOLIO_R, +1, HALF);
    // wave 2: the narrow outer flaps, hinged at the outer fold lines
    const closedL2 = new PIXI.Sprite(fr(L2X, OUT));
    closedL2.anchor.set(0, 0);
    closedL2.position.set(L1X, 0);
    closedL2.width = OUT; closedL2.height = H;
    closedL2.visible = false;
    sheet.addChildAt(closedL2, sheet.getChildIndex(paper));
    const closedR2 = new PIXI.Sprite(fr(R2X, OUT));
    closedR2.anchor.set(1, 0);
    closedR2.position.set(R2X, 0);
    closedR2.width = OUT; closedR2.height = H;
    closedR2.visible = false;
    sheet.addChildAt(closedR2, sheet.getChildIndex(paper));
    const openL2 = mkOpenPiece(fr(L2X, OUT), L1X, -1, OUT);
    const openR2 = mkOpenPiece(fr(R2X, OUT), R2X, +1, OUT);

    const tl = gsap.timeline({ onComplete: birth });
    // the parted gap widens first — a slow inhale
    tl.to(seam.scale, { x: seam.scale.x * 1.6, duration: 1.2, ease: 'power2.inOut' }, 0);
    tl.to(seam, { alpha: 0.55, duration: 1.2 }, 0);
    tl.to(seam, { alpha: 0, duration: 0.8 }, 1.1);
    // covers swing open, staggered; wave 2 overlaps wave 1's finish
    foldOpen(tl, coverL, openL1, FOLIO_L, -1, 2.2, 1.0);
    foldOpen(tl, coverR, openR1, FOLIO_R, +1, 2.2, 1.3);
    tl.call(() => MoM.sound.unfold(1.6), null, 0.55);
    tl.to(bulk, { alpha: 0, duration: 1.6 }, 1.5);
    tl.add(() => { closedL2.visible = true; closedR2.visible = true; }, 2.9);
    foldOpen(tl, closedL2, openL2, L1X, -1, 2.2, 3.1);
    foldOpen(tl, closedR2, openR2, R2X, +1, 2.2, 3.35);
    tl.call(() => MoM.sound.unfold(1.4), null, 3.05);
    tl.to(folioShadow, { alpha: 0, duration: 1.6 }, 2.6);
    tl.to(sheetShadow, { alpha: 1, duration: 1.8 }, 2.6);
    tl.to(fx, { settle: 1, duration: 2.2, ease: 'power2.out' }, 2.6);
    // ONE continuous camera move: from folio framing straight into the
    // full-screen dive, spanning the whole unravel — no hold, no seam
    tl.to(camera, {
      ...clampTarget(1500, 980, coverZoom() * 1.04), zoom: coverZoom() * 1.04,
      duration: 5.4, ease: 'power2.inOut',
    }, 1.0);
    // pieces swap for the real sheet mid-dive, invisible at speed
    tl.add(() => {
      paper.alpha = 1;
      creases.alpha = 1;
      [core, coverL, coverR, openL1, openR1, closedL2, closedR2, openL2, openR2]
        .forEach((s) => { s.visible = false; });
      introActive = false;
      camera.clamped = true;
    }, 5.7);
  }

  // ---------- the birth ----------
  function birth() {
    const origin = { x: 1500, y: 980 };
    const order = ink.strokes
      .map((_, i) => ({ i, d: ink.strokeDistance(i, origin.x, origin.y) }))
      .filter((o) => !ink.strokes[o.i].deferred);
    const maxD = Math.max(...order.map((o) => o.d));
    const spread = { r: 0 };
    const FEATHER = 420;
    const anchors = art.reveal.map((o) => {
      const loc = o.name ? MoM.LOCATIONS.find((l) => l.id === o.name) : null;
      return { o, x: loc ? loc.x : o.position.x, y: loc ? loc.y : o.position.y, done: false };
    });
    let quillTick = 0;
    const tl = gsap.timeline({ delay: 0.2 });
    tl.to(spread, {
      r: maxD + FEATHER, duration: 11, ease: 'power1.inOut',
      onUpdate: () => {
        for (const { i, d } of order) {
          if (d < spread.r) ink.paint(i, (spread.r - d) / FEATHER);
        }
        for (const a of anchors) {
          if (!a.done && Math.hypot(a.x - origin.x, a.y - origin.y) < spread.r - FEATHER * 0.4) {
            a.done = true;
            gsap.to(a.o, { alpha: 1, duration: 1.4, ease: 'power2.out' });
          }
        }
        if (++quillTick % 22 === 0) MoM.sound.quill();
      },
    }, 0);
    tl.call(() => MoM.sound.hum(), null, '+=0.8');
    tl.to(fog, { alpha: 1, duration: 3.2, ease: 'power2.inOut' });
    tl.to(letterGlow, { alpha: 0.55, duration: 2 }, '<+=1.2');
    tl.to(steamLayer, { alpha: 1, duration: 2 }, '<');
    tl.to(camera, { x: MoM.LOCATIONS[0].x, y: MoM.LOCATIONS[0].y, duration: 2.8, ease: 'power2.inOut' }, '+=0.6');
    tl.call(() => resumeProgress(true));
  }

  // ---------- debug auto-stages for headless screenshots ----------
  if (AUTO === 'folio') { /* just the opening view */ }
  if (AUTO === 'written') { wake(true); }
  if (AUTO === 'open' || AUTO === 'map') {
    wake(true);
    setTimeout(() => {
      MoM.sound.scribbleStop();
      if (AUTO === 'open') swear();
      else {
        // jump straight to the finished map state
        opened = true; introActive = false;
        paper.alpha = 1; creases.alpha = 1;
        [core, coverL, coverR, bulk, seam, folioShadow].forEach((s) => { s.visible = false; });
        sheetShadow.alpha = 1;
        fx.settle = 1;
        camera.clamped = true;
        ink.strokes.forEach((s2, i2) => { if (!s2.deferred) ink.paint(i2, 1); });
        revealMemories(0, true);
        art.reveal.forEach((o) => { o.alpha = 1; });
        resumeProgress(false);
        fog.alpha = 1;
        letterGlow.alpha = 0.55;
        steamLayer.alpha = 1;
        camera.x = MoM.LOCATIONS[0].x; camera.y = MoM.LOCATIONS[0].y;
        camera.zoom = coverZoom() * 1.05;
        const openId = new URLSearchParams(location.search).get('open');
        if (openId) setTimeout(() => MoM.puzzles.open(openId, innerWidth / 2, innerHeight / 2), 800);
      }
    }, 600);
  }
})();
