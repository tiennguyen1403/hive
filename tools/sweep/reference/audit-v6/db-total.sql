-- read only: the newest card orders and their exact totals
select o.code, o.state, o.payment, o.customer_handle is not null as sample, o.stripe_session_id is not null as has_session,
       (coalesce(sum(l.unit_price_vnd::bigint * l.qty), 0) + o.shipping_fee_vnd + o.cod_fee_vnd - o.discount_vnd)::integer as total
  from public.orders o left join public.order_lines l on l.order_code = o.code
 where o.payment = 'CARD' and o.placed_at > now() - interval '3 hours'
 group by o.code, o.state, o.payment, o.customer_handle, o.stripe_session_id, o.shipping_fee_vnd, o.cod_fee_vnd, o.discount_vnd
 order by o.code;
