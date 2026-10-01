-- ─────────────────────────────────── "Sửa giờ" keeps one issue at a time
--
-- Slice B14. `admin_schedule_drop()` (`20260924020000_catalog_admin.sql`) is
-- replaced by a version that refuses a window overlapping another issue.
--
-- WHY. The shop sells one issue at a time, and says so in several places:
-- `lib/drop.ts` ("drops never overlap"), the calendar of issues in the
-- footer, "the one selling now" on the home page. Slice B3c
-- (`20260924040000_photos.sql`) made `admin_add_drop()` refuse a new issue
-- that overlaps another — `NOT_ALLOWED`, the issue in the way in DETAIL — and
-- `addDrop` asks the same first ("Lịch chồng lên Số NN"). But
-- `admin_schedule_drop()` and `scheduleDrop` checked nothing, so "Sửa giờ"
-- could do what "Tạo số" may not. Reproduced in round v5 slice 4: with Số 06
-- running 12/10 → 26/10, Số 07 moved to 20/10 → 30/10 was taken, and from
-- 20/10 two issues sold at once. The hole dates from B3c and is on the demo
-- too.
--
-- THE RULE, the one `admin_add_drop()` v2 applies, and `scheduleClash`
-- (`lib/catalog-admin.ts`) asks first:
--
--   · two windows overlap when each opens before the other closes — open-
--     inclusive, close-exclusive, like `lib/drop.ts#dropState` — so an issue
--     may open the very instant another closes;
--   · the issue being moved is compared with the OTHER issues only: its old
--     days are the ones it gives up;
--   · a window that only NARROWS — opening no earlier and closing no later
--     than the issue does now — is never refused: it cannot make an overlap
--     that was not there already. "Đóng sớm" (`closeDropNow`) is this
--     function with the closing hour brought to now, and it must always
--     close, even on a calendar that already holds two issues at once (as the
--     demo may, from before this file);
--   · a refusal is `NOT_ALLOWED` with the issue in the way in DETAIL — the
--     lowest number when the window runs into several — exactly as for a new
--     issue, so the screen says "Lịch chồng lên Số NN" either way.
--
-- THE LOCK. The whole table in SHARE ROW EXCLUSIVE mode, as `admin_add_drop()`
-- v2 takes it. The mode is self-exclusive and conflicts with the ROW
-- EXCLUSIVE lock every UPDATE, INSERT and DELETE takes, so two moves made at
-- once — or a move and a new issue — queue up, and the second reads the
-- calendar the first left: under READ COMMITTED each statement of a VOLATILE
-- function sees what committed before it began. Without the lock, Số 06 and
-- Số 07 moved onto the same days at the same moment would each read the
-- other's old days and both go through. It replaces v1's `for update` on the
-- one row, which it covers. Readers — the catalogue, checkout — take ACCESS
-- SHARE, which it does not block.
--
-- EVERYTHING ELSE IS v1's: the signature, who may call it (`create or
-- replace` keeps the grants), `NOT_ADMIN`, the clock (`assert_now`),
-- `BAD_INPUT` for a missing instant or a closing hour not after the opening
-- one, `NOT_FOUND`, and one `DROP_SCHEDULED` event with both pairs.
-- `admin_add_drop()` is not touched.
--
-- Sources: https://www.postgresql.org/docs/current/explicit-locking.html
-- (SHARE ROW EXCLUSIVE "protects a table against concurrent data changes,
-- and is self-exclusive so that only one session can hold it at a time";
-- ROW EXCLUSIVE is what UPDATE, DELETE and INSERT acquire; "a transaction
-- never conflicts with itself"; a lock "is normally held until the end of the
-- transaction"), https://www.postgresql.org/docs/current/transaction-iso.html
-- (Read Committed is the default; "a SELECT query … sees a snapshot of the
-- database as of the instant the query begins to run"),
-- https://www.postgresql.org/docs/current/xfunc-volatility.html ("VOLATILE
-- functions obtain a fresh snapshot at the start of each query they
-- execute"; VOLATILE is the default),
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change"),
-- https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html
-- (`raise … using message, detail`),
-- https://supabase.com/docs/guides/database/functions (security definer,
-- `set search_path = ''`, every relation schema-qualified).

create or replace function public.admin_schedule_drop(
  p_no        integer,
  p_opens_at  timestamptz,
  p_closes_at timestamptz,
  p_now       timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_drop  record;
  v_clash integer;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_no is null or p_opens_at is null or p_closes_at is null
     or p_closes_at <= p_opens_at then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- Until the end of the transaction: see THE LOCK above.
  lock table public.drops in share row exclusive mode;

  select d.opens_at, d.closes_at into v_drop
    from public.drops d where d.no = p_no;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  -- Only a window reaching outside the issue's own days is checked: one
  -- inside them (opening no earlier, closing no later) is never refused.
  if p_opens_at < v_drop.opens_at or p_closes_at > v_drop.closes_at then
    select d.no into v_clash
      from public.drops d
     where d.no <> p_no
       and d.opens_at < p_closes_at
       and d.closes_at > p_opens_at
     order by d.no
     limit 1;
    if found then
      raise exception using message = 'NOT_ALLOWED', detail = v_clash::text;
    end if;
  end if;

  update public.drops
     set opens_at  = p_opens_at,
         closes_at = p_closes_at
   where no = p_no;

  insert into public.events (at, actor_role, actor, kind, drop_no, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'DROP_SCHEDULED', p_no,
    jsonb_build_object(
      'before', jsonb_build_object(
        'opensAt', public.vn_iso(v_drop.opens_at),
        'closesAt', public.vn_iso(v_drop.closes_at)
      ),
      'after', jsonb_build_object(
        'opensAt', public.vn_iso(p_opens_at),
        'closesAt', public.vn_iso(p_closes_at)
      )
    )
  );
end;
$$;

-- (grants unchanged: authenticated only, the body asks for the role)
