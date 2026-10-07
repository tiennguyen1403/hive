import json, sys
CART = json.dumps({"v": 1, "lines": [{"productId": "p-khoi", "size": "M", "color": "black", "qty": 1}]})
S = lambda name, route, who="shopper", **k: dict(name=name, route=route, who=who, **k)
SHOP = [
  S("home", "/"), S("home-shop", "/#cua-hang"), S("home-soon", "/#sap-mo"),
  S("products", "/products"), S("products-basics", "/products?line=fixed"),
  S("pdp-khoi", "/products/s05-khoi"), S("pdp-ao-thun-tron", "/products/ao-thun-tron"),
  S("search", "/search"), S("search-khoi", "/search?q=khoi"), S("search-none", "/search?q=zzzz"),
  S("cart", "/cart"), S("checkout", "/checkout"),
  S("invoice-2430", "/order-confirmed/DH-2430"),
  S("so", "/so"), S("so-3", "/so/3"), S("so-4", "/so/4"), S("so-5", "/so/5"), S("so-999", "/so/999"),
  S("faq", "/faq"), S("faq-cod", "/faq?q=cod"), S("size-guide", "/size-guide"), S("about", "/about"),
  S("contact", "/contact"), S("privacy", "/privacy"), S("returns", "/returns"),
  S("notfound", "/khong-co-trang-nay"),
  S("account", "/account"), S("account-profile", "/account/profile"), S("account-password", "/account/password"),
  S("account-orders", "/account/orders"), S("account-notifications", "/account/notifications"),
  S("order-2430", "/account/orders/DH-2430"), S("order-2310", "/account/orders/DH-2310"),
  S("order-2310-tracking", "/account/orders/DH-2310/tracking"), S("order-9999", "/account/orders/DH-9999"),
  S("account-addresses", "/account/addresses"), S("account-addresses-new", "/account/addresses/new"),
  S("account-wishlist", "/account/wishlist"),
  # signed out
  S("g-sign-in", "/sign-in", "guest"), S("g-sign-up", "/sign-up", "guest"), S("g-forgot", "/forgot-password", "guest"),
  S("g-account", "/account", "guest"), S("g-wishlist", "/account/wishlist", "guest"),
  S("g-notifications", "/account/notifications", "guest"), S("g-orders", "/account/orders", "guest"),
  S("g-track", "/track", "guest"), S("g-track-found", "/track?code=DH-2425&phone=0908221447", "guest", settle=2500),
  S("g-order-confirmed", "/order-confirmed", "guest"), S("g-cart", "/cart", "guest"),
]
width = json.loads(sys.argv[1]); chunks = int(sys.argv[2]); label = sys.argv[3]; ip = int(sys.argv[4])
n = len(SHOP); size = -(-n // chunks)
for i in range(chunks):
    part = SHOP[i*size:(i+1)*size]
    cfg = dict(label=f"{label}-{i}", out=".playwright-cli/audit-v6/shots", ipBase=ip + i, cart=CART, langs=["vi", "en"], widths=[width], states=part)
    json.dump(cfg, open(f"data/cfg-{label}-{i}.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"data/cfg-{label}-{i}.json", len(part))
