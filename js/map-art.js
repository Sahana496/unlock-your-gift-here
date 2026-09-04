/* map-art.js — the cartography, expressed as quill strokes.
   Registers all linework into the Ink engine (nothing painted yet — the
   opening paints it progressively). Text, banner fill, and markers are
   display objects revealed alongside. */
'use strict';
window.MoM = window.MoM || {};

MoM.buildMap = function (ink) {
  const INK = MoM.INK;
  const root = new PIXI.Container();       // text + markers + fills
  const markers = new PIXI.Container();
  const reveal = [];                       // display objects to fade in with the birth

  const wob = (x, y, k = 3) => [x + Math.sin(x * 0.13 + y) * k, y + Math.cos(y * 0.11 + x) * k];
  const W = (pts, k = 3) => pts.map(([x, y]) => wob(x, y, k));
  const ellipsePts = (cx, cy, rx, ry, n = 26, wobK = 2) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(wob(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, wobK));
    }
    return pts;
  };

  // ---------- mountains (Teton range) ----------
  function peak(x, y, s) {
    ink.addStroke(W([[x - s, y], [x, y - s * 1.35], [x + s, y]]), { width: 3.4 });
    for (let i = 1; i <= 3; i++) {
      const f = i / 4;
      ink.addStroke(W([
        [x - s * f, y - s * 1.35 * (1 - f) + s * 0.12],
        [x - s * f * 0.4, y - s * 1.35 * (1 - f) + s * 0.3],
      ]), { width: 1.8, alpha: 0.55 });
    }
  }
  [[300, 1500, 46], [380, 1520, 60], [470, 1500, 50], [560, 1530, 42],
   [350, 1590, 38], [450, 1585, 44], [540, 1600, 36], [630, 1580, 30]]
    .forEach(([x, y, s]) => peak(x, y, s));

  // the lake beneath
  ink.addStroke(W([[300, 1700], [360, 1680], [450, 1690], [540, 1670], [620, 1690], [660, 1720], [560, 1745], [430, 1750], [330, 1735], [300, 1700]]), { width: 2.8 });
  for (let i = 0; i < 5; i++) {
    ink.addStroke([[340 + i * 8, 1705 + i * 7], [600 - i * 14, 1702 + i * 8]], { width: 1.4, alpha: 0.4 });
  }

  // ---------- caldera contours ----------
  for (let ring = 0; ring < 4; ring++) {
    const r = 90 + ring * 42;
    const pts = [];
    const cx = 1560, cy = 700;
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.22) {
      const rr = r + Math.sin(a * 3 + ring) * 9;
      pts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.8]);
    }
    ink.addStroke(pts, { width: 1.8, alpha: 0.5 - ring * 0.07, taper: false });
  }
  // geyser vents + steam curls
  [[1700, 800], [1770, 770], [1820, 850], [1740, 880], [1860, 790]].forEach(([x, y]) => {
    ink.addStroke(ellipsePts(x, y, 6.5, 6.5, 12, 1), { width: 2.2, taper: false });
    const curl = [];
    for (let t = 0; t <= 1; t += 0.12) {
      curl.push([x + Math.sin(t * 9) * 8 * (1 - t), y - 8 - t * 38]);
    }
    ink.addStroke(curl, { width: 1.6, alpha: 0.5 });
  });

  // ---------- great lake & peninsula ----------
  ink.addStroke(W([[2560, 1560], [2660, 1440], [2720, 1300], [2760, 1160], [2820, 1020], [2900, 900], [2980, 830], [3060, 800]], 4), { width: 3.2 });
  ink.addStroke(W([[2620, 1620], [2740, 1500], [2800, 1360], [2840, 1220], [2900, 1090], [2970, 1000], [3050, 940]], 4), { width: 2.4, alpha: 0.6 });
  for (let i = 0; i < 14; i++) {
    const y = 1560 - i * 55;
    ink.addStroke([[2600 + i * 26, y], [2680 + i * 26, y - 18]], { width: 1.3, alpha: 0.4 });
  }
  ink.addStroke(W([[2680, 1240], [2740, 1130], [2790, 1020], [2850, 930]], 3), { width: 3.6 });
  ink.addStroke(ellipsePts(2884, 880, 22, 12), { width: 2.6 });
  ink.addStroke(ellipsePts(2925, 838, 12, 8), { width: 2.2 });

  // faint long road
  ink.addStroke(W([[700, 1750], [900, 1700], [1150, 1680], [1400, 1620], [1700, 1600], [2000, 1560], [2300, 1540], [2550, 1560]], 5), { width: 1.6, alpha: 0.3 });

  // ---------- journey trail: dashed strokes ----------
  MoM.LEGS.forEach((leg) => {
    const pts = leg.pts;
    let carry = 0, drawing = true, dashPts = [];
    const dash = 16, gap = 12;
    for (let i = 0; i < pts.length - 1; i++) {
      let [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const segLen = Math.hypot(x2 - x1, y2 - y1);
      const dx = (x2 - x1) / segLen, dy = (y2 - y1) / segLen;
      let travelled = 0;
      while (travelled < segLen) {
        const stepLen = Math.min((drawing ? dash : gap) - carry, segLen - travelled);
        const nx = x1 + dx * stepLen, ny = y1 + dy * stepLen;
        if (drawing) {
          if (dashPts.length === 0) dashPts.push([x1, y1]);
          dashPts.push([nx, ny]);
        }
        travelled += stepLen;
        carry += stepLen;
        if (carry >= (drawing ? dash : gap)) {
          if (drawing && dashPts.length > 1) {
            ink.addStroke(dashPts, { width: 2.8, alpha: 0.6, taper: false });
          }
          dashPts = [];
          drawing = !drawing;
          carry = 0;
        }
        x1 = nx; y1 = ny;
      }
    }
    if (dashPts.length > 1) ink.addStroke(dashPts, { width: 2.8, alpha: 0.6, taper: false });
  });

  // ---------- compass rose ----------
  const rc = { x: 340, y: 420 };
  ink.addStroke(ellipsePts(rc.x, rc.y, 52, 52, 30, 1.5), { width: 2.6, taper: false });
  ink.addStroke(ellipsePts(rc.x, rc.y, 40, 40, 26, 1.5), { width: 1.8, taper: false });
  for (let a = 0; a < 8; a++) {
    const t = (a / 8) * Math.PI * 2;
    const long = a % 2 === 0;
    ink.addStroke([[rc.x, rc.y], [rc.x + Math.cos(t) * (long ? 74 : 50), rc.y + Math.sin(t) * (long ? 74 : 50)]],
      { width: long ? 3 : 1.6, alpha: long ? 0.85 : 0.55 });
  }
  const north = new PIXI.Text('N', { fontFamily: 'MedievalSharp, Georgia, serif', fontSize: 26, fill: INK });
  north.anchor.set(0.5, 1);
  north.position.set(rc.x, rc.y - 78);
  root.addChild(north);
  reveal.push(north);

  // ---------- banner cartouche ----------
  const cart = new PIXI.Container();
  const title = new PIXI.Text('The Map of Misadventures', {
    fontFamily: 'MedievalSharp, Georgia, serif', fontSize: 46, fill: 0x2c1c0a,
  });
  title.anchor.set(0.5, 0.5);
  const sub = new PIXI.Text('a true account of two expeditions \u00B7 anno 30', {
    fontFamily: '"IM Fell English", Georgia, serif', fontStyle: 'italic', fontSize: 26, fill: 0x43290c,
  });
  sub.anchor.set(0.5, 0.5);
  const bw = title.width + 110, bh = 84;
  const CX = 1050, CY = 320;
  // banner outline as strokes (world coordinates)
  ink.addStroke(W([
    [CX - bw / 2, CY - bh / 2 + 8], [CX - bw / 4, CY - bh / 2 - 2], [CX, CY - bh / 2 - 4],
    [CX + bw / 4, CY - bh / 2 - 2], [CX + bw / 2, CY - bh / 2 + 8],
  ], 2), { width: 3 });
  ink.addStroke(W([
    [CX - bw / 2, CY + bh / 2 - 8], [CX - bw / 4, CY + bh / 2 + 2], [CX, CY + bh / 2 + 4],
    [CX + bw / 4, CY + bh / 2 + 2], [CX + bw / 2, CY + bh / 2 - 8],
  ], 2), { width: 3 });
  // forked tails
  for (const s of [-1, 1]) {
    ink.addStroke(W([
      [CX + s * bw / 2, CY - bh / 2 + 12], [CX + s * (bw / 2 + 52), CY - bh / 2 + 2],
      [CX + s * (bw / 2 + 30), CY], [CX + s * (bw / 2 + 52), CY + bh / 2 - 2],
      [CX + s * bw / 2, CY + bh / 2 - 12],
    ], 2), { width: 2.6 });
  }
  title.position.set(CX, CY - 4);
  sub.position.set(CX, CY + 62);
  cart.addChild(title, sub);
  root.addChild(cart);
  reveal.push(title, sub);


  // ---------- the geyser basins (hidden until the Field Exam is passed) ----------
  // Registered as deferred strokes: the birth skips them; solving reveals them.
  const basinStart = ink.strokes.length;
  const basinLabels = new PIXI.Container();
  {
    const lbl = (t, x, y, size = 25) => {
      const s = new PIXI.Text(t, {
        fontFamily: '"IM Fell English", Georgia, serif', fontStyle: 'italic',
        fontSize: size, fill: INK,
      });
      s.anchor.set(0.5, 0); s.position.set(x, y); s.alpha = 0.85;
      basinLabels.addChild(s);
    };
    // three basins strung along the river north-east of the Steaming Basin marker
    // LOWER: a fumarole — wavy steam rising from a small vent
    const fx0 = 1500, fy0 = 1060;
    ink.addStroke(ellipsePts(fx0, fy0, 12, 7, 14, 1), { width: 2.6, taper: false });
    for (let i = 0; i < 3; i++) {
      const sx = fx0 - 12 + i * 12, pts = [];
      for (let t = 0; t <= 1.001; t += 0.14) {
        pts.push([sx + Math.sin(t * 6.5 + i) * 8, fy0 - 8 - t * 64]);
      }
      ink.addStroke(pts, { width: 1.5, alpha: 0.5 });
    }
    lbl('Lower Basin', fx0, fy0 + 14);
    lbl('fumarole', fx0, fy0 + 44, 19);

    // MIDWAY: the great prismatic pool — concentric wobbly rings + rays
    const px0 = 1800, py0 = 960;
    ink.addStroke(ellipsePts(px0, py0, 50, 33, 34, 3), { width: 3.2, taper: false });
    ink.addStroke(ellipsePts(px0, py0, 33, 21, 26, 2.5), { width: 2.2, alpha: 0.6, taper: false });
    ink.addStroke(ellipsePts(px0, py0, 17, 11, 18, 1.5), { width: 1.8, alpha: 0.5, taper: false });
    for (let i = 0; i < 8; i++) {
      const a2 = (i / 8) * Math.PI * 2 + 0.35;
      ink.addStroke([
        [px0 + Math.cos(a2) * 56, py0 + Math.sin(a2) * 37],
        [px0 + Math.cos(a2) * 70, py0 + Math.sin(a2) * 47],
      ], { width: 1.3, alpha: 0.45 });
    }
    lbl('Midway Basin', px0, py0 + 62);
    lbl('the rainbow pool', px0, py0 + 92, 19);

    // UPPER: a geyser in eruption — cone with a tall plume and falling spray
    const gx0 = 2030, gy0 = 700;
    ink.addStroke(W([[gx0 - 20, gy0], [gx0 - 7, gy0 - 20], [gx0 + 7, gy0 - 20], [gx0 + 20, gy0]], 1), { width: 3 });
    ink.addStroke(W([[gx0 - 4, gy0 - 22], [gx0 - 7, gy0 - 112]], 1.5), { width: 2.3, alpha: 0.7 });
    ink.addStroke(W([[gx0 + 4, gy0 - 22], [gx0 + 7, gy0 - 106]], 1.5), { width: 2.3, alpha: 0.7 });
    for (let i = 0; i < 4; i++) {
      const dx = (i - 1.5) * 13;
      ink.addStroke(W([[gx0 + dx * 0.3, gy0 - 104 + Math.abs(dx)], [gx0 + dx * 1.6, gy0 - 62 + Math.abs(dx) * 1.8]], 1), { width: 1.7, alpha: 0.5 });
    }
    lbl('Upper Basin', gx0, gy0 + 16);
    lbl('geyser', gx0, gy0 + 44, 19);
  }
  const basinStrokes = [];
  for (let i = basinStart; i < ink.strokes.length; i++) {
    ink.strokes[i].deferred = true;
    basinStrokes.push(i);
  }
  basinLabels.alpha = 0;
  root.addChild(basinLabels);


  // ---------- memories along the way (revealed as the footprints walk each leg) ----------
  const memories = [];
  {
    const mkLabel = (t, x, y, size = 30) => {
      const s = new PIXI.Text(t, {
        fontFamily: '"IM Fell English", Georgia, serif', fontStyle: 'italic',
        fontSize: size, fill: INK,
      });
      s.anchor.set(0.5, 0); s.position.set(x, y); s.alpha = 0.82;
      return s;
    };
    // animals: real silhouette stamps, printed into the parchment
    const SIZES = { bison: 156, bear: 140, elk: 172, deer: 116, fox: 136, marmot: 72 };
    const FACE = { bison: -1, bear: 1, elk: 1, deer: 1, fox: 1, marmot: 1 };
    const rnd = (i) => Math.abs(Math.sin(i * 127.1 + 311.7)) % 1;

    // a tiny pine: triangle crown + trunk tick
    const pine = (x, y, s) => {
      ink.addStroke(W([[x - s * 0.55, y], [x, y - s * 1.5], [x + s * 0.55, y], [x - s * 0.55, y]], 1), { width: 1.7, alpha: 0.6, taper: false });
      ink.addStroke([[x, y], [x, y + s * 0.45]], { width: 1.6, alpha: 0.6 });
    };
    const forest = (cx, cy, n, spread) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rnd(i * 3 + cx) - 0.5) * spread * 2;
        const y = cy + (rnd(i * 7 + cy) - 0.5) * spread;
        pine(x, y, 16 + rnd(i * 13) * 11);
      }
    };
    // meadow grass tufts
    const tufts = (cx, cy, n, spread) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rnd(i * 5 + cx) - 0.5) * spread * 2;
        const y = cy + (rnd(i * 11 + cy) - 0.5) * spread;
        ink.addStroke([[x - 7, y + 6], [x, y - 9]], { width: 1.7, alpha: 0.5 });
        ink.addStroke([[x + 7, y + 6], [x + 2, y - 8]], { width: 1.7, alpha: 0.5 });
      }
    };

    const mkMem = (build) => {
      const start = ink.strokes.length;
      const labels = new PIXI.Container();
      const animals = [];
      const addAnimal = (kind, x, y, opts = {}) => {
        const tex = PIXI.Assets.get('assets/animals/' + kind + '.png');
        if (!tex) return;
        const w = opts.size ?? SIZES[kind];
        const tw = tex.width, th = tex.height;
        const cont = new PIXI.Container();
        cont.position.set(x, y);
        // articulated: body + two leg groups that scissor at the hip line
        const CUT = 0.56, OVER = 0.06;
        const sub = (rx, ry, rw, rh) => new PIXI.Texture(tex.baseTexture,
          new PIXI.Rectangle(tex.frame.x + rx, tex.frame.y + ry, rw, rh));
        const mkPart = (t2, px, py, pivX) => {
          const s = new PIXI.Sprite(t2);
          s.pivot.set(pivX, 0);
          s.position.set(px + pivX, py);
          s.blendMode = PIXI.BLEND_MODES.MULTIPLY;
          cont.addChild(s);
          return s;
        };
        const legY = -th + th * CUT;
        const legR2 = mkPart(sub(0, th * CUT, tw * 0.5, th * (1 - CUT)), -tw / 2, legY, tw * 0.25);
        const legF2 = mkPart(sub(tw * 0.5, th * CUT, tw * 0.5, th * (1 - CUT)), 0, legY, tw * 0.25);
        mkPart(sub(0, 0, tw, th * (CUT + OVER)), -tw / 2, -th, tw * 0.5);
        cont.scale.set(w / tw);
        cont.alpha = 0;
        root.addChild(cont);
        animals.push({ g: cont, legF: legF2, legR: legR2, x, y, kind,
          sx: w / tw, face: FACE[kind] || 1,
          range: opts.range ?? 26, speed: opts.speed ?? 0.35,
          bob: opts.bob ?? 1.5, phase: Math.random() * 6.28 });
      };
      build({ labels, addAnimal });
      const strokes = [];
      for (let i = start; i < ink.strokes.length; i++) { ink.strokes[i].deferred = true; strokes.push(i); }
      labels.alpha = 0;
      root.addChild(labels);
      memories.push({ strokes, labels, animals, revealed: false });
    };

    // ==== leg 0: the Tetons ====
    mkMem(({ labels, addAnimal }) => {
      labels.addChild(mkLabel('the Teton Range', 400, 1372, 38));
      labels.addChild(mkLabel('Jenny Lake', 470, 1756, 30));
      // Delta Lake: a tarn above the peaks, reached by a switchback
      ink.addStroke(W([[470, 1668], [516, 1568], [452, 1478], [506, 1392], [446, 1330]], 2), { width: 2.0, alpha: 0.55 });
      ink.addStroke(W([[340, 1250], [400, 1214], [480, 1222], [522, 1258], [500, 1306], [430, 1324], [364, 1306], [334, 1278], [340, 1250]], 4), { width: 3.8, taper: false });
      ink.addStroke([[368, 1262], [498, 1252]], { width: 1.8, alpha: 0.45 });
      ink.addStroke([[386, 1286], [478, 1282]], { width: 1.5, alpha: 0.35 });
      ink.addStroke(W([[468, 1220], [482, 1158], [470, 1100]], 2), { width: 1.8, alpha: 0.5 });
      labels.addChild(mkLabel('Delta Lake', 428, 1348, 30));
      // Snake River: south from the lake, looping through Oxbow Bend
      ink.addStroke(W([[540, 1836], [680, 1816], [774, 1828], [842, 1794], [824, 1750], [762, 1744], [744, 1780], [806, 1792], [896, 1782], [1010, 1798], [1130, 1836]], 3), { width: 3.4 });
      labels.addChild(mkLabel('Oxbow Bend', 820, 1860, 30));
      // Schwabacher Landing: a braid with still-water ticks
      ink.addStroke(W([[634, 1768], [664, 1660], [650, 1548], [692, 1456], [724, 1384]], 3), { width: 3.2 });
      ink.addStroke(W([[660, 1766], [688, 1668], [676, 1556], [714, 1466]], 3), { width: 2.2, alpha: 0.55 });
      for (let i = 0; i < 5; i++) {
        ink.addStroke([[642 + i * 11, 1690 - i * 36], [672 + i * 11, 1688 - i * 36]], { width: 1.5, alpha: 0.45 });
      }
      labels.addChild(mkLabel('Schwabacher Landing', 700, 1358, 28));
      // Signal Mountain: a broad lone dome with hachure slopes and a lookout on top
      const smx = 960, smy = 1690;
      ink.addStroke(W([[smx - 105, smy], [smx - 63, smy - 51], [smx - 15, smy - 72], [smx + 39, smy - 63], [smx + 84, smy - 30], [smx + 105, smy]], 2), { width: 3.4 });
      for (let i = 0; i < 8; i++) {
        const hx = smx - 82 + i * 23;
        const hy = smy - 8 - Math.sin((i / 7) * Math.PI) * 45;
        ink.addStroke([[hx, hy], [hx + 10, hy + 24]], { width: 1.5, alpha: 0.5 });
      }
      ink.addStroke(W([[smx - 12, smy - 72], [smx - 9, smy - 94], [smx + 12, smy - 94], [smx + 9, smy - 72]], 1), { width: 2.0 });
      ink.addStroke([[smx - 15, smy - 94], [smx + 15, smy - 94]], { width: 2.0 });
      labels.addChild(mkLabel('Signal Mountain', smx, smy + 14, 26));
      forest(230, 1480, 10, 110);
      forest(1130, 1590, 10, 115);
      addAnimal('deer', 880, 1560, { range: 40, speed: 0.3 });
      addAnimal('marmot', 560, 1290, { range: 0, speed: 0.55, bob: 6 });
    });

    // ==== leg 1: over the divide, into the caldera ====
    mkMem(({ labels, addAnimal }) => {
      // the Firehole river running down from the basins
      ink.addStroke(W([[1740, 900], [1700, 990], [1640, 1060], [1600, 1150], [1530, 1220], [1470, 1310], [1430, 1400]], 3.5), { width: 3.0 });
      ink.addStroke(W([[1620, 1020], [1480, 970], [1330, 940], [1160, 900], [1020, 850]], 3.5), { width: 2.8 });
      labels.addChild(mkLabel('the Firehole', 1608, 1180, 32));
      tufts(1270, 1120, 20, 195);
      labels.addChild(mkLabel('Fountain Flats', 1270, 1240, 32));
      forest(1120, 740, 13, 140);
      labels.addChild(mkLabel('the Madison', 1190, 918, 30));
      forest(1790, 1470, 11, 130);
      addAnimal('bison', 1330, 1520, { range: 30, speed: 0.22 });
      addAnimal('bison', 1470, 1580, { range: 24, speed: 0.26, size: 120 });
      addAnimal('bison', 1600, 1510, { caption: 'the herd, unbothered', range: 32, speed: 0.2, size: 136 });
      addAnimal('fox', 1150, 1050, { caption: 'the fox', range: 60, speed: 0.6 });
    });

    // ==== leg 2: east past the lake ====
    mkMem(({ labels, addAnimal }) => {
      // Yellowstone Lake: broad water with hatching
      ink.addStroke(W([[2140, 1400], [2300, 1355], [2470, 1370], [2620, 1430], [2700, 1530], [2660, 1660], [2500, 1740], [2300, 1750], [2140, 1680], [2080, 1540], [2140, 1400]], 5), { width: 3.6 });
      for (let i = 0; i < 9; i++) {
        ink.addStroke([[2180 + i * 16, 1440 + i * 30], [2600 - i * 22, 1436 + i * 32]], { width: 1.6, alpha: 0.4 });
      }
      labels.addChild(mkLabel('Yellowstone Lake', 2390, 1520, 44));
      // Hayden Valley meadows + Mud Volcano
      tufts(2120, 970, 24, 225);
      labels.addChild(mkLabel('Hayden Valley', 2080, 1128, 34));
      // Mud Volcano: a squat cratered cone, mid-belch
      const mvx = 2130, mvy = 1290;
      ink.addStroke(W([[mvx - 70, mvy], [mvx - 26, mvy - 54], [mvx - 13, mvy - 48], [mvx + 13, mvy - 48], [mvx + 26, mvy - 54], [mvx + 70, mvy]], 1.5), { width: 3.2 });
      ink.addStroke([[mvx - 19, mvy - 50], [mvx + 19, mvy - 50]], { width: 1.8, alpha: 0.6 });
      for (let i = 0; i < 3; i++) {
        const bx = mvx - 13 + i * 13, pts2 = [];
        for (let t = 0; t <= 1.001; t += 0.18) pts2.push([bx + Math.sin(t * 6 + i * 2) * 10, mvy - 54 - t * 62]);
        ink.addStroke(pts2, { width: 1.6, alpha: 0.5 });
      }
      ink.addStroke([[mvx - 48, mvy + 12], [mvx + 48, mvy + 15]], { width: 1.5, alpha: 0.4 });
      labels.addChild(mkLabel('Mud Volcano', mvx, mvy + 28, 27));
      forest(1940, 1270, 8, 95);
      forest(2600, 1400, 8, 95);
      addAnimal('bear', 2010, 1330, { caption: 'the commuter in a black coat', range: 75, speed: 0.28 });
    });

    // ==== leg 3: north through canyon country ====
    mkMem(({ labels, addAnimal }) => {
      // the Grand Canyon of the Yellowstone: two jagged converging walls + the falls
      ink.addStroke(W([[2370, 1160], [2430, 1050], [2470, 950], [2530, 850], [2580, 750]], 5), { width: 3.2 });
      ink.addStroke(W([[2424, 1180], [2488, 1068], [2528, 968], [2586, 868], [2634, 772]], 5), { width: 3.2 });
      for (let i = 0; i < 6; i++) {
        ink.addStroke([[2400 + i * 40, 1130 - i * 74], [2436 + i * 40, 1122 - i * 74]], { width: 1.6, alpha: 0.5 });
      }
      ink.addStroke([[2384, 1166], [2402, 1136], [2394, 1174]], { width: 3.2, alpha: 0.85 });
      labels.addChild(mkLabel('the Grand Canyon', 2610, 1120, 34));
      labels.addChild(mkLabel('of the Yellowstone', 2610, 1160, 34));
      labels.addChild(mkLabel('Lower Falls', 2330, 1180, 27));
      // Tower Fall: water off a rock shelf, spires above, splash below
      const tfx = 2920, tfy = 900;
      ink.addStroke(W([[tfx - 50, tfy], [tfx - 15, tfy - 9], [tfx + 18, tfy - 3], [tfx + 50, tfy - 12]], 1.5), { width: 3.0 });
      ink.addStroke(W([[tfx - 38, tfy - 6], [tfx - 32, tfy - 46]], 1), { width: 2.2 });
      ink.addStroke(W([[tfx + 32, tfy - 9], [tfx + 40, tfy - 52]], 1), { width: 2.2 });
      ink.addStroke(W([[tfx - 6, tfy - 3], [tfx - 9, tfy + 110]], 1.5), { width: 2.6, alpha: 0.8 });
      ink.addStroke(W([[tfx + 7, tfy - 3], [tfx + 6, tfy + 104]], 1.5), { width: 2.0, alpha: 0.6 });
      ink.addStroke([[tfx - 27, tfy + 120], [tfx + 24, tfy + 123]], { width: 1.6, alpha: 0.5 });
      ink.addStroke([[tfx - 15, tfy + 134], [tfx + 15, tfy + 134]], { width: 1.4, alpha: 0.4 });
      labels.addChild(mkLabel('Tower Fall', tfx, tfy + 150, 28));
      // Mammoth: stacked travertine terraces
      const tx = 2380, ty = 566;
      for (let i = 0; i < 5; i++) {
        ink.addStroke(W([[tx - 110 + i * 17, ty - i * 26], [tx - 46, ty - 15 - i * 26], [tx + 46, ty - 11 - i * 26], [tx + 110 - i * 17, ty - i * 26]], 2.5), { width: 2.8, alpha: 0.8 - i * 0.09, taper: false });
      }
      labels.addChild(mkLabel('Mammoth Terraces', tx, ty + 34, 32));
      // Lamar Valley: the far meadow, with its own herd
      tufts(3040, 640, 24, 240);
      labels.addChild(mkLabel('Lamar Valley', 3040, 800, 38));
      forest(2680, 1310, 10, 125);
      addAnimal('bison', 3000, 690, { range: 34, speed: 0.2, size: 110 });
      addAnimal('bison', 3110, 730, { range: 26, speed: 0.24, size: 92 });
      addAnimal('elk', 2620, 1020, { range: 28, speed: 0.24 });
    });
  }

  // ---------- location markers ----------
  MoM.LOCATIONS.forEach((loc) => {
    const c = new PIXI.Container();
    if (loc.id === 'start') {
      // a little cairn where the journey begins
      ink.addStroke(W([[loc.x - 14, loc.y + 8], [loc.x + 14, loc.y + 8]], 1), { width: 2.8 });
      ink.addStroke(W([[loc.x - 9, loc.y + 8], [loc.x - 7, loc.y - 2], [loc.x + 8, loc.y - 2], [loc.x + 10, loc.y + 8]], 1), { width: 2.2 });
      ink.addStroke(W([[loc.x - 5, loc.y - 2], [loc.x - 3, loc.y - 10], [loc.x + 4, loc.y - 10], [loc.x + 5, loc.y - 2]], 1), { width: 2.0 });
    } else if (loc.id === 'howler') {
      const g = new PIXI.Graphics();
      g.beginFill(MoM.RED, 0.95);
      g.lineStyle(2, 0x5a1008, 1);
      g.drawRoundedRect(-28, -20, 56, 40, 4);
      g.endFill();
      g.lineStyle(2.0, 0x5a1008, 0.9);
      g.moveTo(-28, -20); g.lineTo(0, 6); g.lineTo(28, -20);
      const seal = new PIXI.Graphics();
      seal.beginFill(0xd8a020, 1); seal.drawCircle(0, 3, 7.5); seal.endFill();
      c.addChild(g, seal);
    } else {
      ink.addStroke(W([[loc.x - 15, loc.y - 15], [loc.x + 15, loc.y + 15]], 1.5), { width: 4.6 });
      ink.addStroke(W([[loc.x + 15, loc.y - 15], [loc.x - 15, loc.y + 15]], 1.5), { width: 4.6 });
    }
    const label = new PIXI.Text(loc.label, {
      fontFamily: '"IM Fell English", Georgia, serif', fontStyle: 'italic', fontSize: 30, fill: INK,
    });
    label.anchor.set(0.5, 0);
    label.position.set(loc.x, loc.y + 18);
    label.alpha = 0.9;
    c.position.set(0, 0);
    c.name = loc.id;
    c.addChild(label);
    markers.addChild(c);
    reveal.push(c);
  });
  root.addChild(markers);

  return { root, markers, reveal, basinStrokes, basinLabels, memories };
};
