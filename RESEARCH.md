# Beauty-Round Research Findings

## Textures (real scans > procedural — decided)
- assets/parchment.jpg — Wikimedia Commons "Old paper1.jpg" (public domain),
  2400x1800. Warm amber, authentic foxing, edge burn. Chosen over two other
  candidates by visual inspection.
- assets/wood.jpg — Commons "Dark wood copy gr.jpg", pale in reality; will be
  sprite-tinted 0x3a2414 (multiply) in Pixi to read as dark candlelit desk.
  Tiling artifacts acceptable under vignette.

## Rendering techniques (locked)
1. Ink drawn with MULTIPLY blend mode so strokes darken paper grain.
2. Stamp-brush strokes: irregular soft nib texture stamped along paths with
   jitter (replaces uniform vector lines).
3. Candle = custom GLSL filter: warm additive core + strong darkness falloff;
   optionally fake normal-lighting from luminance gradient of the parchment.
4. Whole-frame grade via pixi-filters v5 (Pixi 7 compatible):
   CDN: https://cdn.jsdelivr.net/npm/pixi-filters@5.2.1/dist/browser/pixi-filters.min.js
   (unpkg paths 404; jsdelivr works.) Use OldFilmFilter (subtle: sepia off,
   noise ~0.08, vignette ~0.3), maybe GodrayFilter for candle shafts.

## Opening sequence (user-approved direction)
B -> A chain:
1. Blank parchment interrogation: map writes "Messrs. Moony... demand to know
   who is asking." User types name; map replies with one personalized line.
2. Oath line appears; clicking it = wand touch.
3. THE INK-SPREAD: branching ink tendrils crawl from the touch point across
   the parchment, drawing the map linework progressively behind them
   (stroke-by-stroke reveal ordered by distance from touch point), banner
   unfurls, labels write themselves. Quill audio throughout.

## Known open items
- Footprint/fog/steam systems carry over from style frame v2.
- Puzzle overlays (Connections, Field Exam, Crossword, Howler) still to wire.
