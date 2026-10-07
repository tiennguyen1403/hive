# Sweep reference material

Kept out of `.playwright-cli/` (git-ignored) so it survives a cleanup. Nothing here runs as part of the app or the tests.

- `audit-v6/`: the generator the round v6 audit used on 07/10/2026.
  - `cap.template.js`, with its `/*CONFIG*/` slot, is the `playwright cli run-code` body.
  - `gen.py` and `build_*.py` fill that slot per batch.
  - `run-batch.sh` runs the batches, closing the browser between them.
  - `analyze.py`, `bands.py`, `labels.py`, `sweep_summary.py` and `sheet.py` read the results.
  - `sheet.py` pastes the VI and EN shots side by side.
- `b17-pixdiff.mjs`: the pixel comparison of slice B17, built on `sharp`, which reports in 20px bands.
- `baseline/`: the per-route results of `tools/layout-sweep.js` after B18 round 2. VI has 110 findings, EN 109.

The tooling slice after R1 ports these into `tools/sweep/` (manifest, generator, per-route diff, pixel diff). After that, this
folder can go.
