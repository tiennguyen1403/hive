# The local database

Everything the storefront reads and writes lives here: the migrations, the
generated seed, and the config the local stack starts from. Nothing in this
folder is edited by hand except `config.toml` and the migrations.

## Starting from nothing

```bash
docker info                 # Docker Desktop has to be up
npx supabase start          # ~30 s once the images are pulled
npx supabase status -o env  # the keys for .env.local — never commit them
npx supabase db reset       # every migration, then supabase/seed.sql
npm run seed:users          # the eight demo shoppers and the demo manager in auth.users
npm run db:types            # regenerate lib/db/database.types.ts
```

`db reset` and `seed:users` are two steps and have to stay two: `auth.users`
is Supabase's own table, a row in it needs a hashed password and an identity,
and only the admin API can make one. `db reset` fills the `seed_*` mirrors and
calls `reset_demo(demo_anchor())`, which quietly skips every demo account that
does not exist yet — and files the twenty-four sample orders under nobody;
`seed:users` creates the accounts and calls `reset_demo(demo_anchor())` again,
which is when their profiles, addresses, sample orders and — for the first
one — saved styles, reminder and sizes appear under them.

Both are idempotent. `npm run seed:users` twice prints `0 created, 9 already
there (of 9)` the second time.

## What is generated, and from what

| File | Made by | Source of truth |
|---|---|---|
| `seed.sql` | `npm run seed:gen` | `data/catalog.ts`, `data/promotions.ts`, `data/customers.ts`, `data/orders.ts` |
| `../lib/db/database.types.ts` | `npm run db:types` | the migrations, applied |

Neither is edited by hand. `scripts/gen-seed.test.ts` fails the moment
`seed.sql` and the fixture disagree, which is what catches a price changed in
`data/` and never regenerated.

## Environment

`.env.local` (git-ignored) carries four names; `.env.example` lists them with
placeholder values.

| Name | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | the app, the scripts, the db tests | |
| `SUPABASE_PUBLISHABLE_KEY` | the app | safe to hand to a client — but this app has no client-side Supabase at all (QĐ-25) |
| `SUPABASE_SECRET_KEY` | `scripts/seed-users.ts`, the db tests | service role: bypasses row level security. Scripts only, never the app |
| `DEMO_PASSWORD` | the sign-in screen, `scripts/seed-users.ts` | the PUBLIC demo password. Printed on screen on purpose |

None of them carries the `NEXT_PUBLIC_` prefix, and that is the point: such a
variable is inlined into the client bundle, and the browser never talks to
Supabase in this project.

## The demo accounts

Eight shoppers, one per customer in `data/customers.ts`, and one manager
(`lib/demo-admin.ts`, `quanly@email.com`), all with the same password
(`DEMO_PASSWORD`). The sign-in screen prints the first shopper's email, the
manager's and the password, and offers "Đăng nhập thử" and "Vào quản trị thử"
— this is a public portfolio demo and an account nobody can open is a demo
nobody can look at.

What makes the manager a manager is `app_metadata.role = "admin"`, written by
`seed:users` with the service role (the only key that can write
`app_metadata`) and carried in every access token; `public.is_admin()` reads
it back. A second run writes the role again (`auth.admin.updateUserById`,
which merges into `app_metadata`), so the manager stays one. The manager's
profile carries the handle `a-quanly` and is left out of the back office's
customer list.

A demo account's `profiles.handle` carries its fixture id (`c-minhanh`). That
is what ties it to its sample orders: `seed_orders.customer_handle` holds the
same id, and `reset_demo()` sets `orders.profile_id` from it. An account
created through the sign-up form has no handle, and therefore no sample
orders.

## Orders (slice B2)

`orders` and `order_lines` are written only by functions — no role the API
hands out may insert, update or delete a row directly:

| Function | Who may call it | What it does |
|---|---|---|
| `place_order(p_input, p_now)` | `anon`, `authenticated` | releases expired holds, locks every stock cell it will touch in one sorted pass, checks and prices the basket from the database, spends one use of the code, issues `DH-` + `order_seq`, returns `{ code, accessKey }` |
| `cancel_order(p_code, p_now)` | `authenticated` | the owner's unpaid order only (`RECEIVED`, or a transfer inside its hold); pieces back on the shelf; the code's use is not refunded |
| `expire_transfers(p_now)` | `anon`, `authenticated` | cancels every transfer whose twelve hours ran out, at its deadline, and restocks; `GET /api/health` calls it daily |
| `my_orders()`, `order_json(p_code)` | `authenticated` | the account's own orders, through row level security |
| `track_order(p_code, p_phone)` | `anon`, `authenticated` | one order, for its code and the phone number on it; `null` for any miss |
| `receipt_order(p_code, p_key)` | `anon`, `authenticated` | one order, for its code and the receipt key the app keeps in the httpOnly `guest_orders` cookie |

Every business instant is the app's (`p_now`, from `demoNow()` — the real
clock since slice B3a), never Postgres' `now()` — but from anybody but the
service role (and a direct database session) a `p_now` more than five minutes
off `now()` is refused as `BAD_INPUT` (`assert_now`), so only the tests can
ask "and twelve hours later?". Refusals are `raise exception using message =
'<CODE>'` (SQLSTATE `P0001`) with one of `EMPTY_ORDER`, `BAD_INPUT`,
`DROP_CLOSED`, `OUT_OF_STOCK`, `PROMO_INVALID`, `NOT_OWNER`,
`NOT_CANCELLABLE`.

`lib/db/orders.dbtest.ts` checks the pricing against `checkoutTotals()`, races
two orders for one last piece, and walks every refusal.

## The back office (slice B3a)

Every move the shop makes on an order is a function with a fixed state guard
(`20260924001000_admin.sql`). Each checks the role first (`NOT_ADMIN`), then
the clock and the input (`BAD_INPUT`), then locks the order (`NOT_FOUND`),
then the guard (`NOT_ALLOWED`), and writes its event in the same transaction.
All are granted to `authenticated` — the body asks for the role — and to
nobody else.

| Function | From → to | Event |
|---|---|---|
| `admin_mark_paid(code, p_now)` | `AWAITING_TRANSFER` (inside its hold) or `RECEIVED` → `PAID` | `ORDER_PAID {from}` |
| `admin_hand_over(code, carrier, tracking_code, note, p_now)` | `PAID` → `SHIPPING`; `RECEIVED` → `SHIPPING` only for COD | `ORDER_SHIPPED {from, carrier, trackingCode}` (+ `ORDER_NOTE` for a note) |
| `admin_mark_delivered(code, p_now)` | `SHIPPING` → `DELIVERED` | `ORDER_DELIVERED` |
| `admin_cancel_order(code, reason, note, p_now)` | `AWAITING_TRANSFER` (inside its hold), `RECEIVED`, `PAID` → `CANCELLED`, pieces back on the shelf | `ORDER_CANCELLED {from, reason, note}` |
| `admin_note_order(code, text, p_now)` | any state, unchanged | `ORDER_NOTE {text}` |
| `admin_edit_address(code, ship_to, reason, p_now)` | `AWAITING_TRANSFER` (inside its hold), `RECEIVED`, `PAID`, unchanged | `ORDER_ADDRESS_EDITED {before, after, reason}` |
| `admin_orders()` | read: every order, with its account | — |

The manager reads `orders`, `order_lines`, `profiles`, `addresses` and `events`
through select policies on `public.is_admin()`; nobody else reads `events`, and
no role may update or delete a row of it (a trigger refuses, service role
included). `place_order` writes `ORDER_PLACED`, `cancel_order`
`ORDER_CANCELLED_BY_CUSTOMER`, and every released hold `ORDER_EXPIRED`,
stamped at its deadline.

## The catalogue in the back office (slice B3b)

The shelf, the issues, the teasers, the codes and the styles themselves are
written by ten more functions (`20260924020000_catalog_admin.sql`), in the
same order of checks — role (`NOT_ADMIN`), clock and input (`BAD_INPUT`), the
row (`NOT_FOUND`), the guard (`NOT_ALLOWED`), a shelf that moved under the form
(`STALE`) — and each writes exactly one event, naming what it is about in
`product_id`, `promo_code` or `drop_no` (check constraints require it).

| Function | What it does | Event |
|---|---|---|
| `admin_adjust_stock(product_id, cells, reason, ref, note, p_now)` | cells `[{color, size, before, after}]`; every cell of the style locked; `before` must still be the shelf's number (`STALE`); total ≤ `cut_units`; reason one of the sheet's four or "Sửa mẫu" | `INVENTORY_ADJUSTED {cells, reason, ref, note, delta}` |
| `admin_add_drop(no, opens_at, closes_at, p_now)` | `no` must be `max + 1` (`NOT_ALLOWED` otherwise); closes after opens | `DROP_ADDED {opensAt, closesAt}` |
| `admin_schedule_drop(no, opens_at, closes_at, p_now)` | any issue's two instants; "Đóng sớm" is this with `closes_at = p_now` | `DROP_SCHEDULED {before, after}` |
| `admin_add_teaser(slug, name, garment, family, drop_no, photo_key, p_now)` | slug `^[a-z0-9-]+$` and new; photo one the catalogue already borrows; goes last | `TEASER_ADDED {slug, name, garment, family, photoKey}` |
| `admin_add_promo(terms, p_now)` | code upper case, no whitespace, new; terms as the table's check reads them; `used_count` 0, not paused | `PROMO_ADDED {terms}` |
| `admin_edit_promo(code, terms, p_now)` | new terms, never a new code; `used_count` and `paused` kept; an edit that changes nothing is `BAD_INPUT` | `PROMO_EDITED {before, after}` |
| `admin_pause_promo(code, paused, p_now)` | `promotions.paused`; pausing a paused code is `NOT_ALLOWED` | `PROMO_PAUSED {paused}` |
| `admin_raise_promo_limit(code, after, p_now)` | `after` above the current limit, or any limit when there was none | `PROMO_LIMIT_RAISED {before, after}` |
| `admin_end_promo(code, p_now)` | `ends_at = p_now`, only for a code inside its window | `PROMO_ENDED {before, after}` |
| `admin_update_product(id, patch, p_now)` | patch ⊆ name, kind, slug, priceVnd, material, fit, dropNo — never the cut; slug new; a kind other styles file under one family moves the family too | `PRODUCT_EDITED {before, after}`, changed fields only |

`place_order` refuses a paused code with `PROMO_INVALID`, and stamps
`products.sold_out_at` when the last piece of a style goes; `cancel_order`,
`admin_cancel_order`, a released hold and an adjustment that puts pieces back
clear it (`sync_sold_out`, which locks the product rows first so two orders
racing for the last two pieces agree). Lock order, everywhere: orders, stock
cells, a promotion, products.

`lib/db/catalog-admin.dbtest.ts` walks every function's allowed move and its
refusals, the events, `sold_out_at` both ways, and a reset back to the
fixture after all of it.

## What an account keeps (slice B9)

Saved styles (`favorites`), issue reminders (`reminders`), "Size của tôi" and
the four notification switches (`account_settings`) belong to the account
(`20260929120000_account_state.sql`). An account reads its own rows through
"read own" policies and writes them only through the functions below, which
take the owner from `auth.uid()`; no role the API hands out may insert, update
or delete a row directly, `anon` reaches nothing, and the manager reads none of
it. All are granted to `authenticated` only.

| Function | What it does |
|---|---|
| `my_state()` | `{ favorites, reminders, sizes, notify }` for the caller, or `null` signed out: saved styles newest first (only styles the caller can see, by `catalog_snapshot()`'s rule), reminders of issues still to open, the two sizes, the four switches (a missing row reads as no size, all on) |
| `save_favorite(product_id, color?)` | one row per style; the colour must be one of the style's (`product_colors` is referenced), none takes the first with anything left; saving what is saved changes nothing |
| `unsave_favorite(product_id)` | stamps `removed_at` and answers `{ removed, state }` — the row is kept so undoing needs nothing from the browser |
| `restore_favorite(product_id)` | clears the stamp: the style is back in its place (`seq` decides the order, higher is newer); `NOT_FOUND` with nothing to undo |
| `set_reminder(drop_no, on)` | on only while the issue has not opened (`NOT_UPCOMING`), off at any time |
| `set_my_size(slot, size?)` | `top` or `bottom`; no size forgets it |
| `set_my_notify(key, on)` | `order`, `drop`, `wishlist`, `promo` |
| `update_my_profile(name, phone)` | name trimmed, 2–60 characters; phone digits, spaces and dots, stored as ten digits starting with 0 — the only way a shopper changes `profiles`, so the e-mail and the handle do not move |

Each write answers with `my_state()` after the change (`update_my_profile`
with `{ name, phone }`), and refuses with `SIGNED_OUT`, `BAD_INPUT`,
`NOT_UPCOMING` or `NOT_FOUND` (`P0001`). The first demo account's four saved
styles carry no `saved_at`: the fixture has no moment for them.

`lib/db/my-state.dbtest.ts` checks row level security both ways, every
refusal, "Bỏ lưu" then "Hoàn tác", a reminder dropping out once its issue has
opened, the profile's two fields, and the reset.

## Each step's moment, and "Hoàn tác" in the address book (slice B10)

`order_json()` (v3, `20260930090000_step_moments_address_undo.sql`) carries a
new key, `moments`: `{ paidAt, shippedAt, deliveredAt }`, each only when the
`orders` row holds it (`{}` when none), so the Feed order page can print a time
under every step already passed. `status` keeps its shape. All four readers
(`my_orders`, `track_order`, `receipt_order`, `admin_orders`) go through it.
`lib/db/order-dto.ts` reads a missing key as no moments, so the app runs on a
database from before B10. The sample orders carry the steps they passed:
`data/orders.ts` authors them by one rule taken from the Feed mock's own
orders (written beside `passedMoments`), and the seed writes them into
`seed_orders.paid_at` and `shipped_at`.

"Hoàn tác" after "Xoá" puts the address back as it was — its id, its place, its
fields, its default role:

| Function | Who may call it | What it does |
|---|---|---|
| `remove_address(id)` | `authenticated` | as before (the caller's own address; a removed default passes to the earliest left), and keeps the address it removed in `removed_addresses` — one row per account, the last removal |
| `restore_address(id)` | `authenticated` | the caller's last removal, if it is `id` and at most ten minutes old (`20260930110000_address_undo_window.sql`), back in the book: same id and place (an address added since that took the place moves one down), the default again if it was (the heir lets go), or if the book is empty; answers the id, the id again when it is back already, `null` when there is nothing of the caller's to put back — an older removal is forgotten, not put back |

Both are `security definer` and take the owner from `auth.uid()`; the browser
sends only the id. `removed_addresses` has row level security on and no policy
at all: no API role reads or writes it, and the reset empties it for every
account, so nothing a shopper deleted outlives the day.
`lib/db/address-undo.dbtest.ts` and `lib/db/order-moments.dbtest.ts` check all
of it.

## Resetting

`select public.reset_demo(public.demo_anchor());` rebuilds the catalogue from
the `seed_*` mirrors, puts every demo account's profile and address book back
to the fixture — including deleting whatever that account added by hand — and
its saved styles, reminders and settings too (slice B9: the first account gets
the mock's four styles, Số 06, L/M; all eight get the four switches on). An
account somebody made themselves keeps its address book, saved styles,
reminders and settings, except a saved style or reminder pointing at a style,
colour or issue the reset did not bring back. Every account's last removed
address is forgotten (slice B10). The reset replaces every order
with the twenty-four sample orders, setting `order_seq` so the next order is
`DH-2432` again, and starts the log again: one event for the state each
sample order is in, then one `DEMO_RESET` (the earlier steps the sample
carries since slice B10 have moments but no event). Stock and codes'
`used_count` come from the seed, which already accounts for the sample orders.
Every order gets a fresh `access_key`, so a guest's receipt cookie from before
a reset opens nothing after it.

`demo_anchor()` is the most recent 18:50 on a Vietnamese wall clock: the sample
was frozen at 18:50 on 20/09/2026, so the shift is a whole number of days and
every hour and minute in `data/` survives, every recorded moment lands in the
past and every deadline at least a day ahead. `reset_demo()` with no anchor
(null) uses the fixture's own instant, which is what the database tests that
compare against `data/` pass explicitly. **A daily cron (slice B4) should run
it just after 18:50 Vietnamese time**, so the day it starts is a whole day on
one anchor.

It is `security definer`, revoked from `anon`; `service_role` and
`authenticated` may call it, but the body refuses anybody who is neither the
service role nor the manager (`NOT_ADMIN`) — the back office's "Đặt lại dữ liệu
mẫu" is the manager's, and the log names who pressed it.
