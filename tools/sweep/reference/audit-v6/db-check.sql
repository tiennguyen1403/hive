-- read only: the state the reset must give back
select count(*) as orders from public.orders;
select no, opens_at, closes_at from public.drops order by no;
select count(*) as events, max(at) as last_event from public.events;
