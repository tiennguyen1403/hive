# The layered checks: impact, sweep, diff, pixdiff

Round v6, tooling slice T1 (07–08/10/2026). The user's rule: a slice checks what it changed and what that change
can reach, not the whole app; the full sweep runs once, at the end of a round, before the demo goes up. The design
is Fable's, recorded in `tasks/plan.md` ("cách kiểm theo tầng").

| File | What it does |
|---|---|
| `manifest.mjs` | The one list of routes and layers the sweep walks: `name`, `path`, `zone`, `widths`, `tags`, `components`, `overlays`; each layer's `open`. Also `CONTROLS` (the fixed control pages) and `VOLATILE` (what moves with the clock). |
| `template.js` | The sweep's body: the sign-in, the seed, the seven detectors. Edit detectors here. |
| `gen.mjs` | Writes a `playwright cli run-code` script per language from a selection (`npm run sweep:gen`). `--legacy` rewrites `tools/layout-sweep.js`. |
| `diff.mjs` | A run against `baseline-<lang>.json`, entry by entry (`npm run sweep:diff`); `--promote` (`npm run sweep:promote`). |
| `../impact.mjs` | From a git diff to routes, layers, widths, languages, `db`, `build` (`npm run impact`). |
| `../pixdiff.mjs` | Two folders of shots, pixel by pixel, in 20px bands (`npm run pixdiff`). |
| `baseline-vi.json`, `baseline-en.json` | One full sweep per language, 232 entries each (the shop at 390 and 1280, the back office at 1280 and 1440), shot on 08/10/2026 on the end-of-round build (after R2) and promoted whole. Their shots are in `.playwright-cli/sweep/baseline-vi/` and `baseline-en/` (git-ignored). |
| `reference/` | The audit's generator and the B18 baseline this slice replaced. The main session deletes it at the end of round v6. |

`tools/layout-sweep.js` is a generated copy of the full Vietnamese sweep, kept because the agents' instructions run
it by name. `gen.test.ts` fails when it differs from the generator's output: change the manifest or the template,
then `npm run sweep:gen -- --legacy`.

## A slice

1. **What the change reaches.** `npm run impact -- <base> --out=.playwright-cli/impact.json`. `<base>` is the commit
   the slice started from; with no second commit the working tree and its untracked files are read. Two commits
   (`npm run impact -- A B`) read git alone.
2. **Read the JSON.**
   - `routes` and `overlays` map each path or layer to its widths;
   - `widths` sums them per zone; `langs` says which languages to shoot;
   - `db: true` means `npm run test:db`; `build: true` means `npm run build`;
   - `controls` are always there;
   - `actions` are Server Actions the change reaches, with the routes whose forms call them. The sweep never submits
     a form: check those by hand;
   - `unmapped` and `uncovered` are files and pages the manifest does not cover: look at them by eye;
   - `reasons` says, file by file, why.
3. **Typecheck and tests:** `npm run typecheck` and the whole of `npm test` (about 8 seconds; `vitest related` misses
   the tests that read files with `fs`).
4. **Sweep the reach.** `npm run sweep:gen -- --impact=.playwright-cli/impact.json` writes
   `.playwright-cli/sweep-impact-vi.js` and `-en.js`: the routes, the controls, every layer of both, at their widths.
   Run each on 3200 with a fresh browser:
   ```
   npx playwright cli close
   npx playwright cli open about:blank
   npx playwright cli --raw run-code --filename=.playwright-cli/sweep-impact-vi.js > .playwright-cli/sweep-impact-vi.json
   npm run sweep:diff -- .playwright-cli/sweep-impact-vi.json
   ```
   `NO DIFFERENCE`, or each new, missing or changed entry with its findings.
5. **Compare the controls' pixels.**
   ```
   npm run pixdiff -- .playwright-cli/sweep/baseline-vi .playwright-cli/sweep/impact-vi home-390 home-1280 … \
     --regions=tools/sweep/baseline-vi.json --regions=.playwright-cli/sweep-impact-vi.json
   ```
   Look at every pair that differs.
6. **Report** the impact JSON, the diff's verdict, the pixdiff lines, and what `actions`, `unmapped` and `uncovered`
   left to the eye.

Other selections: `--zone=admin`, `--route=/track` (a path, a name, or a prefix `/account/*`), `--tag=lookup`,
`--overlay=admin-reset-sheet`, `--width=900,1199`, `--lang=en`, `--label=b20`. Picking a route picks all its
layers. The back office is never swept under 1180px.

## The end of a round

Before the demo goes up: `npm run sweep:gen -- --label=round` writes the full sweep for both languages (232 entries
each, about five minutes a pass). Run the two passes separately, with `npx playwright cli close` and `open` between them; diff each against its
baseline; `npm run pixdiff -- .playwright-cli/sweep/baseline-vi .playwright-cli/sweep/round-vi --regions=…` over
every shot; `npm run test:db` whole; look at every shot that differs.

## The promotion rule (luật thăng mốc)

A baseline is what the main session last approved. Without promotion, the next slice would report the previous
slice's intended changes as leaks.

1. Promote only a run the main session approved, made on the build it approved, with no `error` in it.
2. Promote exactly the entries that run visited, nothing else:
   `npm run sweep:promote -- .playwright-cli/sweep-impact-vi.json` (and the `-en` run). Each visited entry replaces
   the baseline's entry of the same name: findings, landing, console errors, clock boxes. Its shot replaces the
   baseline's shot in `.playwright-cli/sweep/baseline-<lang>/`. An entry the baseline did not have (a new route, a
   1440 shot) joins it. The totals are counted again.
3. Commit the two `baseline-*.json` with the slice they belong to. `scope.promoted` lists every run promoted into
   them.
4. An approved end-of-round full sweep is promoted the same way. It visits every entry of the manifest, so each
   baseline entry it shares is replaced. An entry the baseline holds and the full sweep did not visit (a route taken
   out of the manifest) stays as it was; the full sweep's diff names it under `missing`.
5. Never edit a baseline by hand, and never promote a run made against a database that was not put back with
   `select public.reset_demo(public.demo_anchor());` first.

## What a baseline holds, and its noise

The baseline of 08/10/2026 (`reset_demo(demo_anchor())` just before, anchor 07/10 18:50):

- **vi, 51 findings:** 50 `tinyText` and 1 `smallTarget`;
- **en, 50 findings:** the same 50 `tinyText`;
- **the 50 `tinyText`:** the customers' initials in Arc's `Avatar` `sm`, 10px, on `/admin/orders` and
  `/admin/customers` and their row menus, and one on `/admin/customers?group=loyal`: 25 at 1280, the same 25 at 1440.
  `DESIGN.md` carries it as a known defect ("Khiếm khuyết đang mang theo"): `aria-hidden`, the name printed beside
  it.
- **the `smallTarget`:** the chip "Đổi trả" on `/faq` at 390, 34px wide (the English "Returns" is wider). It is
  44px tall.
- **console errors:** six, each a 404 page's own `Failed to load resource`: `/khong-co-trang-nay` and `/so/999` at 390
  and 1280, `/admin/drops/99` at 1280 and 1440.

Two runs of the same build are not pixel-identical everywhere. The admin trial of 08/10 against the baseline
differed on 14 of 79 shots, by 0.0001% to 0.08%. Two causes:

- **Content that follows the clock** without a `role="timer"`: the overview's revenue chart (its average moves as
  the sample's hours pass), the time a slip says it was printed (`printed 00:22 · 8 Oct`).
- **Frames of an opening animation:** the edges of a dialog or a drawer shot 450ms after the click.

`--regions` removes what `VOLATILE` names: the countdowns, and the sidebar's "đặt lại lần cuối HH:MM · dd/mm", which
every `reset_demo` moves. For the rest, use `--ignore=<pattern>:x,y,w,h`, or `--tolerance=0.1` to call a pair under
0.1% "within", and look at what is left. The date matters too: the sample is anchored at 18:50 each day, so shots of
different days differ in their dates.

A full-page shot is not laid out quite like the page the detectors measure. The browser lays it out without the
classic scrollbar, 15px wider (so the photos are a little taller and what sits under them lower), then cuts it back
to the size the page had with the bar: a 390 shot is 375px wide. The detectors run right after the shot, as the sweep
always has, in whichever of the two layouts the browser has by then. The clock boxes are measured after them with the
scrollbars hidden, the shot's own layout. Measured in the page's layout, the countdown's box on home-390 sat 20px
above its digits (08/10).

## What `impact` does not see

It reads text, not types or runtime. Report these limits, and cover them by eye:

- **A declaration is the unit.** A 400-line `CheckoutView` is marked whole for one changed string.
- **A shared function reaches every caller.** Example: a new row in `RATE_RULES` marks `takeRate` and every action
  using it. The tool cannot tell an added table row from a change of behaviour (B19: eight action modules under
  `actions`).
- **Data, not code.** What a page shows from the database, a fixture or the clock is not followed: a seed change only
  turns on `db`.
- **Class names built at run time** (`` `b-${kind}` ``) are not found. A rule whose classes no file names reaches the
  whole shop, and the reason says so.
- **A layer's `components` stop the walk.** A file listed there must draw nothing outside its layer, or the page
  under it is missed.
- **The manifest's coverage.** A page the sweep never visits cannot be shot; `impact` lists the pages it reaches
  outside the manifest under `uncovered`. The receipt (`/order-confirmed/[code]`) was one, reached by R1's 900–1199
  fix and B19's `followLink`, until it joined the manifest on 08/10. Route handlers (`app/**/route.ts`), the share
  images and `public/` go under `unmapped`.
- **Order effects.** A filtered run starts from a fresh session, where the full sweep reaches a page after the
  others. It matched the baseline for the back office (79 of 79), but a page that reads what an earlier page left
  (a read inbox, the bag) could differ.
- **The parser's own gaps.** A statement it cannot read marks its whole file and adds one to `fallbacks`; a stray
  quote in JSX text spoils at most one line. Both err towards reporting more.
