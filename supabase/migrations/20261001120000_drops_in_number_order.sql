-- ──────────────────────────────── the issues run in the order of their numbers
--
-- Slice B14b. `admin_add_drop()` (v2, `20260924040000_photos.sql`) and
-- `admin_schedule_drop()` (v2, `20261001100000_schedule_drop_overlap.sql`)
-- are replaced by versions that also keep the issues in the order of their
-- numbers.
--
-- WHY. Slice B14 made "Sửa giờ" refuse a window that overlaps another issue,
-- as "Tạo số" already did. An issue could still be moved PAST its neighbour
-- without sharing an instant with it: with Số 06 running 12/10 → 26/10, Số 07
-- moved to 06/10 → 11/10 overlaps nothing, and was taken. Eight places assume
-- the numbers run in order (listed in `tasks/plan.md` after B14): the
-- calendar of issues in the footer, the feed, the share image, `/so`, the
-- opening reminders, the teasers on "Các số", "Nhân bản" for a code and the
-- overview. Once Số 07 ran before Số 06, all eight said the wrong thing. The
-- user approved the rule on 01/10.
--
-- THE RULE, which `orderClash` (`lib/catalog-admin.ts`) asks first. Call N the
-- issue being created or moved; its PREVIOUS issue is the nearest lower
-- number there is, its NEXT issue the nearest higher one:
--
--   · N opens no earlier than the previous issue closes. The very instant it
--     closes is fine, as for an overlap;
--   · N closes no later than the next issue opens;
--   · a new issue is always the highest number plus one, so
--     `admin_add_drop()` only has a previous issue to ask about;
--   · a window that only NARROWS an issue's days (opening no earlier and
--     closing no later than it does now) is never refused, as in B14.
--     "Đóng sớm" is `admin_schedule_drop()` with the closing hour brought to
--     now, and it must close even on a calendar already out of order, as the
--     demo may be from before this file;
--   · the overlap is asked first. A window that shares an instant with
--     another issue AND breaks the order is refused as an overlap: on a
--     calendar in order every overlap breaks the order too, and the overlap
--     names the issue actually in the way. Then the previous issue, then the
--     next one. Breaking both is only possible on a calendar already out of
--     order.
--
-- THE REFUSAL. Every calendar refusal is `NOT_ALLOWED` with the other issue's
-- number in DETAIL, the shape B3c and B14 gave an overlap. HINT now says
-- which rule:
--
--   · `OVERLAP`  the issue in DETAIL shares an instant with the window (the
--                lowest number when several): "Lịch chồng lên Số 05";
--   · `PREVIOUS` the issue in DETAIL is the previous one, and the window
--                opens before it closes: "Số 07 phải mở sau khi Số 06 đóng";
--   · `NEXT`     the issue in DETAIL is the next one, and the window closes
--                after it opens: "Số 06 phải đóng trước khi Số 07 mở".
--
-- `calendarRefusal` (`lib/catalog-admin.ts`) reads the three, and reads no
-- HINT as an overlap, the only calendar refusal a database without this file
-- raises. Why HINT on `NOT_ALLOWED` rather than new codes: the refusal is
-- still "this window is not allowed", DETAIL keeps the shape the app already
-- reads, and PostgREST hands HINT over beside it (`hint`). An app from before
-- B14b reads an order refusal from "Tạo số" as an overlap with the right
-- issue: the wrong words, for as long as the database is ahead of the app,
-- but a refusal naming Số 06. A code it did not know would have read as
-- "Chưa lưu được. Thử lại sau ít phút.", which no retry fixes. "Tạo số"
-- offering a number another tab took stays `NOT_ALLOWED` with no DETAIL.
--
-- THE LOCK is B14's, in both functions: the whole table in SHARE ROW
-- EXCLUSIVE mode before the calendar is read, until the end of the
-- transaction. The mode is self-exclusive, so two moves made at once (or a
-- move and a new issue) queue up, and the second reads the calendar the first
-- left. Without it, Số 06 moved into the late part of a gap and Số 07 moved
-- into the early part of the same gap at the same moment would each read the
-- other's old days, and the two would swap places unseen.
--
-- EVERYTHING ELSE IS v2's in both functions: the signatures, who may call them
-- (`create or replace` keeps the grants: authenticated only, the body asks
-- for the role), `NOT_ADMIN`, the clock (`assert_now`), `BAD_INPUT`,
-- `NOT_FOUND`, the next number for a new issue, and the one event each
-- (`DROP_ADDED`, `DROP_SCHEDULED` with both pairs).
--
-- Sources: https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html
-- (the `raise … using` options MESSAGE, DETAIL and HINT; "the default is to
-- use raise_exception (P0001)"),
-- https://docs.postgrest.org/en/stable/references/errors.html (a RAISE's
-- DETAIL and HINT arrive as "details" and "hint"; P0001 is a 400),
-- https://www.postgresql.org/docs/current/plpgsql-statements.html ("A SELECT
-- INTO statement sets FOUND true if a row is assigned, false if no row is
-- returned"), https://www.postgresql.org/docs/current/explicit-locking.html
-- (SHARE ROW EXCLUSIVE is self-exclusive and conflicts with the ROW EXCLUSIVE
-- lock UPDATE, DELETE and INSERT take),
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change"),
-- https://supabase.com/docs/guides/database/functions (security definer,
-- `set search_path = ''`, every relation schema-qualified).

-- ─────────────────────────────────────────────────────────── a new issue (v3)
create or replace function public.admin_add_drop(
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
  v_next           integer;
  v_clash          integer;
  v_previous       integer;
  v_previous_close timestamptz;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_no is null or p_no <= 0 or p_opens_at is null or p_closes_at is null
     or p_closes_at <= p_opens_at then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- Until the end of the transaction: see THE LOCK above.
  lock table public.drops in share row exclusive mode;

  select coalesce(max(d.no), 0) + 1 into v_next from public.drops d;
  if p_no <> v_next then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  -- 1. No instant shared with another issue (B3c).
  select d.no into v_clash
    from public.drops d
   where d.opens_at < p_closes_at
     and d.closes_at > p_opens_at
   order by d.no
   limit 1;
  if found then
    raise exception using message = 'NOT_ALLOWED', detail = v_clash::text, hint = 'OVERLAP';
  end if;

  -- 2. Not before the previous issue closes (B14b). The new number is the
  --    highest, so there is no next issue to ask about.
  select d.no, d.closes_at into v_previous, v_previous_close
    from public.drops d
   where d.no < p_no
   order by d.no desc
   limit 1;
  if found and p_opens_at < v_previous_close then
    raise exception using message = 'NOT_ALLOWED', detail = v_previous::text, hint = 'PREVIOUS';
  end if;

  insert into public.drops (no, opens_at, closes_at) values (p_no, p_opens_at, p_closes_at);

  insert into public.events (at, actor_role, actor, kind, drop_no, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'DROP_ADDED', p_no,
    jsonb_build_object('opensAt', public.vn_iso(p_opens_at), 'closesAt', public.vn_iso(p_closes_at))
  );
end;
$$;

-- (grants unchanged: authenticated only, the body asks for the role)

-- ──────────────────────────────────────────────────── an issue moved (v3)
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
  v_drop           record;
  v_clash          integer;
  v_previous       integer;
  v_previous_close timestamptz;
  v_next           integer;
  v_next_open      timestamptz;
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
    -- 1. No instant shared with another issue (B14).
    select d.no into v_clash
      from public.drops d
     where d.no <> p_no
       and d.opens_at < p_closes_at
       and d.closes_at > p_opens_at
     order by d.no
     limit 1;
    if found then
      raise exception using message = 'NOT_ALLOWED', detail = v_clash::text, hint = 'OVERLAP';
    end if;

    -- 2. Not before the previous issue closes (B14b).
    select d.no, d.closes_at into v_previous, v_previous_close
      from public.drops d
     where d.no < p_no
     order by d.no desc
     limit 1;
    if found and p_opens_at < v_previous_close then
      raise exception using message = 'NOT_ALLOWED', detail = v_previous::text, hint = 'PREVIOUS';
    end if;

    -- 3. Not after the next issue opens (B14b).
    select d.no, d.opens_at into v_next, v_next_open
      from public.drops d
     where d.no > p_no
     order by d.no
     limit 1;
    if found and p_closes_at > v_next_open then
      raise exception using message = 'NOT_ALLOWED', detail = v_next::text, hint = 'NEXT';
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
