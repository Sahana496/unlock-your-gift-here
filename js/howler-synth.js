/* howler-synth.js — The Damaged Howler as a radio band.
   A melody is amplitude-modulated onto a hidden carrier. Decoy carriers
   broadcast junk. Unmodulated whistles hide inside the true band. Static
   and rumble cover everything. Recovery: tune a bandpass to the carrier,
   open the right bandwidth, envelope-detect, notch the whistles. */
'use strict';
window.MoM = window.MoM || {};

(() => {
  const SAMPLE_RATE = 44100;
  const DURATION = 15;
  const ANSWER = 'HAPPYBIRTHDAY';

  const CARRIER_F = 6400;                  // the true station
  const DECOYS = [
    { f: 1150, kind: 'nursery' },          // a three-note nursery loop
    { f: 2000, kind: 'faketune' },         // a dull practice scale, looping
    { f: 3000, kind: 'noise' },            // hissy junk broadcast
    { f: 4000, kind: 'sweep' },            // a woozy sweeping tone
    { f: 4550, kind: 'ochildren' },        // a certain dance from a certain tent
    { f: 8600, kind: 'beeps' },            // impatient morse-like beeps
    { f: 9300, kind: 'drone' },            // a bored steady drone
  ];
  const WHISTLES = [5900, 7100];           // inside the true band; demodulate to 500 & 700 Hz
  const PLATFORM_F = 975;                  // the old friend, still between the platforms
  const RUMBLE_TOP = 300;

  // Happy Birthday in G, in true pitch (these become the demodulated audio)
  const N = { G5: 783.99, A5: 880.0, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98 };
  const TUNE = [
    [N.G5, 0.5], [N.G5, 0.5], [N.A5, 1], [N.G5, 1], [N.C6, 1], [N.B5, 2],
    [N.G5, 0.5], [N.G5, 0.5], [N.A5, 1], [N.G5, 1], [N.D6, 1], [N.C6, 2],
    [N.G5, 0.5], [N.G5, 0.5], [N.G6, 1], [N.E6, 1], [N.C6, 1], [N.B5, 1], [N.A5, 2],
    [N.F6, 0.5], [N.F6, 0.5], [N.E6, 1], [N.C6, 1], [N.D6, 1], [N.C6, 2.5],
  ];
  const BEAT = 0.52;

  function melodyBuffer(sampleRate, duration) {
    const n = Math.floor(sampleRate * duration);
    const m = new Float32Array(n);
    let t = 0.8;
    for (const [f, beats] of TUNE) {
      const dur = beats * BEAT * 0.92;
      const start = Math.floor(t * sampleRate);
      const end = Math.min(n, Math.floor((t + dur) * sampleRate));
      const w = (2 * Math.PI * f) / sampleRate;
      const rampN = Math.floor(0.012 * sampleRate);
      for (let i = start; i < end; i++) {
        let env = 1;
        const k = i - start, kk = end - i;
        if (k < rampN) env = k / rampN;
        if (kk < rampN) env = Math.min(env, kk / rampN);
        m[i] += env * Math.sin(w * i);
      }
      t += beats * BEAT;
    }
    return m;
  }

  function mulberry(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  function synthesizeHowler(sampleRate = SAMPLE_RATE, duration = DURATION) {
    const n = Math.floor(sampleRate * duration);
    const out = new Float32Array(n);
    const rnd = mulberry(30);
    const TWO_PI = 2 * Math.PI;

    // ---- the true station: AM, melody as the program ----
    const m = melodyBuffer(sampleRate, duration);
    const wc = TWO_PI * CARRIER_F / sampleRate;
    for (let i = 0; i < n; i++) {
      out[i] += 0.30 * (1 + 0.85 * m[i]) * Math.sin(wc * i);
    }

    // ---- decoy stations ----
    // nursery station: three notes, forever (hot cross buns, roughly)
    const NURSERY = [329.63, 293.66, 261.63, 261.63, 293.66, 293.66, 329.63, 293.66, 261.63];
    const wn0 = TWO_PI * 1150 / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const idx = Math.floor(t / 0.5) % NURSERY.length;
      const prog = Math.sin(TWO_PI * NURSERY[idx] * t);
      out[i] += 0.25 * (1 + 0.85 * prog) * Math.sin(wn0 * i);
    }
    // the tent-dance station: 'hey little train, we are all jumping on...'
    // [freq, beats] — a gospel-swing hook, looping
    const OCH = [
      [329.63, 1], [329.63, 0.5], [293.66, 0.5], [261.63, 2],        // hey lit-tle train
      [261.63, 0.5], [293.66, 0.5], [329.63, 1], [329.63, 0.5],      // we are all jump-in
      [293.66, 0.5], [261.63, 1], [220.0, 1], [261.63, 2.5],         // on...
    ];
    const OCH_BEAT = 0.46;
    const OCH_LEN = OCH.reduce((a2, [, b2]) => a2 + b2, 0) * OCH_BEAT;
    const wl0 = TWO_PI * 4550 / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let tt = t % OCH_LEN, f = OCH[0][0];
      for (const [nf, nb] of OCH) {
        const d = nb * OCH_BEAT;
        if (tt < d) { f = nf; break; }
        tt -= d;
      }
      const prog = Math.sin(TWO_PI * f * t);
      out[i] += 0.24 * (1 + 0.85 * prog) * Math.sin(wl0 * i);
    }
    // fake-tune station: a looping scale, up and down, resolutely unmusical
    const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 698.46, 659.25, 587.33];
    const wf0 = TWO_PI * 2000 / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const idx = Math.floor(t / 0.42) % SCALE.length;
      const prog = Math.sin(TWO_PI * SCALE[idx] * t);
      out[i] += 0.27 * (1 + 0.85 * prog) * Math.sin(wf0 * i);
    }
    // drone station: one long bored tone
    const wdr = TWO_PI * 9300 / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      out[i] += 0.20 * (1 + 0.5 * Math.sin(TWO_PI * 190 * t)) * Math.sin(wdr * i);
    }
    // noise station: AM with lowpassed noise program
    let lpState = 0;
    const wd0 = TWO_PI * 3000 / sampleRate;
    for (let i = 0; i < n; i++) {
      lpState += 0.04 * ((rnd() * 2 - 1) - lpState);
      out[i] += 0.26 * (1 + 0.9 * lpState * 6) * Math.sin(wd0 * i);
    }
    // sweep station: AM with a slow siren
    const wd1 = TWO_PI * 4000 / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const siren = Math.sin(TWO_PI * (420 + 260 * Math.sin(TWO_PI * 0.21 * t)) * t);
      out[i] += 0.24 * (1 + 0.8 * siren) * Math.sin(wd1 * i);
    }
    // beeps station: on-off keyed
    const wd2 = TWO_PI * 8600 / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const key = (Math.floor(t * 7.3) * 2654435761 % 7) < 3 ? 1 : 0.05;
      out[i] += 0.22 * key * Math.sin(wd2 * i);
    }

    // ---- whistles inside the true band (notch work, post-demod) ----
    for (const wf of WHISTLES) {
      const w = TWO_PI * wf / sampleRate;
      const ph = rnd() * TWO_PI;
      for (let i = 0; i < n; i++) out[i] += 0.10 * Math.sin(w * i + ph);
    }

    // ---- rumble + static + the platform ghost ----
    const rumble = [];
    for (let k = 0; k < 6; k++) {
      rumble.push({ f: 50 + rnd() * (RUMBLE_TOP - 60), ph: rnd() * TWO_PI, am: 0.4 + rnd(), amPh: rnd() * TWO_PI });
    }
    const wG = TWO_PI * PLATFORM_F / sampleRate;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let v = 0;
      for (const q of rumble) {
        v += 0.10 * (0.6 + 0.4 * Math.sin(TWO_PI * q.am * t + q.amPh)) * Math.sin(TWO_PI * q.f * t + q.ph);
      }
      v += 0.030 * (rnd() * 2 - 1);        // static
      v += 0.012 * Math.sin(wG * i);       // platform 9¾
      out[i] += v;
    }

    // normalize
    let peak = 0;
    for (let i = 0; i < n; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
    const g = 0.85 / (peak || 1);
    for (let i = 0; i < n; i++) out[i] *= g;
    return out;
  }

  function goertzel(signal, f, start, end, sampleRate = SAMPLE_RATE) {
    const w = (2 * Math.PI * f) / sampleRate;
    const c = 2 * Math.cos(w);
    let s0 = 0, s1 = 0, s2 = 0;
    for (let i = start; i < end; i++) {
      s0 = signal[i] + c * s1 - s2;
      s2 = s1; s1 = s0;
    }
    return s1 * s1 + s2 * s2 - c * s1 * s2;
  }

  MoM.hsynth = {
    SAMPLE_RATE, DURATION, ANSWER, CARRIER_F, DECOYS, WHISTLES, PLATFORM_F,
    RUMBLE_TOP, TUNE, BEAT, melodyBuffer, synthesizeHowler, goertzel,
  };
})();
