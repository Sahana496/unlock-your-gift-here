/* ink.js — the quill engine.
   All map linework is rendered as stamped brush strokes into ONE canvas that
   sits over the parchment with MULTIPLY blending, so ink darkens the paper
   grain like real ink instead of floating above it like a sticker.

   Strokes are stored as data (not drawn immediately), which makes the
   ink-spread opening possible: each stroke has a distance-from-origin and is
   painted progressively, nib stamp by nib stamp. */
'use strict';
window.MoM = window.MoM || {};

MoM.Ink = class {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cv = document.createElement('canvas');
    this.cv.width = w; this.cv.height = h;
    this.ctx = this.cv.getContext('2d');
    this.tex = PIXI.Texture.from(this.cv);
    this.sprite = new PIXI.Sprite(this.tex);
    this.sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    this.nib = this._makeNib();
    this.strokes = [];          // { pts:[[x,y],..], width, alpha, stamps:[...] }
    this._dirty = false;
    // deterministic jitter
    this._seed = 12345;
  }
  _rnd() {
    this._seed |= 0; this._seed = (this._seed + 0x6D2B79F5) | 0;
    let z = Math.imul(this._seed ^ (this._seed >>> 15), 1 | this._seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /* a soft, slightly irregular nib tip — the "brush" */
  _makeNib() {
    const s = 32;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(38, 24, 10, 0.95)');
    grad.addColorStop(0.55, 'rgba(44, 30, 14, 0.55)');
    grad.addColorStop(1, 'rgba(50, 34, 16, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    // bite a few chunks out of the tip so stamps are irregular
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(s / 2 + Math.cos(a) * s * 0.34, s / 2 + Math.sin(a) * s * 0.34,
        2 + (i % 3), 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }

  /* register a stroke; returns its index. Does NOT draw yet. */
  addStroke(pts, { width = 3, alpha = 0.9, taper = true } = {}) {
    // pre-compute nib stamps along the polyline with jitter
    const stamps = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    }
    let travelled = 0;
    width = width * 1.5;
    const step = Math.max(1.4, width * 0.42);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const segLen = Math.hypot(x2 - x1, y2 - y1);
      if (segLen < 0.001) continue;
      const dx = (x2 - x1) / segLen, dy = (y2 - y1) / segLen;
      for (let d = 0; d < segLen; d += step) {
        const f = (travelled + d) / total;                 // 0..1 along stroke
        // quill pressure: fat mid-stroke, tapered ends
        const pressure = taper ? 0.45 + 0.55 * Math.sin(Math.min(1, Math.max(0, f)) * Math.PI) : 1;
        // hand wobble drift perpendicular to travel
        const wob = (this._rnd() - 0.5) * width * 0.5;
        stamps.push({
          x: x1 + dx * d - dy * wob,
          y: y1 + dy * d + dx * wob,
          size: width * pressure * (0.8 + this._rnd() * 0.5),
          alpha: alpha * (0.78 + this._rnd() * 0.22) * (0.7 + 0.3 * pressure),
          blot: this._rnd() < 0.012,                       // occasional ink blot
        });
      }
      travelled += segLen;
    }
    this.strokes.push({ pts, stamps, drawn: 0 });
    return this.strokes.length - 1;
  }

  /* paint stroke idx fully (or up to fraction f) */
  paint(idx, f = 1) {
    const s = this.strokes[idx];
    if (!s) return true;
    const upto = Math.floor(s.stamps.length * Math.min(1, f));
    if (upto <= s.drawn) return upto >= s.stamps.length;
    const g = this.ctx;
    for (let i = s.drawn; i < upto; i++) {
      const st = s.stamps[i];
      g.globalAlpha = st.alpha;
      const sz = st.blot ? st.size * (2.2 + (i % 3)) : st.size;
      g.drawImage(this.nib, st.x - sz / 2, st.y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
    s.drawn = upto;
    this._dirty = true;
    return upto >= s.stamps.length;
  }

  paintAll() {
    for (let i = 0; i < this.strokes.length; i++) this.paint(i, 1);
  }

  /* distance of a stroke's nearest point from an origin (for spread order) */
  strokeDistance(idx, ox, oy) {
    const s = this.strokes[idx];
    let best = Infinity;
    for (const [x, y] of s.pts) {
      const d = Math.hypot(x - ox, y - oy);
      if (d < best) best = d;
    }
    return best;
  }

  flush() {
    if (this._dirty) {
      this.tex.baseTexture.update();
      this._dirty = false;
    }
  }
};

/* branching tendrils for the oath's ink-spread moment: grown as strokes */
MoM.growTendrils = function (ink, ox, oy, count = 9, reach = 900) {
  const idxs = [];
  for (let t = 0; t < count; t++) {
    const baseA = (t / count) * Math.PI * 2 + (t % 2) * 0.3;
    let x = ox, y = oy, a = baseA;
    const pts = [[x, y]];
    const segs = 26 + (t % 5) * 6;
    for (let i = 0; i < segs; i++) {
      a += (Math.sin(i * 1.7 + t * 13.7) * 0.5) * 0.55;
      const step = (reach / segs) * (0.7 + Math.abs(Math.sin(i + t)) * 0.6);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step * 0.72;                    // flatten to the page
      pts.push([x, y]);
      // occasional side-branch
      if (i > 4 && i % 9 === 0) {
        let bx = x, by = y, ba = a + (i % 2 ? 1 : -1) * 0.9;
        const bpts = [[bx, by]];
        for (let j = 0; j < 8; j++) {
          ba += Math.sin(j * 2.2 + i) * 0.3;
          bx += Math.cos(ba) * step * 0.55;
          by += Math.sin(ba) * step * 0.4;
          bpts.push([bx, by]);
        }
        idxs.push(ink.addStroke(bpts, { width: 2.2, alpha: 0.5 }));
      }
    }
    idxs.push(ink.addStroke(pts, { width: 3.2, alpha: 0.6 }));
  }
  return idxs;
};
