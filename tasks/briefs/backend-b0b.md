# Brief — Lát B0b: catalog đọc từ Postgres (Supabase cục bộ) *(nháp 23/09/2026, giao sau khi B0a ĐẠT)*

Agent: `backend-implementer`. Hồ sơ nền: `tasks/backend.md` (QĐ-25). Tiền đề: lát B0a đã đạt, tức
`lib/catalog.ts` (`Catalog`, `CatalogInput`, `buildCatalog`), `data/fixture-catalog.ts`
(`FIXTURE_CATALOG`), `lib/db/catalog.ts` (`loadCatalog`, `catalogInput`) và
`components/shop/CatalogContext.tsx` đã tồn tại và mọi trang đi qua `loadCatalog()`.

Lát này đổi **thân** của `loadCatalog()` từ fixture sang Postgres chạy trong Supabase cục bộ
(Docker), dựng schema catalog, seed sinh từ `data/*.ts`, hàm `reset_demo(anchor)`, route
`/api/health`. Không auth, không đơn hàng, không Vercel, không Supabase hosted (đó là B1, B2, B4).

## 1. Lát

**B0b — Catalog from Postgres.** Sau lát này:

- `supabase/` tồn tại với `config.toml`, một migration catalog, `seed.sql` sinh máy;
- `npx supabase db reset` dựng DB cục bộ sạch với 21 mẫu, 38 màu, 152 ô tồn kho, 4 Số, 2 teaser, 6 mã;
- `loadCatalog()` gọi hàm SQL `catalog_snapshot()` qua server client và trả `Catalog` **bằng đúng**
  `FIXTURE_CATALOG` (test DB chứng minh);
- màn hình không đổi một pixel so với ảnh `after` của B0a;
- `npm test` vẫn chạy không cần Docker; `npm run test:db` cần stack cục bộ;
- `npm run build` thành công **khi Supabase đang tắt** (đọc DB chỉ xảy ra lúc request).

Dependency được phép (đúng bốn gói, không thêm): `supabase` (dev, CLI), `tsx` (dev, chạy script
sinh seed), `@supabase/supabase-js`, `@supabase/ssr`. Phiên bản mới nhất lúc cài (23/09: 2.117.0,
4.23.15, 2.117.0, 0.12.7); ghi vào báo cáo.

## 2. Quyết định áp dụng (đã chốt, không hỏi lại)

- **QĐ-25**: trình duyệt không gọi Supabase; không biến `NEXT_PUBLIC_SUPABASE_*`; không
  `createBrowserClient`; không import `@supabase/*` trong bất kỳ tệp `"use client"` nào hay dưới
  `components/`. Khoá và URL đọc từ env **chỉ trên server**: `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY` (tên do dự án đặt; hướng dẫn Supabase dùng tên `NEXT_PUBLIC_…` vì họ
  giả định có browser client, ta không có).
- **QĐ-24**: đồng hồ mẫu giữ nguyên. `reset_demo()` mặc định dùng **mốc fixture**
  `2026-09-20T18:50:00+07:00` nên dữ liệu trong DB trùng khít fixture; tham số `p_anchor` chỉ được
  dùng ở lát B3 khi đồng hồ thật trở lại.
- **`data/*.ts` là nguồn sự thật** của seed; `supabase/seed.sql` và `lib/db/database.types.ts` là
  tệp sinh máy, có test chống lệch, không sửa tay.
- **RLS bật trên mọi bảng ngay từ migration đầu**; catalog đọc công khai (`anon`, `authenticated`);
  không policy ghi; hàm phá huỷ (`reset_demo`) chỉ `service_role` gọi được.
- **Migration append-only** sau khi phiên chính duyệt; lát này tạo đúng một migration.
- **Timestamp** trong JSON trả về phải là chuỗi ISO **có `+07:00`**, vì `lib/datetime.ts` đọc múi giờ
  từ chữ (`toVnIso`, các formatter). Không được để Postgres tự chọn múi giờ phiên.
- Code tiếng Anh (SQL, script, comment). Không Realtime, không Storage, không Edge Functions.

## 3. Spec

### 3.1 Công cụ và môi trường

1. `docker info` phải chạy; nếu Docker Desktop tắt, bật bằng lệnh trong định nghĩa agent và chờ.
2. `npm i -D supabase tsx` và `npm i @supabase/supabase-js @supabase/ssr`.
3. `npx supabase init` (tạo `supabase/config.toml`; giữ mặc định, chỉ chắc chắn `[db.seed]
   enabled = true` và `sql_paths = ["./seed.sql"]`). Lần `npx supabase start` đầu tải image,
   có thể mất vài phút.
4. `.env.local` (không commit, đã trong `.gitignore`): `SUPABASE_URL=http://127.0.0.1:54321` và
   `SUPABASE_PUBLISHABLE_KEY=<khoá công khai mà supabase status in ra: "anon key" hoặc "publishable
   key" tuỳ phiên bản CLI>`. `.env.example` (commit) cùng hai tên biến, giá trị giữ chỗ.
5. `package.json` scripts thêm: `"seed:gen": "tsx scripts/gen-seed.ts"`, `"db:types": "supabase gen
   types typescript --local > lib/db/database.types.ts"`, `"test:db": "vitest run --config
   vitest.db.config.mts"`.

### 3.2 Migration `supabase/migrations/<YYYYMMDDHHMMSS>_catalog.sql`

Kiểu enum (tên là danh từ, giá trị y hệt `data/types.ts`):
`product_family` (TEE, HOODIE, JACKET, VEST, SHIRT, PANTS) · `product_fit` (OVERSIZE, REGULAR) ·
`color_key` (black, cream, grey, moss, brown, white, navy) · `garment_size` (S, M, L, XL) ·
`promo_kind` (PERCENT, AMOUNT, FREE_SHIPPING).

Bảng sống (schema `public`):

```sql
drops         (no integer primary key check (no > 0), opens_at timestamptz not null,
               closes_at timestamptz not null, check (closes_at > opens_at))
products      (id text primary key check (id ~ '^p-[a-z0-9-]+$'), slug text not null unique,
               name text not null, kind text not null, family product_family not null,
               material text not null, fit product_fit not null,
               price_vnd integer not null check (price_vnd > 0),
               cut_units integer not null check (cut_units > 0),
               drop_no integer not null references drops (no),
               sold_out_at timestamptz null,
               position integer not null unique)          -- catalog order = "newest" sort key
product_colors(product_id text references products (id) on delete cascade,
               color color_key not null, position integer not null, photo_key text not null,
               primary key (product_id, color), unique (product_id, position))
stock_cells   (product_id text not null, color color_key not null, size garment_size not null,
               on_hand integer not null check (on_hand >= 0),
               primary key (product_id, color, size),
               foreign key (product_id, color) references product_colors (product_id, color)
                 on delete cascade)
teasers       (slug text primary key, name text not null, kind text not null,
               family product_family not null, drop_no integer not null references drops (no),
               photo_key text not null, position integer not null unique)
promotions    (code text primary key check (code = upper(code) and code !~ '\s'),
               kind promo_kind not null,
               percent integer null check (percent between 1 and 100),
               max_discount_vnd integer null check (max_discount_vnd > 0),
               amount_vnd integer null check (amount_vnd > 0),
               starts_at timestamptz not null, ends_at timestamptz not null,
               usage_limit integer null check (usage_limit > 0),
               used_count integer not null default 0 check (used_count >= 0),
               min_order_vnd integer null check (min_order_vnd > 0),
               position integer not null unique,
               check (ends_at > starts_at),
               check ((kind = 'PERCENT' and percent is not null and amount_vnd is null)
                   or (kind = 'AMOUNT' and amount_vnd is not null and percent is null
                       and max_discount_vnd is null)
                   or (kind = 'FREE_SHIPPING' and percent is null and amount_vnd is null
                       and max_discount_vnd is null)))
```

Bảng seed, mỗi bảng sống một bản sao cùng cột và check (không FK):
`seed_drops`, `seed_products`, `seed_product_colors`, `seed_stock_cells`, `seed_teasers`,
`seed_promotions` — tạo bằng `create table seed_x (like x including all)`.

RLS: `enable row level security` trên cả 12 bảng. Policy `select` `using (true)` cho `anon` và
`authenticated` trên 6 bảng sống. Không policy nào khác. `revoke all on seed_* from anon,
authenticated`.

Hàm:

```sql
-- Rebuilds the live catalog tables from the seed tables, shifting every instant by
-- (p_anchor - fixture anchor). Default keeps the fixture dates (QĐ-24 demo clock).
create or replace function public.reset_demo(p_anchor timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$ ... $$;
revoke execute on function public.reset_demo(timestamptz) from public, anon, authenticated;
grant  execute on function public.reset_demo(timestamptz) to service_role;

-- One round trip for the whole catalog. Keys are camelCase and match data/types.ts;
-- every timestamptz is rendered as an ISO string with +07:00.
create or replace function public.catalog_snapshot()
returns jsonb language sql stable security invoker set search_path = '' as $$ ... $$;
grant execute on function public.catalog_snapshot() to anon, authenticated;
```

`reset_demo`: `delta := coalesce(p_anchor, '2026-09-20 18:50:00+07'::timestamptz) - '2026-09-20
18:50:00+07'::timestamptz`; `truncate` 6 bảng sống (một lệnh, thứ tự an toàn với FK); `insert …
select … from public.seed_*` với `opens_at + delta`, `closes_at + delta`, `sold_out_at + delta`,
`starts_at + delta`, `ends_at + delta`. Idempotent: chạy hai lần cho cùng kết quả.

`catalog_snapshot()` trả `{ "products": [...], "drops": [...], "teasers": [...], "promotions": [...] }`:
- `products` theo `position`; mỗi phần tử có `id, slug, name, kind, family, material, fit, priceVnd,
  cutUnits, dropNo, soldOutAt` (null → bỏ khoá hoặc `null`, mapper xử lý cả hai), `colors` (mảng
  `color_key` theo `product_colors.position`), `photoKeys` (mảng cùng thứ tự), `stock` (object
  `{ "<color>": { "S": n, "M": n, "L": n, "XL": n } }`).
- `drops`: `no, opensAt, closesAt`. `teasers` theo `position`: `slug, name, kind, family, dropNo,
  photoKey`. `promotions` theo `position`: `code, kind, percent?, maxDiscountVnd?, amountVnd?,
  startsAt, endsAt, usageLimit` (null giữ `null`, nghĩa là không giới hạn), `usedCount, minOrderVnd?`.
- Định dạng thời gian: `to_char(ts at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')`.
  So với chuỗi trong `data/*.ts`: nếu fixture viết giây là `:00` thì khớp; nếu fixture có chuỗi không
  có giây, mapper **không** được chuẩn hoá lén — báo lại và ta chốt cách so sánh trong test.

### 3.3 Sinh seed: `scripts/gen-seed.ts`

- Export hàm thuần `renderSeedSql(input: CatalogInput): string` + entry CLI (`npx tsx
  scripts/gen-seed.ts` ghi `supabase/seed.sql`). Đầu ra xác định (thứ tự cố định, không timestamp
  sinh lúc chạy).
- Nội dung: `truncate public.seed_* ...;` rồi các `insert into public.seed_* values (...)` cho 6 bảng
  (`position` = chỉ số trong mảng fixture; `product_colors.position` = chỉ số trong `Product.colors`;
  `photo_key` = `photoKeys[i]`; mỗi ô `stock` một dòng `seed_stock_cells`), thoát chuỗi bằng nhân đôi
  dấu nháy đơn, timestamp là literal `'…+07:00'::timestamptz`; kết bằng `select public.reset_demo();`.
- `scripts/gen-seed.test.ts` (chạy trong `npm test`, không cần DB): `renderSeedSql(catalogInput(
  FIXTURE_CATALOG))` **bằng** nội dung `supabase/seed.sql` trên đĩa (đọc bằng `fs`). Đây là chốt
  chống lệch: sửa fixture mà quên `npm run seed:gen` thì test đỏ.
- `vitest.config.mts` thêm `scripts/**/*.test.ts` vào `include`.

### 3.4 DAL

- `lib/db/server.ts` (`import "server-only"`): `createServerClient<Database>(url, key, { cookies: {
  getAll, setAll } })` đúng mẫu ở https://supabase.com/docs/guides/auth/server-side/creating-a-client
  (bản Next.js App Router, `setAll` bọc try/catch vì Server Component không set cookie được). Export
  `getSupabase()`; đọc `process.env.SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`, thiếu thì `throw` với
  thông điệp nêu tên biến (không in giá trị).
- `lib/db/database.types.ts`: sinh bằng `npm run db:types`, commit.
- `lib/db/catalog-snapshot.ts` (thuần, không `server-only`): `parseCatalogSnapshot(json: unknown):
  CatalogInput` — kiểm hình dạng bằng guard viết tay (không thêm zod), lỗi thì `throw` với đường dẫn
  trường sai. `lib/db/catalog-snapshot.test.ts`: round-trip từ một JSON dựng trong test theo đúng
  hình dạng §3.2 và các trường hợp lỗi (thiếu `stock`, `family` lạ, timestamp không có `+07:00`).
- `lib/db/catalog.ts`: 

  ```ts
  import "server-only";
  import { cache } from "react";
  import { connection } from "next/server";
  export const loadCatalog = cache(async (): Promise<Catalog> => {
    await connection();                       // request-time read, never at build
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("catalog_snapshot");
    if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);
    return buildCatalog(parseCatalogSnapshot(data));
  });
  ```
  Kiểm `connection()` trong `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
  connection.md` và `React.cache` trong `01-getting-started/06-fetching-data.md`.
- `app/products/[slug]/page.tsx`: bỏ `generateStaticParams` (đọc DB lúc build là sai); slug lạ →
  `notFound()` như cũ. Sau build, mọi trang gọi `loadCatalog()` phải hiện là dynamic (`ƒ`) trong
  bảng của `next build`; ghi số trang static/dynamic trước và sau vào báo cáo.

### 3.5 Route sức khoẻ `app/api/health/route.ts`

`GET`: nếu `process.env.CRON_SECRET` có giá trị thì bắt buộc header `authorization` bằng
`Bearer ${CRON_SECRET}` (mẫu ở https://vercel.com/docs/cron-jobs/manage-cron-jobs, mục "Securing
cron jobs"), sai → 401; rồi `supabase.from("drops").select("no", { count: "exact", head: true })`;
trả `Response.json({ ok: true, drops: count })` với `Cache-Control: no-store`; lỗi DB → 503
`{ ok: false }` không lộ thông điệp nội bộ. Cục bộ không đặt `CRON_SECRET` nên gọi tự do. `vercel.json`
để lát B4.

### 3.6 Test DB: `vitest.db.config.mts` + `lib/db/catalog.dbtest.ts`

- Config riêng: `include: ["lib/db/**/*.dbtest.ts"]`, `environment: "node"`, nạp `.env.local` bằng
  `loadEnvConfig` của `@next/env` (mẫu trong `02-guides/environment-variables.md`).
- Test dùng `createClient` thường của `@supabase/supabase-js` (không đi qua `next/headers`): gọi
  `rpc("catalog_snapshot")` → `parseCatalogSnapshot` → `buildCatalog`, rồi `expect(...).toEqual(
  FIXTURE_CATALOG)` trên `products`, `drops`, `teasers`, `promotions` (so mảng, không so Map); thêm
  đếm dòng: 21 / 38 / 152 / 4 / 2 / 6; mỗi màu có đủ 4 size; `reset_demo()` chạy lần hai bằng
  service key cục bộ vẫn cho cùng snapshot (idempotent) — service key chỉ đọc từ `supabase status`
  trong test, không ghi vào tệp nào.

## 4. Kiểm nghiệm thu (theo thứ tự; tất cả phải đạt)

1. `npx supabase db reset` sạch; `npm run db:types` không làm đổi tệp đã commit (chạy hai lần, `git
   diff --stat lib/db/database.types.ts` rỗng).
2. `npm run seed:gen` chạy hai lần cho tệp giống hệt; `npm test` xanh **khi Supabase đã stop**
   (chứng minh hermetic: `npx supabase stop`, chạy `npm test`, rồi `npx supabase start` lại).
3. `npm run test:db` xanh với stack đang chạy.
4. `npm run typecheck` sạch; `npm run build` sạch **với `.env.local` có nhưng Supabase đang stop**.
5. Grep gate: `grep -rl "NEXT_PUBLIC_SUPABASE" . --exclude-dir=node_modules --exclude-dir=.next`
   rỗng; `grep -rl "@supabase/" components app | xargs grep -l '"use client"'` rỗng;
   `grep -rl "createBrowserClient" app components lib` rỗng; `grep -rlE 'from "@/data/(catalog|
   promotions|fixture-catalog)"' app components lib | grep -v '\.test\.'` chỉ còn các tệp mà B0a
   cho phép (`lib/db/catalog.ts` **không còn** import fixture nữa; `scripts/gen-seed.ts` được phép).
6. Preview 3200 với stack chạy: sweep 0 lỗi console, 0 tràn, 0 chữ < 11px, **0 request ngoài
   3200**; ảnh `.playwright-cli/shots/backend/b0b/after/*` giống hệt `…/b0a/after/*` cùng tên.
7. `curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://127.0.0.1:3200/` và
   `/api/health` trả 200; ghi thời gian vào báo cáo cùng số đo tương ứng của B0a.

## 5. Sản phẩm nộp

- `supabase/config.toml`, `supabase/migrations/*_catalog.sql`, `supabase/seed.sql`,
  `lib/db/database.types.ts`, `.env.example`.
- Ảnh `.playwright-cli/shots/backend/b0b/after/…` cùng tên B0a; `.playwright-cli/sweep.json`.
- Báo cáo 6 mục; mục "Kiểm chứng" ghi rõ phiên bản CLI, thời gian `supabase start` lần đầu, và bảng
  static/dynamic của `next build`.

## Đọc trước khi sửa

Supabase (WebFetch): https://supabase.com/docs/guides/local-development/overview ·
https://supabase.com/docs/guides/local-development/seeding-your-database ·
https://supabase.com/docs/guides/auth/server-side/creating-a-client ·
https://supabase.com/docs/guides/api/rest/generating-types ·
https://supabase.com/docs/guides/database/postgres/row-level-security ·
https://supabase.com/docs/guides/database/functions.
Next (cục bộ): `01-getting-started/06-fetching-data.md`, `15-route-handlers.md`,
`03-api-reference/04-functions/connection.md`, `02-guides/environment-variables.md`,
`02-guides/data-security.md`. Dự án: `data/types.ts`, `lib/catalog.ts`, `lib/db/catalog.ts` (B0a),
`lib/datetime.ts` (cách đọc `+07:00`), `data/catalog.test.ts` (bất biến của fixture),
`tasks/backend.md` §6.
