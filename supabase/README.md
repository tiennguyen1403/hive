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
npm run seed:users          # the eight demo accounts in auth.users
npm run db:types            # regenerate lib/db/database.types.ts
```

`db reset` and `seed:users` are two steps and have to stay two: `auth.users`
is Supabase's own table, a row in it needs a hashed password and an identity,
and only the admin API can make one. `db reset` fills the `seed_*` mirrors and
calls `reset_demo()`, which quietly skips every demo account that does not
exist yet; `seed:users` creates them and calls `reset_demo()` again, which is
when their profiles and addresses appear.

Both are idempotent. `npm run seed:users` twice prints `0 created, 8 already
there` the second time.

## What is generated, and from what

| File | Made by | Source of truth |
|---|---|---|
| `seed.sql` | `npm run seed:gen` | `data/catalog.ts`, `data/promotions.ts`, `data/customers.ts` |
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

Eight, one per customer in `data/customers.ts`, all with the same password
(`DEMO_PASSWORD`). The sign-in screen prints the first one's email and the
password, and offers a one-press "Đăng nhập thử" — this is a public portfolio
demo and an account nobody can open is a demo nobody can look at.

A demo account's `profiles.handle` carries its fixture id (`c-minhanh`). That
is what still ties it to the sample orders in `data/orders.ts`, which move to
the database in slice B2. An account created through the sign-up form has no
handle, and therefore no sample orders.

## Resetting

`select public.reset_demo();` rebuilds the catalogue from the `seed_*` mirrors
and puts every demo account's profile and address book back to the fixture —
including deleting whatever that account added by hand. It is `security
definer`, revoked from `anon` and `authenticated`, and granted to
`service_role` only.
