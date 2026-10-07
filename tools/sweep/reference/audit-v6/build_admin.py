import json
R = ["/admin", "/admin/orders", "/admin/orders/DH-2429", "/admin/orders/DH-2430", "/admin/orders/DH-2418", "/admin/orders/DH-2311",
     "/admin/orders/DH-2425", "/admin/drops", "/admin/drops/05", "/admin/drops/04", "/admin/drops/06", "/admin/drops/99", "/admin/promotions",
     "/admin/products", "/admin/products?drop=5", "/admin/products?drop=6", "/admin/products?drop=4", "/admin/products/new",
     "/admin/products/p-khoi", "/admin/products/p-ao-thun-tron", "/admin/customers", "/admin/customers/c-minhanh",
     "/admin/customers/c-namle", "/admin/slips?codes=DH-2429,DH-2428,DH-2423,DH-2426", "/admin/log", "/admin?days=7", "/admin?days=30",
     "/admin/orders?tab=AWAITING_TRANSFER"]
def name(r): return "a" + r.replace("/admin", "").replace("/", "-").replace("?", "-").replace("=", "-").replace(",", "-") or "a"
states = []
for r in R:
    w = [[1280, 800], [1440, 900]] if r in ("/admin", "/admin/orders") else [[1280, 800]]
    states.append(dict(name=name(r) if name(r) != "a" else "a-overview", route=r, who="admin", widths=w))
states.append(dict(name="a-overview-narrow", route="/admin", who="admin", widths=[[390, 844], [900, 1000]]))
half = len(states) // 2
for tag, part, ip in (("a", states[:half], 111), ("b", states[half:], 112)):
    cfg = dict(label=f"adm-{tag}", out=".playwright-cli/audit-v6/shots", ipBase=ip, langs=["vi", "en"], widths=[[1280, 800]], states=part)
    json.dump(cfg, open(f"data/cfg-adm-{tag}.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(tag, len(part), [s["name"] for s in part][:3])
