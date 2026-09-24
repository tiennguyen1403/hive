# How the HIVE logo was redrawn

The mark and wordmark are not traced by eye: `measure.py` reads the ChatGPT board
row by row (disc, stems, wings, belly, antennae) into units where the disc has
radius 500, and the two builders rebuild the shapes as symmetric geometry.

- `build.cjs` — the first redraw (`../hive-*.svg`, lockup with ".05" in Barlow Black).
- `gen.cjs` — round 2, one parameterised construction for M0 (the redraw) and
  the refinements M1–M3 (`../v2/mark-*.svg`). Every design decision is a parameter
  at the top: gap widths, antenna width, bevel angle, belly layout.

Both run headless Chromium through the project's `@playwright/test` and need two
libraries beside them in `lib/` (not committed):

    curl -sL https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.18/paper-core.min.js -o lib/paper-core.min.js
    curl -sL https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js -o lib/opentype.min.js

`build.cjs` also reads `fonts/Barlow-Black.ttf` (OFL, Google Fonts) for the digits,
and `measure.py` reads the original board from the user's Downloads folder.

The user chose **M2** (24/09/2026, QĐ-29). `../v2/mark-m2-chatgpt.png` is M2 at 820 px on a white
1024 px square: the image to attach to the ChatGPT wordmark prompt in `../prompt-wordmark.md`.

## The final logo (24/09/2026, QĐ-29 mark M2 + QĐ-30 wordmark W3)

The canonical files in `../` are built by five scripts, run in this order from a
folder that also holds `lib/` (above):

- `instance.py` — cuts the weight-700 instance out of `../../fonts/BigShouldersStencilDisplay-VF.ttf`
  into `bss-700.ttf` (needs fontTools: `python -m pip install fonttools`).
- `final.cjs` — lays out "HIVE.05" by the round-3 rules (cap 0.52 of the mark, gap 0.24,
  tracking 0.02 em, number at 0.8), checks every pen position against Chrome's own
  layout of the board's text (max difference 0.013 units), resolves the variable
  font's overlapping contours, and writes `final.json`.
- `emit.cjs` — writes the mark variants, wordmark, lockups, `hive-digits.svg` and
  `hive-number.json` (the dot and 0–9 in font units plus the rule that composes any
  issue number).
- `png.cjs` — the transparent PNGs in `../png/`.
- `check.cjs` — pixel checks: the mark equals `v2/mark-m2.svg`, the knockout equals
  the black variant, the composed ".05" equals the lockup's, and the lockups match
  the live text of the round-3 board (differences only on letter edges, where Chrome
  anti-aliases text in colour).

`../review/` keeps the evidence of the first redraw (M0 against the ChatGPT board);
`../v2/lockup-w0.svg` is the old ChatGPT-style lockup the round-2 board still shows.
