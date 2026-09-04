/* sound.js — quiet procedural ambience. Starts on the oath click. */
'use strict';
window.MoM = window.MoM || {};

MoM.sound = (() => {
  let ac = null, master = null;
  let crackleTimer = null;

  function start() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.8;
    master.connect(ac.destination);

    // room tone: deep filtered noise, slow swell — an old study at night
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 240; f.Q.value = 0.6;
    const g = ac.createGain();
    g.gain.value = 0.045;
    const lfo = ac.createOscillator();
    const lfoG = ac.createGain();
    lfo.frequency.value = 0.06;
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start();
    src.connect(f); f.connect(g); g.connect(master);
    src.start();

    // mysterious drone: three detuned deep sines, slowly beating, very quiet
    const droneGain = ac.createGain();
    droneGain.gain.value = 0.0;
    droneGain.connect(master);
    [[55, 0.020], [55.6, 0.016], [82.41, 0.011], [110.3, 0.007]].forEach(([f, a]) => {
      const o = ac.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const og = ac.createGain(); og.gain.value = a;
      o.connect(og); og.connect(droneGain);
      o.start();
    });
    // airy shimmer far above (filtered noise, barely there)
    const sh = ac.createBufferSource();
    sh.buffer = buf; sh.loop = true;
    const shF = ac.createBiquadFilter();
    shF.type = 'bandpass'; shF.frequency.value = 2400; shF.Q.value = 3;
    const shG = ac.createGain(); shG.gain.value = 0.006;
    const shLfo = ac.createOscillator(); const shLfoG = ac.createGain();
    shLfo.frequency.value = 0.045; shLfoG.gain.value = 0.004;
    shLfo.connect(shLfoG); shLfoG.connect(shG.gain); shLfo.start();
    sh.connect(shF); shF.connect(shG); shG.connect(master);
    sh.start();
    // the drone breathes in over 6 seconds
    droneGain.gain.setTargetAtTime(1.0, ac.currentTime, 3.0);
    MoM._drone = droneGain;
  }

  // suspense: the drone swells and a deep sub note rises, then releases
  function suspense(dur = 3.2) {
    if (!ac) return;
    const t = ac.currentTime;
    if (MoM._drone) {
      MoM._drone.gain.cancelScheduledValues(t);
      MoM._drone.gain.setTargetAtTime(2.6, t, dur * 0.35);
      MoM._drone.gain.setTargetAtTime(1.0, t + dur, 1.5);
    }
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(36, t);
    o.frequency.linearRampToValueAtTime(52, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.8);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 1);
  }

  function blip(freq, dur, gain, type = 'bandpass') {
    if (!ac) return;
    const t = ac.currentTime;
    const n = Math.floor(ac.sampleRate * dur);
    const b = ac.createBuffer(1, n, ac.sampleRate);
    const dd = b.getChannelData(0);
    for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource();
    s.buffer = b;
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // one soft muffled footfall (called per stamped print)
  function step() { blip(380 + Math.random() * 160, 0.08, 0.12, 'lowpass'); }
  // a quill scratch for ink reveals
  function quill() {
    if (!ac) return;
    const t = ac.currentTime;
    const dur = 0.16 + Math.random() * 0.1;
    // the stroke: noise dragged through a falling bandpass, pressure wavering
    const len = Math.floor(ac.sampleRate * (dur + 0.05));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.2;
    const f0 = 2300 + Math.random() * 800;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    const g = ac.createGain();
    // pressure curve: quick bite, uneven drag, gentle lift
    const steps = 8;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1);
      const body = Math.sin(Math.PI * Math.min(1, x * 1.25));
      curve[i] = 0.034 * body * (0.7 + Math.random() * 0.5);
    }
    curve[0] = 0; curve[steps - 1] = 0;
    g.gain.setValueCurveAtTime(curve, t, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
    // the nib touching down: one tiny soft tick
    blip(900 + Math.random() * 300, 0.012, 0.014, 'lowpass');
  }
  // sustained scratching while text writes itself: one pen dragging, not chatter
  let scribble = null;
  function scribbleStart() {
    if (scribble || !ac) return;
    const t = ac.currentTime;
    // a two-second noise loop is plenty
    const len = Math.floor(ac.sampleRate * 2);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 3.6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.12);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
    // the nib wanders: pitch drifts with each stroke, pressure rises and falls smoothly
    const mod = setInterval(() => {
      if (!ac) return;
      const now = ac.currentTime;
      f.frequency.setTargetAtTime(1900 + Math.random() * 1300, now, 0.07);
      g.gain.setTargetAtTime(0.008 + Math.random() * 0.022, now, 0.06);
    }, 110 + Math.random() * 60);
    scribble = { src, g, mod };
  }
  function scribbleStop() {
    if (!scribble) return;
    const { src, g, mod } = scribble;
    scribble = null;
    clearInterval(mod);
    const now = ac.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(0, now, 0.08);
    setTimeout(() => { try { src.stop(); } catch (e) {} }, 500);
  }
  // low mysterious swell (used when the letter glows)
  function hum() {
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sine'; o.frequency.value = 72;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 1.2);
    g.gain.linearRampToValueAtTime(0, t + 3.2);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 3.4);
  }

  // paper unfolding rustle: bandpassed noise swell + a few crackle transients
  function unfold(dur = 1.2) {
    if (!ac) return;
    const t = ac.currentTime;
    // main rustle body: filtered noise with a swell-then-decay envelope
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200 + Math.random() * 1300;
    f.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);

    // a few short crackle transients scattered through the first 60%
    const crackles = 3 + Math.floor(Math.random() * 3); // 3-5
    for (let i = 0; i < crackles; i++) {
      const delay = Math.random() * dur * 0.6;
      const cAmp = 0.06 * (1 - i / crackles);
      setTimeout(() => {
        blip(1800 + Math.random() * 1500, 0.008 + Math.random() * 0.01, cAmp, 'bandpass');
      }, delay * 1000);
    }
  }

  // marmot alarm call: two sharp descending whistles
  function marmotWhistle() {
    if (!ac) return;
    const t = ac.currentTime;
    const whistle = (start, f0, f1, dur) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t + start);
      o.frequency.linearRampToValueAtTime(f1, t + start + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(0.05, t + start + 0.008);
      g.gain.linearRampToValueAtTime(0, t + start + 0.15);
      o.connect(g); g.connect(master);
      o.start(t + start); o.stop(t + start + 0.16);
    };
    whistle(0, 2900, 2500, 0.13);
    whistle(0.22, 2750, 2400, 0.13);
  }

  // bison snort: wet low rumble of noise plus a chest-tone sine
  function bisonSnort() {
    if (!ac) return;
    const t = ac.currentTime;
    const dur = 0.18;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.015);
    g.gain.linearRampToValueAtTime(0.001, t + 0.2);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);

    const o = ac.createOscillator();
    o.type = 'sine'; o.frequency.value = 70;
    const og = ac.createGain();
    og.gain.setValueAtTime(0.05, t);
    og.gain.linearRampToValueAtTime(0, t + 0.18);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.2);
  }

  // bear huff: two breathy bandpassed puffs
  function bearHuff() {
    if (!ac) return;
    const t = ac.currentTime;
    const puff = (start) => {
      const dur = 0.12;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(0.06, t + start + 0.02);
      g.gain.linearRampToValueAtTime(0, t + start + 0.14);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t + start); src.stop(t + start + dur + 0.02);
    };
    puff(0);
    puff(0.24);
  }

  return { start, step, quill, hum, suspense, scribbleStart, scribbleStop, unfold, marmotWhistle, bisonSnort, bearHuff };
})();
