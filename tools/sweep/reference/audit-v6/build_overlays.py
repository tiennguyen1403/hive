import json
FULL = [{"productId": "p-khoi", "size": "M", "color": "black", "qty": 2}, {"productId": "p-ao-thun-tron", "size": "M", "color": "black", "qty": 1}, {"productId": "p-cat", "size": "S", "color": "cream", "qty": 1}]
PROB = [{"productId": "p-khoi", "size": "L", "color": "black", "qty": 3}, {"productId": "p-bui", "size": "M", "color": "black", "qty": 1}, {"productId": "p-kho", "size": "M", "color": "cream", "qty": 1}, {"productId": "p-ao-thun-tron", "size": "M", "color": "black", "qty": 1}]
PW = [[390, 844], [1280, 800]]
P9 = [[390, 844], [900, 1000], [1280, 800]]
def S(name, route, who="shopper", **k): return dict(name=name, route=route, who=who, **k)
A = [
  S("ov-sort", "/products", act="sortSheet", overlay=True),
  S("ov-quickadd", "/products", act="quickAdd", overlay=True, widths=P9),
  S("ov-quickadd-guide", "/products", act="quickAddGuide", overlay=True),
  S("ov-added", "/products", act="added", overlay=True, cart=[]),
  S("ov-pdp-guide", "/products/s05-khoi", act="pdpGuide", overlay=True),
  S("ov-pdp-buy", "/products/s05-khoi", act="pdpBuy", overlay=True, widths=[[390, 844]]),
  S("ov-search-type", "/search", act="searchType", overlay=True),
  S("st-cart-full", "/cart", cart=FULL),
  S("st-cart-problems", "/cart", cart=PROB),
  S("ov-cart-swap", "/cart", cart=PROB, act="cartSwap", overlay=True),
  S("ov-cart-removed", "/cart", cart=FULL, act="cartRemoved", overlay=True),
  S("st-cart-empty", "/cart", cart=[]),
]
B = [
  S("st-co-guest-errors", "/checkout", "guest", cart=FULL, act="coErrors"),
  S("ov-co-province", "/checkout", "guest", cart=FULL, act="pickProvince", overlay=True, widths=P9),
  S("ov-co-ward", "/checkout", "guest", cart=FULL, act="pickWard", overlay=True),
  S("st-co-card", "/checkout", cart=FULL, act="coCard"),
  S("st-co-express-cod", "/checkout", cart=FULL, act="coExpressCod"),
  S("st-co-promo-wrong", "/checkout", cart=FULL, act="coPromoWrong"),
  S("st-co-promo-ok", "/checkout", cart=FULL, act="coPromoOk"),
  S("st-track-errors", "/track", "guest", act="trackErrors"),
  S("st-track-mismatch", "/track", "guest", act="trackMismatch", spoof=True),
  S("st-sign-errors", "/sign-in", "guest", act="signErrors"),
  S("st-sign-wrong", "/sign-in", "guest", act="signWrong", spoof=True),
  S("ov-od-cancel", "/account/orders/DH-2430", act="odCancel", overlay=True),
]
C = [
  S("ov-ad-add", "/account/addresses?add=1", act="adAdd", overlay=True, widths=P9),
  S("ov-ad-add-errors", "/account/addresses?add=1", act="adAddErrors", overlay=True, widths=P9),
  S("ov-ad-province", "/account/addresses?add=1", act="adProvince", overlay=True),
  S("ov-pf-pw", "/account/profile", act="pfPw", overlay=True),
  S("st-pf-errors", "/account/profile", act="pfErrors", spoof=True),
  S("ov-wl-size", "/account/wishlist", act="wlSize", overlay=True),
  S("ov-g-fav-toast", "/", "guest", act="favToast", overlay=True),
  S("ov-g-remind-toast", "/", "guest", act="remindToast", overlay=True),
  S("st-lang-switch", "/", act="langSwitch", langs=["vi"]),
  S("st-me-empty", "/account", "quanly"),
  S("st-orders-empty", "/account/orders", "quanly"),
  S("st-wl-empty", "/account/wishlist", "bao"),
  S("st-notif-empty", "/account/notifications", "quanly"),
]
for tag, part, ip in (("a", A, 101), ("b", B, 102), ("c", C, 103)):
    cfg = dict(label=f"ov-{tag}", out=".playwright-cli/audit-v6/shots", ipBase=ip, cart=json.dumps({"v": 1, "lines": FULL[:1]}),
               langs=["vi", "en"], widths=PW, states=part, accounts={"bao": "bao.dang@email.com", "quanly": "quanly@email.com"})
    json.dump(cfg, open(f"data/cfg-ov-{tag}.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(tag, len(part))
