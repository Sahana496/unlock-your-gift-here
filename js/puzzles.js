/* puzzles.js — the challenges at each map location, presented as parchment
   overlays in the map's own ink style. Progress persists in localStorage. */
'use strict';
window.MoM = window.MoM || {};

MoM.puzzles = (() => {
  const KEY = 'map-of-misadventures-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }
  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function isSolved(id) { return !!load()[id]?.solved; }
  function markSolved(id) {
    const s = load();
    const wasSolved = !!s[id]?.solved;
    s[id] = { ...(s[id] || {}), solved: true };
    save(s);
    if (!wasSolved && api.onSolved) api.onSolved(id);
  }

  // ---------- overlay chrome ----------
  const layer = document.createElement('div');
  layer.id = 'puzzle-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <div id="puzzle-card">
      <button id="puzzle-close" type="button" aria-label="fold it away">×</button>
      <div id="puzzle-body"></div>
    </div>`;
  document.body.appendChild(layer);
  const body = layer.querySelector('#puzzle-body');
  layer.querySelector('#puzzle-close').addEventListener('click', close);
  layer.addEventListener('click', (e) => { if (e.target === layer) close(); });

  const PRETEXT = {
    connections: {
      h: 'Where four paths meet',
      body: 'Sixteen inscriptions are carved into the old signpost at the crossroads. The Messrs. swear four paths walk hidden among them \u2014 those who sort them may pass.',
      btn: 'read the inscriptions',
    },
    fieldexam: {
      h: 'The ground ahead is breathing',
      body: 'A field journal waits beneath the steam. Ten photographs survived the expedition; their names did not. The examiners request your O.W.L. practical, Professor.',
      ps: 'P.S. \u2014 I promised you a torture of my own: every geyser, named. \u2014 S.',
      btn: 'open the journal',
    },
    crossword: {
      h: 'The memory archive',
      body: 'Two expeditions \u2014 one west to the steaming country, one north-east to the peninsula \u2014 and the city between them. The Messrs. pressed every memory into the archive, where each one interlocks with the next, the way memories do. Recover them all.',
      btn: 'unfold the archive',
    },
    howler: {
      h: 'The final trail',
      body: 'Something red and furious waits at the northern edge. A damaged voice has been screaming into the fog. It is not for ears \u2014 not yet.',
      btn: 'break the seal',
    },
  };

  function swapBody(render, slow = false) {
    const card = layer.querySelector('#puzzle-card');
    const h0 = card.offsetHeight;
    const outMs = slow ? 1400 : 500;
    const morphMs = slow ? 2000 : 950;
    if (slow) body.classList.add('pt-slow');
    body.classList.add('pt-out');
    setTimeout(() => {
      body.innerHTML = '';
      render(body);
      card.style.transition = 'none';
      card.style.height = 'auto';
      const h1 = card.offsetHeight;
      card.style.height = h0 + 'px';
      void card.offsetWidth;
      card.style.transition = `height ${morphMs / 1000}s cubic-bezier(0.4, 0, 0.2, 1)`;
      card.style.height = h1 + 'px';
      body.classList.remove('pt-out');
      setTimeout(() => {
        card.style.height = ''; card.style.transition = '';
        body.classList.remove('pt-slow');
      }, morphMs + 100);
    }, outMs);
  }

  // a closing note in the same hand, then the map walks on
  const EPILOGUE = {
    connections: {
      h: 'The paths sort themselves',
      body: 'The signpost yields. Somewhere north-east of here, the ground has begun to breathe.',
      btn: 'follow the footprints',
    },
    fieldexam: {
      h: 'Outstanding.',
      body: 'Ten of ten field notes. The examiners mark your practical Outstanding \u2014 and the map inks the basins in your honor. The debt is hereby considered settled. The long road east awaits.',
      btn: 'follow the footprints',
    },
    crossword: {
      h: 'The archive closes',
      body: 'Every memory recovered and pressed back into ink. Only the red letter remains \u2014 and it has been waiting longest of all.',
      btn: 'follow the footprints',
    },
  };
  function finish(id) {
    const ep = EPILOGUE[id];
    if (!ep) { close(); markSolved(id); return; }
    swapBody((el) => {
      el.innerHTML = `
        <div class="pt-page">
          <h2 class="pt-h">${ep.h}</h2>
          <p class="pt-body">${ep.body}</p>
          <button class="pz-btn pz-btn-primary pt-btn" type="button">${ep.btn}</button>
        </div>`;
      el.querySelector('.pt-btn').addEventListener('click', () => { close(); markSolved(id); });
    });
  }

  function open(id, ox, oy) {
    body.innerHTML = '';
    layer.hidden = false;
    const card = layer.querySelector('#puzzle-card');
    // the card rises from the map at the marker itself
    const dx = (ox ?? innerWidth / 2) - innerWidth / 2;
    const dy = (oy ?? innerHeight / 2) - innerHeight / 2;
    card.style.setProperty('--rise-x', `${dx}px`);
    card.style.setProperty('--rise-y', `${dy}px`);
    card.classList.remove('is-ready');
    void card.offsetWidth;  // flush styles so the rise transition always plays
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-open')));
    const pre = PRETEXT[id];
    if (pre && !isSolved(id)) {
      body.innerHTML = `
        <div class="pt-page">
          <h2 class="pt-h">${pre.h}</h2>
          <p class="pt-body">${pre.body}</p>
          ${pre.ps ? `<p class="pt-ps">${pre.ps}</p>` : ''}
          <button class="pz-btn pz-btn-primary pt-btn" type="button">${pre.btn}</button>
        </div>`;
      body.querySelector('.pt-btn').addEventListener('click', () => swapBody((el) => MOUNT[id]?.(el)));
    } else {
      MOUNT[id]?.(body);
    }
    setTimeout(() => card.classList.add('is-ready'), 2500);
  }
  function close(slow = false) {
    if (slow) {
      layer.classList.add('is-closing-slow');
      setTimeout(() => {
        layer.classList.remove('is-open');
        layer.classList.remove('is-closing-slow');
        setTimeout(() => { layer.hidden = true; body.innerHTML = ''; }, 450);
      }, 2400);
      return;
    }
    layer.classList.remove('is-open');
    setTimeout(() => { layer.hidden = true; body.innerHTML = ''; }, 450);
  }

  // ---------- Connections: "Four paths. Sort them." ----------
  const CONNECTIONS = {
    words: ['WINDOW', 'TETON', 'DIARY', 'LIME', 'PIANO', 'CHIRP', 'KEY', 'CUP',
            'YELLOW', 'BUTTERFLY', 'LOCKET', 'CANYON', 'ALIAS', 'SAND', 'RING', 'PRISMATIC'],
    groups: [
      { id: 'grand', label: 'GRAND ___', words: ['PIANO', 'CANYON', 'TETON', 'PRISMATIC'] },
      { id: 'stone', label: '___ STONE', words: ['YELLOW', 'LIME', 'KEY', 'SAND'] },
      { id: 'signals', label: 'ORDINARY WORDS, TECHNICAL AT WORK', words: ['CHIRP', 'ALIAS', 'WINDOW', 'BUTTERFLY'] },
      { id: 'horcruxes', label: 'HORCRUXES', words: ['DIARY', 'LOCKET', 'CUP', 'RING'] },
    ],
  };

  function mountConnections(el) {
    const state = load().connections || { groups: [], mistakes: 0 };
    if (!Array.isArray(state.groups)) state.groups = [];
    let selection = [];
    let remaining = CONNECTIONS.words.filter((w) =>
      !CONNECTIONS.groups.some((g) => state.groups.includes(g.id) && g.words.includes(w)));

    el.innerHTML = `
      <p class="pz-kicker">the crossroads</p>
      <h2 class="pz-title">Four paths. Sort them.</h2>
      <p class="pz-note">Sixteen words below. They form four hidden groups of four, each sharing a common thread \u2014 a phrase they complete, a family they belong to. Tap four that walk together, then commit. Beware: some words tempt more than one path.</p>
      <div class="pz-solved" id="cx-solved"></div>
      <div class="pz-grid" id="cx-grid"></div>
      <div class="pz-actions">
        <span class="pz-mistakes" id="cx-mist"></span>
        <button class="pz-btn" id="cx-clear" type="button">scatter</button>
        <button class="pz-btn pz-btn-primary" id="cx-submit" type="button" disabled>commit</button>
      </div>`;

    const grid = el.querySelector('#cx-grid');
    const solvedEl = el.querySelector('#cx-solved');
    const mistEl = el.querySelector('#cx-mist');
    const submitBtn = el.querySelector('#cx-submit');

    function renderSolved() {
      solvedEl.innerHTML = state.groups.map((gid) => {
        const g = CONNECTIONS.groups.find((x) => x.id === gid);
        return `<div class="pz-group"><strong>${g.label}</strong><span>${g.words.join(' · ')}</span></div>`;
      }).join('');
    }
    function renderMist() {
      mistEl.textContent = state.mistakes > 0
        ? `${state.mistakes} wrong turn${state.mistakes === 1 ? '' : 's'}`
        : '';
    }
    function renderGrid() {
      grid.innerHTML = '';
      remaining.forEach((w) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pz-tile' + (selection.includes(w) ? ' is-picked' : '');
        b.textContent = w;
        b.addEventListener('click', () => {
          if (selection.includes(w)) selection = selection.filter((x) => x !== w);
          else if (selection.length < 4) selection.push(w);
          renderGrid();
          submitBtn.disabled = selection.length !== 4;
        });
        grid.appendChild(b);
      });
    }
    el.querySelector('#cx-clear').addEventListener('click', () => {
      selection = [];
      renderGrid();
      submitBtn.disabled = true;
    });
    submitBtn.addEventListener('click', () => {
      const g = CONNECTIONS.groups.find(
        (x) => !state.groups.includes(x.id) && x.words.every((w) => selection.includes(w)));
      if (g) {
        state.groups.push(g.id);
        remaining = remaining.filter((w) => !g.words.includes(w));
        selection = [];
        const s = load(); s.connections = state; save(s);
        renderSolved(); renderGrid(); renderMist();
        submitBtn.disabled = true;
        if (state.groups.length === CONNECTIONS.groups.length) {
          setTimeout(() => finish('connections'), 900);
        }
      } else {
        state.mistakes += 1;
        const s = load(); s.connections = state; save(s);
        renderMist();
        grid.classList.add('pz-shake');
        setTimeout(() => grid.classList.remove('pz-shake'), 500);
      }
    });
    renderSolved(); renderGrid(); renderMist();
  }


  // ---------- Field Exam: "The Steaming Basin" ----------
  const FIELD_ITEMS = [
    { id: 'celestine', basin: 'LOWER BASIN', ftype: ['HOT SPRING'], media: ['assets/geysers/img_9967.jpg'],
      riddle: 'The sky seems to have fallen into this pool. Its name comes from a Latin root meaning \u201Cheavenly\u201D and is shared with a pale-blue mineral.',
      accept: ['CELESTINE'], answer: 'Celestine Pool',
      note: 'About 183\u00B0F, pH 8.3. When nearby Silex Spring showed geyser activity, Celestine stirred too \u2014 neighbors answering the same subsurface change.' },
    { id: 'paintpots', basin: 'LOWER BASIN', ftype: ['MUDPOT'], media: ['assets/geysers/mudpots.mov'], video: true,
      riddle: 'No clear water here \u2014 the ground itself simmers, thick and pale. Named for an artist\u2019s supplies.',
      accept: ['PAINT'], answer: 'Fountain Paint Pots',
      note: 'Hydrogen sulfide becomes sulfuric acid near the surface and alters rhyolite into clay. The mud thickens in dry seasons, changing how its bubbles burst.' },
    { id: 'redspouter', basin: 'LOWER BASIN', ftype: ['MUDPOT', 'FUMAROLE'], media: ['assets/geysers/red-spouter.mp4'], video: true,
      riddle: 'Iron stains me the color of rust. I don\u2019t erupt and I don\u2019t pour \u2014 I spit. My name is simply the color, then the verb.',
      accept: ['RED SPOUTER', 'REDSPOUTER'], answer: 'Red Spouter',
      note: 'It can be a muddy spring, a mudpot, or a fumarole without changing identity \u2014 the water table decides which, season by season.' },
    { id: 'excelsior', basin: 'MIDWAY BASIN', ftype: ['GEYSER', 'HOT SPRING'], media: ['assets/geysers/img_0003.jpg'],
      riddle: 'Once I hurled water more than 300 feet skyward. Now I flow quietly beside a far more colorful neighbor. My name is a Latin motto for always aiming higher.',
      accept: ['EXCELSIOR'], answer: 'Excelsior Geyser',
      note: 'Its crater pours more than 4,000 gallons of hot water a minute into the Firehole River \u2014 while the Grand rainbow next door steals every gaze.' },
    { id: 'twins', basin: 'UPPER BASIN', ftype: ['HOT SPRING'], media: ['assets/geysers/img_0049.jpg', 'assets/geysers/img_0054.jpg'],
      riddle: 'Two neighboring pools share hidden plumbing: as one rises, the other may fall. One name sounds like praise; the other comes from the Greek root for color and relates to a camera flaw that splits light into colored fringes. Name either.',
      accept: ['BEAUTY', 'CHROMATIC'], answer: 'Beauty Pool & Chromatic Pool',
      note: 'Only about 150 feet apart and connected underground \u2014 their water levels can move in opposite directions.' },
    { id: 'grotto', basin: 'UPPER BASIN', ftype: ['GEYSER'], pos: 'center 72%', media: ['assets/geysers/grotto.jpg?e=2'],
      riddle: 'It looks cave-built rather than water-built: arches and openings wrapped in pale mineral stone. The cavernous shape supplied its name.',
      accept: ['GROTTO'], answer: 'Grotto Geyser',
      note: 'Its strange cone may have formed as silica coated old tree trunks; eruptions can run an hour and a half, occasionally more than a day.' },
    { id: 'spasmodic', basin: 'UPPER BASIN', ftype: ['GEYSER'], media: ['assets/geysers/spasmodic.mov'], video: true,
      riddle: 'Dozens of vents, all splashing at once in fits and starts. Its name is a diagnosis of its behavior.',
      accept: ['SPASMODIC'], answer: 'Spasmodic Geyser',
      note: 'More than twenty vents, almost always bursting or splashing \u2014 the larger play stays below about ten feet.' },
    { id: 'emerald', basin: 'NORRIS', ftype: ['HOT SPRING'], media: ['assets/geysers/img_0111.jpg'],
      riddle: 'Blue water lined with yellow sulfur \u2014 and blue plus yellow makes this gemstone.',
      accept: ['EMERALD'], answer: 'Emerald Spring',
      note: 'About 27 feet deep. Clear hot water scatters blue; sulfur paints the rim yellow; the eye mixes the rest.' },
    { id: 'porcelain', basin: 'NORRIS', ftype: ['BASIN'], media: ['assets/geysers/img_0119.jpg'],
      riddle: 'A whole basin, milky and pale, named for what the ground resembles: fine white china.',
      accept: ['PORCELAIN'], answer: 'Porcelain Basin',
      note: 'Pale siliceous sinter, laid down at less than an inch per century \u2014 yet enough to seal vents and shove pressurized water elsewhere.' },
    { id: 'cistern', basin: 'NORRIS', ftype: ['HOT SPRING'], media: ['assets/geysers/pxl_20260706_221923353.jpg'],
      riddle: 'A humble word for a water tank. When its famous neighbor \u2014 the world\u2019s tallest active geyser \u2014 erupts, this spring quietly drains.',
      accept: ['CISTERN'], answer: 'Cistern Spring',
      note: 'Tests in 1983 confirmed its connection to Steamboat Geyser: a major eruption drains Cistern, which refills over several days.' },
  ];
  const feNorm = (t) => t.toUpperCase().replace(/[^A-Z]/g, '');

  function mountFieldExam(el) {
    const state = load().fieldexam || { done: [] };
    if (!Array.isArray(state.done)) state.done = [];
    let selected = FIELD_ITEMS.find((it) => !state.done.includes(it.id))?.id || FIELD_ITEMS[0].id;

    el.innerHTML = `
      <p class="pz-kicker">the steaming basin</p>
      <h2 class="pz-title">O.W.L. Field Journal</h2>
      <p class="pz-note">Read each landscape. Recover its name.</p>
      <p class="pz-note" style="opacity:.65">If deduction runs dry, you may consult a Yellowstone map and identify it from its basin, shape, and clues.</p>
      <div class="fj-grid" id="fj-grid"></div>
      <div class="fj-detail" id="fj-detail"></div>
      <p class="fe-verdict" id="fj-verdict"></p>`;
    const grid = el.querySelector('#fj-grid');
    const detail = el.querySelector('#fj-detail');
    const verdict = el.querySelector('#fj-verdict');

    const mediaTag = (it, cls) => it.media.map((m) => it.video
      ? `<video class="${cls}" src="${m}" autoplay muted loop playsinline onloadeddata="if(this.currentTime<0.5)this.currentTime=0.8"></video>`
      : `<img class="${cls}" src="${m}" ${it.pos ? `style="object-position:${it.pos}"` : ''} alt="field photograph">`).join('');

    function renderGrid() {
      grid.innerHTML = FIELD_ITEMS.map((it) => {
        const done = state.done.includes(it.id);
        return `
          <button class="fj-thumb ${it.media.length > 1 ? 'fj-multi' : ''} ${done ? 'is-done' : ''} ${selected === it.id ? 'is-sel' : ''}"
                  data-id="${it.id}" type="button">
            ${mediaTag(it, 'fj-img')}
            ${done || selected === it.id ? '' : '<span class="fj-veil fj-cover"></span>'}
            <span class="fj-tag">${done ? it.answer : it.basin.toLowerCase()}</span>
          </button>`;
      }).join('');
      grid.querySelectorAll('.fj-thumb').forEach((b) => {
        b.addEventListener('click', () => {
          selected = b.dataset.id;
          verdict.textContent = ''; verdict.className = 'fe-verdict';
          renderGrid(); renderDetail();
        });
      });
    }

    // the examining glass: click a photograph to hold it up to the light
    detail.addEventListener('click', (e) => {
      const media = e.target.closest('.fj-detail img, .fj-detail video');
      if (!media) return;
      const box = document.createElement('div');
      box.id = 'fj-lightbox';
      const clone = media.cloneNode(true);
      clone.removeAttribute('style');
      clone.removeAttribute('class');
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      if (clone.tagName === 'VIDEO') { clone.muted = true; clone.autoplay = true; clone.loop = true; }
      box.appendChild(clone);
      document.body.appendChild(box);
      requestAnimationFrame(() => box.classList.add('is-in'));
      box.addEventListener('click', () => {
        box.classList.remove('is-in');
        setTimeout(() => box.remove(), 450);
      });
    });

    function renderDetail() {
      const it = FIELD_ITEMS.find((x) => x.id === selected);
      const done = state.done.includes(it.id);
      const station = String(FIELD_ITEMS.indexOf(it) + 1).padStart(2, '0');

      let read;
      if (done) {
        const t = it.ftype.map((x) => x.toLowerCase()).join(' / ');
        read = `
          <p class="fe-riddle"><strong>${it.answer}.</strong></p>
          <p class="fe-count" style="margin:2px 0 8px">type: ${t}</p>
          <p class="fe-riddle" style="font-size:14px">${it.note}</p>`;
      } else {
        read = `
          <p class="fe-riddle">${it.riddle}</p>
          <div class="fe-answer">
            <input id="fe-input" type="text" autocomplete="off" spellcheck="false"
                   placeholder="write its name&hellip;" aria-label="feature name">
            <button class="pz-btn pz-btn-primary" id="fe-check" type="button">identify</button>
          </div>`;
      }
      detail.innerHTML = `
        <div class="fj-big ${it.media.length > 1 ? 'fj-multi' : ''}">${mediaTag(it, 'fj-bigimg')}</div>
        <div class="fj-read">
          <p class="fe-count">station ${station} \u00B7 ${it.basin.toLowerCase()} \u00B7 ${state.done.length} of ${FIELD_ITEMS.length} field notes complete</p>
          <p class="fe-unid">${done ? 'Identified' : 'Unidentified thermal feature'}</p>
          ${read}
        </div>`;

      const input = detail.querySelector('#fe-input');
      if (input) {
        const check = () => {
          const guess = feNorm(input.value);
          if (!guess) return;
          if (it.accept.some((a) => guess.includes(feNorm(a)))) {
            state.done.push(it.id);
            const s2 = load(); s2.fieldexam = state; save(s2);
            verdict.className = 'fe-verdict fe-good';
            verdict.textContent = `${it.answer}. The name holds.`;
            renderGrid(); renderDetail();
            if (state.done.length === FIELD_ITEMS.length) {
              verdict.textContent = 'Ten of ten.';
              setTimeout(() => finish('fieldexam'), 1200);
            }
          } else {
            verdict.className = 'fe-verdict fe-bad';
            verdict.textContent = 'The Messrs. shake their heads. Look closer.';
            input.classList.add('pz-shake');
            setTimeout(() => input.classList.remove('pz-shake'), 500);
          }
        };
        detail.querySelector('#fe-check').addEventListener('click', check);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      }
    }

    renderGrid(); renderDetail();
  }



  // ---------- Crossword: "The Memory Archive" ----------
  const CW = {
    rows: 17, cols: 19,
    solution: [
      '..P.......S........',
      '..R.B....FISH.H....',
      'D.I.E.....L...E...S',
      'E.S.A.C...L.MAMMOTH',
      'LAMARVALLEY...P...R',
      'T.A...R...S.P.P.J.I',
      'A.T...C.SNAKE.E.A.M',
      'L.I.B.A.C.L.R.S.L.P',
      'A.C.I.M.H.L.I.T.A..',
      'K...G.P.O.Y.W.O.P..',
      'E...D.I.O...I.P.E..',
      '...SIGNALMOUNTAIN..',
      '....P.G.H...K.S.O..',
      '....P..FOX..L.T....',
      '.CHEESE.U...E.APPLE',
      '....R...S..........',
      '.......DEALBREAKER.',
    ],
    numbers: {
      '0-2': 1, '0-10': 2, '1-4': 3, '1-9': 4, '1-14': 5, '2-0': 6, '2-18': 7,
      '3-6': 8, '3-12': 9, '4-0': 10, '5-12': 11, '5-16': 12, '6-8': 13,
      '7-4': 14, '11-3': 15, '13-7': 16, '14-1': 17, '14-14': 18, '16-7': 19,
    },
    entries: [
      { id: '4A', number: 4, dir: 'across', row: 1, col: 9, answer: 'FISH',
        clue: "Ten years at sea, and it never once made Odysseus's menu (4)",
        hint: 'Think about the obvious food Odysseus could have caught.' },
      { id: '9A', number: 9, dir: 'across', row: 3, col: 12, answer: 'MAMMOTH',
        clue: 'Extinct, yet still growing almost a foot a year (7)',
        hint: 'An extinct animal shares its name with your favorite terraces.' },
      { id: '10A', number: 10, dir: 'across', row: 4, col: 0, answer: 'LAMARVALLEY',
        clue: 'Thirty PSI short, and two hours farther from the target (5,6)',
        hint: 'The missing PSI points to the flat tire.' },
      { id: '13A', number: 13, dir: 'across', row: 6, col: 8, answer: 'SNAKE',
        clue: 'One wound through Teton; a smaller one appeared in the Lower Basin (5)',
        hint: 'The same word names both a river and an animal.' },
      { id: '15A', number: 15, dir: 'across', row: 11, col: 3, answer: 'SIGNALMOUNTAIN',
        clue: 'Every system in your textbooks takes one in; ours produced an output no filter could clean up (6,8)',
        hint: 'In systems language, the first word can be an input.' },
      { id: '16A', number: 16, dir: 'across', row: 13, col: 7, answer: 'FOX',
        clue: "A ranger's keen eye found the first; the terraces offered a second (3)",
        hint: 'A ranger had to point out this small animal.' },
      { id: '17A', number: 17, dir: 'across', row: 14, col: 1, answer: 'CHEESE',
        clue: "The photographer's magic word \u2014 until one dinner made it unspeakable (6)",
        hint: 'What word does a photographer ask everyone to say?' },
      { id: '18A', number: 18, dir: 'across', row: 14, col: 14, answer: 'APPLE',
        clue: 'The campsite\u2019s unexpected orchard (5)',
        hint: 'The campsite had these familiar fruit trees.' },
      { id: '19A', number: 19, dir: 'across', row: 16, col: 7, answer: 'DEALBREAKER',
        clue: 'I won my three fair and square; you won yours because this kept showing up (4,7)',
        hint: 'Think of the controversial card in Monopoly Deal.' },
      { id: '1D', number: 1, dir: 'down', row: 0, col: 2, answer: 'PRISMATIC',
        clue: 'A spectrum laid flat on the ground \u2014 every band of it alive, except the blue, which runs too hot for life (9)',
        hint: 'A prism turns white light into a spectrum.' },
      { id: '2D', number: 2, dir: 'down', row: 0, col: 10, answer: 'SILLYSALLY',
        clue: 'She likes bees but not wasps, puddles but not rain (5,5)',
        hint: 'Inspect the letters shared by the things she likes.' },
      { id: '3D', number: 3, dir: 'down', row: 1, col: 4, answer: 'BEAR',
        clue: 'Just after the terraces: a jaywalker with the right of way (4)',
        hint: 'No one argues because it outweighs the car. Fur, not clothing.' },
      { id: '5D', number: 5, dir: 'down', row: 1, col: 14, answer: 'HEMPPESTOPASTA',
        clue: 'Sounds nutritious; tasted like the rope it came from (4,5,5)',
        hint: 'The rope comparison points directly to the first ingredient.' },
      { id: '6D', number: 6, dir: 'down', row: 2, col: 0, answer: 'DELTALAKE',
        clue: 'To a mathematician, a difference; to a river, an ending; to us, a bag of orange Lays and two hours that vanished (5,4)',
        hint: 'Delta has both mathematical and geographical meanings.' },
      { id: '7D', number: 7, dir: 'down', row: 2, col: 18, answer: 'SHRIMP',
        clue: 'Netted mid-ride, pre-seasoned by the lake itself (6)',
        hint: 'A small crustacean that came already salted.' },
      { id: '8D', number: 8, dir: 'down', row: 3, col: 6, answer: 'CARCAMPING',
        clue: 'A five-star stay at a zero-dollar rate \u2014 your words, not mine (3,7)',
        hint: 'The vehicle was also the hotel.' },
      { id: '11D', number: 11, dir: 'down', row: 5, col: 12, answer: 'PERIWINKLE',
        clue: "There's a wink hidden inside this shade of dawn sky (10)",
        hint: 'The letters WINK appear inside the answer.' },
      { id: '12D', number: 12, dir: 'down', row: 5, col: 16, answer: 'JALAPENO',
        clue: 'Japanese airline, an ape, a refusal \u2014 assembled, the crunch we came back for twice (8)',
        hint: 'Assemble JAL + APE + NO.' },
      { id: '13D', number: 13, dir: 'down', row: 6, col: 8, answer: 'SCHOOLHOUSE',
        clue: 'Every stone smooth as an egg \u2014 and $250 apiece if one follows you home (11)',
        hint: 'The beach is named like a place for lessons.' },
      { id: '14D', number: 14, dir: 'down', row: 7, col: 4, answer: 'BIGDIPPER',
        clue: 'An oversized ladle no kitchen can hold \u2014 best viewed from a peninsula after dark (3,6)',
        hint: 'A dipper is a ladle; this oversized one is in the sky.' },
    ],
  };

  function mountCrossword(el) {
    const state = load().crossword || { letters: {}, locked: [] };
    if (!Array.isArray(state.locked)) state.locked = [];
    if (!state.letters || typeof state.letters !== 'object') state.letters = {};
    const persist = () => { const s2 = load(); s2.crossword = state; save(s2); };

    let cur = CW.entries.find((e) => !state.locked.includes(e.id)) || CW.entries[0];
    let curCell = { r: cur.row, c: cur.col };

    const cellsOf = (e) => {
      const out = [];
      for (let i = 0; i < e.answer.length; i++) {
        out.push({ r: e.row + (e.dir === 'down' ? i : 0), c: e.col + (e.dir === 'across' ? i : 0) });
      }
      return out;
    };
    const key = (r, c) => `${r}-${c}`;
    const entriesAt = (r, c) => CW.entries.filter((e) =>
      cellsOf(e).some((p) => p.r === r && p.c === c));

    el.innerHTML = `
      <p class="pz-kicker">the long road</p>
      <h2 class="pz-title">The Memory Archive</h2>
      <p class="pz-note">Twenty memories from two expeditions, pressed into the grid. True ones set themselves in ink.</p>
      <div id="cw-grid" tabindex="0"></div>
      <div id="cw-cluebar">
        <button class="pz-btn" id="cw-prev" type="button" aria-label="previous clue">&larr;</button>
        <div id="cw-clue"></div>
        <button class="pz-btn" id="cw-next" type="button" aria-label="next clue">&rarr;</button>
      </div>
      <div class="pz-actions" style="margin-top:8px">
        <span class="pz-mistakes" id="cw-progress"></span>
      </div>`;

    const grid = el.querySelector('#cw-grid');
    const clueEl = el.querySelector('#cw-clue');
    const progEl = el.querySelector('#cw-progress');

    // build cells once
    const cellEls = {};
    for (let r = 0; r < CW.rows; r++) {
      for (let c = 0; c < CW.cols; c++) {
        const d = document.createElement('div');
        const playable = CW.solution[r][c] !== '.';
        d.className = playable ? 'cw-cell' : 'cw-block';
        if (playable) {
          const n = CW.numbers[key(r, c)];
          d.innerHTML = (n ? `<i>${n}</i>` : '') + '<b></b>';
          d.addEventListener('click', () => {
            const here = entriesAt(r, c);
            if (!here.length) return;
            if (curCell.r === r && curCell.c === c && here.length > 1) {
              cur = here.find((e) => e.id !== cur.id) || here[0]; // toggle direction
            } else {
              cur = here.find((e) => e.dir === cur.dir) || here[0];
            }
            curCell = { r, c };
            paint();
            grid.focus();
          });
          cellEls[key(r, c)] = d;
        }
        grid.appendChild(d);
      }
    }

    function lockedCell(r, c) {
      return entriesAt(r, c).some((e) => state.locked.includes(e.id));
    }

    function paint() {
      const curCells = cellsOf(cur).map((p) => key(p.r, p.c));
      for (const [k, d] of Object.entries(cellEls)) {
        const [r, c] = k.split('-').map(Number);
        d.querySelector('b').textContent = state.letters[k] || '';
        d.classList.toggle('is-word', curCells.includes(k));
        d.classList.toggle('is-cur', curCell.r === r && curCell.c === c);
        d.classList.toggle('is-locked', lockedCell(r, c));
      }
      const len = cur.answer.length;
      const enumr = cur.clue.match(/\(([\d,]+)\)$/) ? '' : ` (${len})`;
      clueEl.innerHTML = `<span class="cw-no">${cur.number} ${cur.dir}</span> ${cur.clue}${enumr}`;
      progEl.textContent = `${state.locked.length} of ${CW.entries.length} memories set`;
    }

    function checkEntries(r, c) {
      for (const e of entriesAt(r, c)) {
        const cells = cellsOf(e);
        const word = cells.map((p) => state.letters[key(p.r, p.c)] || '').join('');
        const complete = word.length === e.answer.length && !cells.some((p) => !state.letters[key(p.r, p.c)]);
        const wasLocked = state.locked.includes(e.id);
        if (complete && word === e.answer) {
          if (!wasLocked) {
            state.locked.push(e.id);
            if (window.MoM && MoM.sound && MoM.sound.quill) MoM.sound.quill();
          }
        } else {
          // the ink lifts if a set memory is disturbed
          if (wasLocked) state.locked = state.locked.filter((id) => id !== e.id);
          if (complete) {
            cells.forEach((p) => {
              const d = cellEls[key(p.r, p.c)];
              d.classList.add('pz-shake');
              setTimeout(() => d.classList.remove('pz-shake'), 500);
            });
          }
        }
      }
      persist();
      if (state.locked.length === CW.entries.length) {
        setTimeout(() => finish('crossword'), 1100);
      }
    }

    function move(delta) {
      const cells = cellsOf(cur);
      const i = cells.findIndex((p) => p.r === curCell.r && p.c === curCell.c);
      const j = Math.max(0, Math.min(cells.length - 1, i + delta));
      curCell = cells[j];
    }
    function advance() {
      // after typing: hop to the next EMPTY cell of the word (crossings skip themselves)
      const cells = cellsOf(cur);
      const i = cells.findIndex((p) => p.r === curCell.r && p.c === curCell.c);
      for (let j = i + 1; j < cells.length; j++) {
        if (!state.letters[key(cells[j].r, cells[j].c)]) { curCell = cells[j]; return; }
      }
      if (i < cells.length - 1) curCell = cells[i + 1];
    }
    function nextEntry(step) {
      const i = CW.entries.indexOf(cur);
      cur = CW.entries[(i + step + CW.entries.length) % CW.entries.length];
      const open = cellsOf(cur).find((p) => !state.letters[key(p.r, p.c)]);
      curCell = open || cellsOf(cur)[0];
    }

    grid.addEventListener('keydown', (e) => {
      const k = key(curCell.r, curCell.c);
      if (/^[a-zA-Z]$/.test(e.key)) {
        state.letters[k] = e.key.toUpperCase();
        checkEntries(curCell.r, curCell.c);
        advance();
        paint(); e.preventDefault();
      } else if (e.key === 'Backspace') {
        if (state.letters[k]) delete state.letters[k];
        else { move(-1); delete state.letters[key(curCell.r, curCell.c)]; }
        checkEntries(curCell.r, curCell.c);
        paint(); e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (cur.dir !== 'across') { const alts = entriesAt(curCell.r, curCell.c).filter((x) => x.dir === 'across'); if (alts.length) cur = alts[0]; }
        else move(e.key === 'ArrowRight' ? 1 : -1);
        paint(); e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (cur.dir !== 'down') { const alts = entriesAt(curCell.r, curCell.c).filter((x) => x.dir === 'down'); if (alts.length) cur = alts[0]; }
        else move(e.key === 'ArrowDown' ? 1 : -1);
        paint(); e.preventDefault();
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        nextEntry(e.shiftKey ? -1 : 1);
        paint(); e.preventDefault();
      }
    });

    el.querySelector('#cw-prev').addEventListener('click', () => { nextEntry(-1); paint(); grid.focus(); });
    el.querySelector('#cw-next').addEventListener('click', () => { nextEntry(1); paint(); grid.focus(); });

    paint();
    setTimeout(() => grid.focus(), 300);
  }



  // keep the mirror warm so the wish page never reflows
  const erisedPreload = new Image();
  erisedPreload.src = 'assets/erised.png';

  function renderWish(el2) {
    el2.innerHTML = `
      <div class="pt-page pt-wish-page">
        <div class="er-mirror">
          <div class="er-photo">
            <img src="assets/erised.png" alt="the Mirror of Erised">
            <div class="er-glass"><span class="er-sheen"></span></div>
          </div>
        </div>
        <h2 class="pt-h pt-wish-line" style="font-size:40px;margin:2px 0 14px">Make a wish.</h2>
        <div class="pt-wish-rest">
          <p class="pt-body">They say no spell can make a wish come true \u2014
            the Mirror of Erised only ever shows it. But the Messrs. have observed,
            over considerable field experience, that thirty candles and one map
            come remarkably close.</p>
          <p class="pt-body" style="color:#7a6248">When you are ready, close the map
            the only way a map like this closes.</p>
          <div class="pt-incant">
            <input id="pt-spell" type="text" autocomplete="off" spellcheck="false"
                   placeholder="&hellip;" aria-label="the closing words">
          </div>
        </div>
      </div>`;
    setTimeout(() => el2.querySelector('.pt-wish-line').classList.add('is-in'), 3600);
    setTimeout(() => el2.querySelector('.pt-wish-rest').classList.add('is-in'), 7200);
    const spell = el2.querySelector('#pt-spell');
    spell.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const w = spell.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (w === 'MISCHIEFMANAGED') {
        spell.disabled = true;
        el2.querySelector('.pt-wish-page').classList.add('pt-going');
        setTimeout(() => {
          close(true);
          markSolved('howler');
        }, 1200);
      } else {
        spell.classList.add('pz-shake');
        setTimeout(() => spell.classList.remove('pz-shake'), 500);
      }
    });
  }

  // ---------- Howler: "The Sealed Letter" ----------
  function mountHowler(el) {
    const H = MoM.hsynth;
    const FMAX = 10000;
    let ctx = null, source = null, analyser = null, nodes = null;
    let playing = false, rafId = 0, t0 = 0, lastCol = -1, samples = null;
    let inspecting = false;

    el.innerHTML = `
      <p class="pz-kicker">the final trail</p>
      <h2 class="pz-title">The Damaged Howler</h2>
      <p class="pz-note">Somewhere on this band, one station is still broadcasting what it was given thirty years ago. The others are impostors. Tune through them and judge each by what it carries. When you find the one that matters, open the window wide enough to hear it whole \u2014 and bite out the two steady bright lines squatting inside it with the notches. When the letter is heard clearly, the map will know.</p>
      <div class="hw-toolbar">
        <button class="pz-btn pz-btn-primary" id="hw-play" type="button">\u25B6 play</button>
        <label class="hw-vol">volume <input type="range" id="hw-vol" min="0" max="60" value="18"></label>
        <button class="pz-btn" id="hw-hint" type="button">consult the Messrs.</button>
        <span class="fe-count" id="hw-readout">0.0 / ${H.DURATION}s \u00B7 0\u2013${FMAX} Hz</span>
      </div>
      <div class="hw-scope-wrap">
        <canvas id="hw-scope" width="960" height="330"></canvas>
        <p class="hw-whisper" id="hw-egg" style="font-style:italic;opacity:0;transition:opacity 1.2s;color:inherit;min-height:1.2em;"></p>
        <div class="hw-dial" id="hw-dial"></div>
        <div class="hw-notchline" id="hw-nl1"></div>
        <div class="hw-notchline" id="hw-nl2"></div>
      </div>
      <p class="fe-verdict hw-status" id="hw-verdict"></p>
      <div class="hw-knobs">
        <label>tuning <input type="range" id="hw-tune" min="1500" max="9500" value="2200" step="10"><output id="hw-tune-o">2200 Hz</output></label>
        <label>window <input type="range" id="hw-bw" min="300" max="4200" value="480" step="20"><output id="hw-bw-o">480 Hz</output></label>
        <label>notch I <input type="range" id="hw-n1" min="4700" max="8100" value="4700" step="5"><output id="hw-n1-o">4700 Hz</output></label>
        <label>notch II <input type="range" id="hw-n2" min="4700" max="8100" value="8100" step="5"><output id="hw-n2-o">8100 Hz</output></label>
      </div>`;

    const cv = el.querySelector('#hw-scope');
    const g2 = cv.getContext('2d');
    const readout = el.querySelector('#hw-readout');
    const playBtn = el.querySelector('#hw-play');
    const verdict = el.querySelector('#hw-verdict');

    function clearScope(hint = true) {
      g2.fillStyle = '#14100f';
      g2.fillRect(0, 0, cv.width, cv.height);
      if (!hint) return;
      g2.fillStyle = 'rgba(240,220,180,0.4)';
      g2.font = 'italic 17px Georgia';
      g2.textAlign = 'center';
      g2.fillText('press play \u2014 then watch, not just listen', cv.width / 2, cv.height / 2);
    }
    clearScope();

    const setChain = (chain, v) => chain.forEach((f) => { f.frequency.value = v; });

    async function buildAudio() {
      if (nodes) return;
      if (!samples) samples = H.synthesizeHowler(H.SAMPLE_RATE);
      const buffer = ctx.createBuffer(1, samples.length, H.SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);

      // the tuner: a sharp bandpass stack
      const tuner = Array.from({ length: 3 }, () => {
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; return f;
      });
      // the crystal: envelope detection = rectify, then smooth away the carrier
      const rect = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) curve[i] = Math.abs((i / 511.5) - 1);
      rect.curve = curve;
      const smooth = Array.from({ length: 2 }, () => {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 0.7; return f;
      });
      const dcblock = ctx.createBiquadFilter();
      dcblock.type = 'highpass'; dcblock.frequency.value = 140; dcblock.Q.value = 0.7;
      // post-demodulation whistle notches
      const chain = (q) => Array.from({ length: 3 }, () => {
        const f = ctx.createBiquadFilter(); f.type = 'notch'; f.Q.value = q; return f;
      });
      const n1 = chain(30), n2 = chain(30);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.55;
      const gain = ctx.createGain();
      gain.gain.value = parseFloat(el.querySelector('#hw-vol').value) / 100;

      // audio path: source -> tuner -> rectifier -> smoothing -> notches -> gain
      const path = [...tuner, ...n1, ...n2, rect, ...smooth, dcblock, gain];
      for (let i = 0; i < path.length - 1; i++) path[i].connect(path[i + 1]);
      gain.connect(ctx.destination);
      nodes = { tuner, n1, n2, gain, buffer, input: tuner[0], analyser };

      applyTuner();
      setChain(n1, +el.querySelector('#hw-n1').value);
      setChain(n2, +el.querySelector('#hw-n2').value);
    }
    function applyTuner() {
      if (!nodes) return;
      const f = +el.querySelector('#hw-tune').value;
      const bw = +el.querySelector('#hw-bw').value;
      const q = Math.max(0.5, f / bw);
      for (const t of nodes.tuner) { t.frequency.value = f; t.Q.value = q; }
    }
    async function start() {
      if (playing) return;
      playBtn.disabled = true;
      playBtn.textContent = 'conjuring\u2026';
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume();
        await buildAudio();
        source = ctx.createBufferSource();
        source.buffer = nodes.buffer;
        source.loop = true;
        source.connect(nodes.input);
        source.connect(analyser);
        source.start();
        t0 = ctx.currentTime;
        lastCol = -1;
        playing = true;
        clearScope(false);
        draw();
        playBtn.textContent = '\u25A0 stop';
      } catch {
        verdict.className = 'fe-verdict fe-bad';
        verdict.textContent = 'The receiver could not start audio in this browser.';
      } finally { playBtn.disabled = false; }
    }
    function stop() {
      if (source) { try { source.stop(); } catch {} source = null; }
      playing = false;
      playBtn.textContent = '\u25B6 play';
      cancelAnimationFrame(rafId);
    }

    let fdata = null;
    const RANGE = 32;
    function draw() {
      if (!playing || !analyser || !ctx || !document.contains(cv)) { stop(); return; }
      rafId = requestAnimationFrame(draw);
      if (!fdata) fdata = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(fdata);
      const W = cv.width, Hh = cv.height;
      const loopT = Math.max(0, ctx.currentTime - t0) % H.DURATION;
      const x = Math.min(W - 1, Math.floor((loopT / H.DURATION) * W));
      if (lastCol >= 0 && x < lastCol) { clearScope(false); lastCol = -1; }
      if (x === lastCol) {
        if (!inspecting) readout.textContent = `${loopT.toFixed(1)} / ${H.DURATION}s \u00B7 0\u2013${FMAX} Hz`;
        return;
      }
      const sx = Math.max(0, lastCol + 1), w = x - sx + 1;
      const binHz = ctx.sampleRate / analyser.fftSize;
      const maxBin = Math.min(fdata.length - 1, Math.floor(FMAX / binHz));
      let fmax = -160;
      for (let b = 2; b <= maxBin; b++) if (fdata[b] > fmax) fmax = fdata[b];
      const floor = fmax - RANGE;
      for (let y = 0; y < Hh; y++) {
        const fr = FMAX * (1 - y / Hh);
        const b = Math.min(maxBin, Math.max(2, Math.round(fr / binHz)));
        const v = Math.max(0, Math.min(1, (fdata[b] - floor) / RANGE));
        g2.fillStyle = v < 0.18
          ? `rgb(${14 + v * 40 | 0},${12 + v * 30 | 0},${18 + v * 30 | 0})`
          : `rgb(${60 + (v - 0.18) / 0.82 * 195 | 0},${30 + (v - 0.18) / 0.82 * 165 | 0},${30 + (v - 0.18) / 0.82 * 40 | 0})`;
        g2.fillRect(sx, y, w, 1);
      }
      lastCol = x;
      if (!inspecting) readout.textContent = `${loopT.toFixed(1)} / ${H.DURATION}s \u00B7 0\u2013${FMAX} Hz`;
    }

    // cursor readout + the platform between the platforms
    const cursorFreq = (e) => {
      const r = cv.getBoundingClientRect();
      return Math.round(FMAX * Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)));
    };
    cv.addEventListener('pointermove', (e) => {
      inspecting = true;
      readout.textContent = `cursor: ${cursorFreq(e)} Hz`;
    });
    cv.addEventListener('pointerleave', () => { inspecting = false; });
    cv.addEventListener('click', (e) => {
      const f = cursorFreq(e);
      const r = cv.getBoundingClientRect();
      const tol = Math.max(35, Math.round((FMAX * 6) / r.height));
      if (Math.abs(f - H.PLATFORM_F) > tol) return;
      verdict.className = 'fe-verdict fe-good';
      verdict.innerHTML = '<strong>Platform 9\u00BE.</strong> A deliberately planted tone at 975 Hz, belonging to no letter. Nothing is unlocked \u2014 some doors exist purely to be found.';
    });

    const knob = (id, out, apply, fmt = (v) => `${v} Hz`) => {
      const i = el.querySelector('#' + id), o = el.querySelector('#' + out);
      i.addEventListener('input', () => {
        o.textContent = fmt(+i.value);
        if (nodes) apply(+i.value);
      });
    };
    knob('hw-tune', 'hw-tune-o', () => applyTuner());
    knob('hw-bw', 'hw-bw-o', () => applyTuner());
    knob('hw-n1', 'hw-n1-o', (v) => setChain(nodes.n1, v));
    knob('hw-n2', 'hw-n2-o', (v) => setChain(nodes.n2, v));
    knob('hw-vol', 'hw-vol', (v) => { nodes.gain.gain.value = v / 100; }, () => '');

    const dial = el.querySelector('#hw-dial');
    const nl1 = el.querySelector('#hw-nl1');
    const nl2 = el.querySelector('#hw-nl2');
    function paintDial() {
      const f = +el.querySelector('#hw-tune').value;
      const bw = +el.querySelector('#hw-bw').value;
      const top = 100 * (1 - Math.min(FMAX, f + bw / 2) / FMAX);
      const bot = 100 * (1 - Math.max(0, f - bw / 2) / FMAX);
      dial.style.top = top + '%';
      dial.style.height = Math.max(1.5, bot - top) + '%';
      nl1.style.top = (100 * (1 - (+el.querySelector('#hw-n1').value) / FMAX)) + '%';
      nl2.style.top = (100 * (1 - (+el.querySelector('#hw-n2').value) / FMAX)) + '%';
    }
    for (const id of ['hw-tune', 'hw-bw', 'hw-n1', 'hw-n2']) {
      el.querySelector('#' + id).addEventListener('input', paintDial);
    }
    // the notch lines glow while their knob is turning, then fade away
    const flash = { 'hw-n1': null, 'hw-n2': null };
    const lineOf = { 'hw-n1': nl1, 'hw-n2': nl2 };
    for (const id of ['hw-n1', 'hw-n2']) {
      el.querySelector('#' + id).addEventListener('input', () => {
        lineOf[id].classList.add('is-live');
        clearTimeout(flash[id]);
        flash[id] = setTimeout(() => lineOf[id].classList.remove('is-live'), 1500);
      });
    }
    paintDial();

    // the Messrs. advise on whatever he is doing right now
    const DECOY_FREQS = [1150, 2000, 3000, 4000, 4550, 8600, 9300];
    el.querySelector('#hw-hint').addEventListener('click', () => {
      const tune = +el.querySelector('#hw-tune').value;
      const bw = +el.querySelector('#hw-bw').value;
      const a = +el.querySelector('#hw-n1').value;
      const b = +el.querySelector('#hw-n2').value;
      const onStation = Math.abs(tune - 6400) < 160;
      const onDecoy = DECOY_FREQS.some((f) => Math.abs(tune - f) < 200);
      const onWhistle = [5900, 7100].some((f) => Math.abs(tune - f) < 200);
      const notchOK = (Math.abs(a - 5900) < 90 && Math.abs(b - 7100) < 90) ||
                      (Math.abs(a - 7100) < 90 && Math.abs(b - 5900) < 90);
      let hint;
      if (!playing) {
        hint = 'The Messrs. cannot advise a silent receiver. Press play.';
      } else if (!onStation && onWhistle) {
        hint = 'Mr. Wormtail knows this bright line well \u2014 a bare whistle, carrying nothing at all. Curious, though: such lines rarely travel alone. Consider what might live between a pair of them.';
      } else if (!onStation && onDecoy) {
        hint = 'Mr. Moony admires this station\u2019s persistence, but it was never given a song worth keeping. Keep turning the dial.';
      } else if (!onStation) {
        hint = 'Mr. Moony hears only weather where you are parked. A true station wears its light wide \u2014 a line dressed in shimmer, not a bare thread. And only one of them was given a song.';
      } else if (bw < 3100) {
        hint = 'Mr. Padfoot approves of the station, but notes that a narrow window starves a song. Open it until the whole thing fits through.';
      } else if (!notchOK) {
        hint = 'Mr. Wormtail whispers that two steady lines inside this station belong to no song. A notch erases exactly what it sits upon.';
      } else {
        hint = 'Mr. Prongs suggests patience. You are precisely where you should be.';
      }
      verdict.className = 'fe-verdict';
      verdict.style.fontStyle = 'italic';
      verdict.textContent = hint;
    });

    playBtn.addEventListener('click', () => (playing ? stop() : start()));

    // the map listens for the moment he is truly tuned in
    let heldSince = 0, solvedRadio = false;
    let eggHeldSince = 0, eggFired = false;
    const eggEl = el.querySelector('#hw-egg');
    const listener = setInterval(() => {
      if (solvedRadio) return;
      if (!document.contains(cv)) { clearInterval(listener); return; }
      const tune = +el.querySelector('#hw-tune').value;
      const bw = +el.querySelector('#hw-bw').value;
      const a = +el.querySelector('#hw-n1').value;
      const b = +el.querySelector('#hw-n2').value;
      const notchOK = (Math.abs(a - 5900) < 90 && Math.abs(b - 7100) < 90) ||
                      (Math.abs(a - 7100) < 90 && Math.abs(b - 5900) < 90);
      const onStation = Math.abs(tune - 6400) < 160;
      const windowOK = bw >= 3100;
      const good = playing && onStation && windowOK && notchOK;
      if (!eggFired) {
        const onMicrowave = playing && Math.abs(tune - 2400) <= 40;
        if (onMicrowave) {
          if (!eggHeldSince) eggHeldSince = Date.now();
          if (Date.now() - eggHeldSince > 2000) {
            eggFired = true;
            eggEl.textContent = 'ah \u2014 someone\'s microwave, probably.';
            eggEl.style.opacity = '1';
            setTimeout(() => { eggEl.style.opacity = '0'; }, 5000);
          }
        } else eggHeldSince = 0;
      }
      if (good) {
        if (!heldSince) heldSince = Date.now();
        if (Date.now() - heldSince > 2800) {
          solvedRadio = true;
          clearInterval(listener);
          verdict.className = 'fe-verdict fe-good';
          verdict.textContent = 'Not a scream after all. A song.';
          setTimeout(() => {
            stop();
            try { ctx && ctx.close(); } catch {}
            ctx = null;
            swapBody(renderWish, true);
          }, 4600);
        }
      } else heldSince = 0;
    }, 400);
  }

  // ---------- placeholders for the stops still being inked ----------
  function stub(title, flavor) {
    return (el) => {
      el.innerHTML = `
        <p class="pz-kicker">a page still drying</p>
        <h2 class="pz-title">${title}</h2>
        <p class="pz-note" style="max-width:44ch">${flavor}</p>
        <p class="pz-note" style="opacity:.6">(the Messrs. are still inking this challenge — it will appear here)</p>`;
    };
  }

  const MOUNT = {
    connections: mountConnections,
    fieldexam: mountFieldExam,
    crossword: mountCrossword,
    howler: mountHowler,
    wish: renderWish,
  };

  const api = { open, close, isSolved, markSolved, onSolved: null };
  return api;
})();
