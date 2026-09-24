"use client";

import { useMemo } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/shop/Empty";
import { usePrefs } from "@/components/shop/prefs";
import { ProductCard } from "@/components/product/ProductCard";
import { LEX, issueNo } from "@/lib/lexicon";
import { useCatalog } from "@/components/shop/CatalogContext";
import { wayToShop } from "@/lib/drop";
import { resolveWishlist } from "@/lib/wishlist";
import { useWishlist } from "./WishlistContext";
import { demoNow } from "@/lib/clock";

/**
 * "Đã lưu" — the styles this browser is keeping an eye on.
 *
 * Not behind the account door. Saving something is not a reason to demand an
 * account, and the list lives in this browser either way (see
 * `WishlistContext`) — so signed in it wears the account frame, and signed
 * out it is the plain column it has always been.
 *
 * A style that has run out STAYS on the list: an issue's style stamped SOLD
 * OUT, a fixed one with every size struck until they are brought back (it is
 * "tạm hết", and wears no stamp — v3 slice 11). The note at the bottom says
 * that it stays, without claiming a stamp every card does not carry, and
 * says what the cart's "Giữ lại sau" is instead: a different list, with a
 * size on it, that goes back into the basket in one press.
 *
 * The card is the shop's own card — same photo, same contents line, same
 * button — with two things added here: when it was saved, and the remembered
 * size preselected in the sheet the button opens.
 */
export function WishlistScreen() {
  const catalog = useCatalog();
  const { list, ready, toggle } = useWishlist();
  const { prefs } = usePrefs();

  // One instant per change of the list, so every card is judged against the
  // same clock (whether its issue is still open decides the button).
  const now = useMemo(() => demoNow(), [list]);
  const saved = resolveWishlist(catalog, now, list);
  const way = wayToShop(catalog, now);

  if (!ready) {
    return (
      <div className="pghead">
        <h1>Đã lưu</h1>
        <span className="meta">đang mở danh sách…</span>
      </div>
    );
  }

  if (saved.items.length === 0) {
    return (
      <>
        <div className="pghead">
          <h1>Đã lưu</h1>
          <span className="meta">lưu trên thiết bị này</span>
        </div>
        <Empty
          icon="heart"
          title="Chưa lưu mẫu nào"
          text="Bấm “Lưu” ở trang sản phẩm. Danh sách nằm trong trình duyệt này, không cần tài khoản."
          action={
            // The issue selling now, on its own page; every style on sale
            // when none is (v3 slice 11).
            <ButtonLink icon="grid" href={way.href}>
              {way.issueNo !== null ? `Xem ${LEX.tl} ${issueNo(way.issueNo)}` : "Xem tất cả mẫu"}
            </ButtonLink>
          }
        />
      </>
    );
  }

  return (
    <>
      <div className="pghead">
        <h1>Đã lưu</h1>
        <span className="meta">
          {saved.items.length} mẫu · lưu trên thiết bị này
        </span>
      </div>

      <div className="grid3">
        {saved.items.map((item) => (
          /* The saved list mixes both kinds of style, so an issue's style
             wears its plate on the photo (v3 slice 11). */
          <ProductCard
            key={item.product.id}
            product={item.product}
            plate
            closed={!item.buyable && !item.soldOut}
            onUnsave={() => toggle(item.product.id)}
            {...(item.savedAt ? { savedAt: item.savedAt } : {})}
            {...(prefs.size ? { preselectSize: prefs.size } : {})}
          />
        ))}
      </div>

      <p className="fine3" style={{ marginTop: 20 }}>
        Mẫu đã hết vẫn nằm trong danh sách. Mẫu trong “Giữ lại sau” của giỏ là một
        danh sách khác: có size, đưa lại vào giỏ được ngay.
      </p>
    </>
  );
}
