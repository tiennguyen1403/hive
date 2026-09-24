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
