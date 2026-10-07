"""build_card.py phase: card states from data/db-place.json. phase = pending | paid"""
import json, sys
sys.path.insert(0, 'scripts')
from load import load
phase = sys.argv[1]
p = load('data/db-place.json')
A, B, gc = p['codeA'], p['codeB'], p['guestCookie']
gc = [dict(name=gc['name'], value=gc['value'], url="http://127.0.0.1:3200", httpOnly=True)]
W = [[390, 844], [900, 1000], [1280, 800]]
def S(name, route, who="shopper", **k): return dict(name=name, route=route, who=who, **k)
if phase == 'pending':
    st = [S("c-inv-pending", f"/order-confirmed/{A}", "guest", extraCookies=gc),
          S("c-inv-cancelled-return", f"/order-confirmed/{A}?payment=cancelled", "guest", extraCookies=gc),
          S("c-inv-failed", f"/order-confirmed/{A}?payment=failed", "guest", extraCookies=gc),
          S("c-track-pending", f"/track?code={A}&phone=0900000001", "guest", settle=2500),
          S("c-b-order-cancelled", f"/account/orders/{B}"),
          S("c-b-inv-cancelled", f"/order-confirmed/{B}"),
          S("c-b-orders", "/account/orders"),
          S("c-a-order-pending", f"/admin/orders/{A}", "admin", widths=[[1280, 800], [900, 1000]]),
          S("c-a-order-b-cancelled", f"/admin/orders/{B}", "admin", widths=[[1280, 800]]),
          S("c-a-orders", "/admin/orders", "admin", widths=[[1280, 800], [1440, 900]]),
          S("c-a-overview", "/admin", "admin", widths=[[1280, 800]])]
else:
    st = [S("c-inv-paid", f"/order-confirmed/{A}", "guest", extraCookies=gc),
          S("c-track-paid", f"/track?code={A}&phone=0900000001", "guest", settle=2500),
          S("c-a-order-paid", f"/admin/orders/{A}", "admin", widths=[[1280, 800], [900, 1000]]),
          S("c-a-orders-paid", "/admin/orders", "admin", widths=[[1280, 800]])]
cfg = dict(label=f"card-{phase}", out=".playwright-cli/audit-v6/shots", ipBase=151 if phase == 'pending' else 152,
           langs=["vi", "en"], widths=W, states=st)
json.dump(cfg, open(f"data/cfg-card-{phase}.json", "w", encoding="utf-8"), ensure_ascii=False)
print(phase, A, B, len(st))
