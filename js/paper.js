/* paper.js — generates heavily aged parchment. Tuned to read at 0.5x zoom. */
'use strict';
window.MoM = window.MoM || {};

MoM.makeParchment = function (w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');

  let seed = 77;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };

  // base tone
  g.fillStyle = '#dbc696';
  g.fillRect(0, 0, w, h);

  // LARGE mottling — the dominant aged look (visible at any zoom)
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w, y = rnd() * h, r = 180 + rnd() * 520;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.55;
    grad.addColorStop(0, dark
      ? `rgba(150,110,55,${0.10 + rnd() * 0.14})`
      : `rgba(242,228,190,${0.10 + rnd() * 0.12})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // medium blotches
  for (let i = 0; i < 140; i++) {
    const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 120;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(140,100,45,${0.06 + rnd() * 0.10})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // coffee-ring stains (rings with darker rims)
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 110;
    g.strokeStyle = `rgba(120,80,30,${0.10 + rnd() * 0.10})`;
    g.lineWidth = 4 + rnd() * 7;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.85 + rnd() * 0.2), rnd() * Math.PI, 0, Math.PI * 2);
    g.stroke();
  }

  // fibers — thicker so they read at overview zoom
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * w, y = rnd() * h;
    const len = 5 + rnd() * 16, a = rnd() * Math.PI;
    g.strokeStyle = rnd() < 0.5
      ? `rgba(115,85,40,${0.05 + rnd() * 0.08})`
      : `rgba(250,240,210,${0.05 + rnd() * 0.08})`;
    g.lineWidth = 1 + rnd() * 1.4;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }

  // fold creases (deeper)
  const crease = (pos, vertical) => {
    const grad = vertical
      ? g.createLinearGradient(pos - 26, 0, pos + 26, 0)
      : g.createLinearGradient(0, pos - 26, 0, pos + 26);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.42, 'rgba(90,60,22,0.26)');
    grad.addColorStop(0.5, 'rgba(55,35,12,0.34)');
    grad.addColorStop(0.58, 'rgba(255,244,214,0.26)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    if (vertical) g.fillRect(pos - 26, 0, 52, h);
    else g.fillRect(0, pos - 26, w, 52);
  };
  crease(w * 0.25, true);
  crease(w * 0.5, true);
  crease(w * 0.75, true);
  crease(h * 0.5, false);

  // burned, ragged edges
  const edge = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.58);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(0.8, 'rgba(95,62,22,0.30)');
  edge.addColorStop(1, 'rgba(50,32,10,0.62)');
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);
  // ragged darker nibbles along the border
  for (let i = 0; i < 260; i++) {
    const side = Math.floor(rnd() * 4);
    const t = rnd();
    const x = side === 0 ? t * w : side === 1 ? t * w : side === 2 ? rnd() * 30 : w - rnd() * 30;
    const y = side === 0 ? rnd() * 30 : side === 1 ? h - rnd() * 30 : t * h;
    g.fillStyle = `rgba(45,28,10,${0.15 + rnd() * 0.3})`;
    g.beginPath(); g.arc(x, y, 4 + rnd() * 16, 0, Math.PI * 2); g.fill();
  }

  return cv;
};

/* dark wooden desk beneath the map */
MoM.makeDesk = function (w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  let seed = 3;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  g.fillStyle = '#1c1208';
  g.fillRect(0, 0, w, h);
  // planks
  const plankH = h / 7;
  for (let p = 0; p < 7; p++) {
    const y = p * plankH;
    g.fillStyle = `rgba(${34 + rnd() * 14},${20 + rnd() * 9},${8 + rnd() * 5},1)`;
    g.fillRect(0, y, w, plankH);
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    // wood grain
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${60 + rnd() * 30},${36 + rnd() * 16},${14 + rnd() * 8},${0.12 + rnd() * 0.15})`;
      g.lineWidth = 1 + rnd() * 1.6;
      g.beginPath();
      const yy = y + rnd() * plankH;
      g.moveTo(0, yy);
      for (let x = 0; x <= w; x += 90) {
        g.lineTo(x, yy + Math.sin(x * 0.008 + i) * 6 * rnd());
      }
      g.stroke();
    }
  }
  return cv;
};
