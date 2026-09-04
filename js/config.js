/* config.js — the world's geography in world coordinates. */
'use strict';
window.MoM = window.MoM || {};

MoM.WORLD = { w: 3200, h: 2000 };

/* The journey, as connected legs of a winding trail.
   Each leg is a polyline the footprints will follow. */
MoM.LOCATIONS = [
  { id: 'start', label: 'the trailhead', x: 420, y: 1660 },
  { id: 'connections', label: 'The Crossroads', x: 1080, y: 1330 },
  { id: 'fieldexam', label: 'The Steaming Basin', x: 1760, y: 830 },
  { id: 'crossword', label: 'The Long Road', x: 2330, y: 1260 },
  { id: 'howler', label: 'The Sealed Letter', x: 2820, y: 560 },
];

MoM.LEGS = [
  { // trailhead -> crossroads
    to: 'connections',
    pts: [
      [420, 1660], [520, 1600], [610, 1580], [700, 1520],
      [760, 1450], [860, 1430], [950, 1390], [1080, 1330],
    ],
  },
  { // crossroads -> steaming basin
    to: 'fieldexam',
    pts: [
      [1080, 1330], [1160, 1240], [1280, 1200], [1350, 1120],
      [1430, 1080], [1520, 1010], [1600, 940], [1690, 900], [1760, 830],
    ],
  },
  { // basin -> the long road
    to: 'crossword',
    pts: [
      [1760, 830], [1860, 880], [1950, 960], [2020, 1050],
      [2120, 1110], [2210, 1180], [2330, 1260],
    ],
  },
  { // long road -> the sealed letter
    to: 'howler',
    pts: [
      [2330, 1260], [2440, 1180], [2520, 1080], [2570, 960],
      [2650, 860], [2700, 740], [2770, 650], [2820, 560],
    ],
  },
];

MoM.INK = 0x4a3620;          // map ink
MoM.INK_FAINT = 0x8a734f;    // pale ink
MoM.RED = 0xa02818;          // the one color accent: the envelope

// background music (swap the file to audition: darkling / ossuary / alchemist)
MoM.MUSIC = 'assets/music/darkling.mp3';
