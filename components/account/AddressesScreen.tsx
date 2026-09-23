import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { Empty } from "@/components/shop/Empty";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import type { Address } from "@/data/types";
import { makeDefault, removeAddress } from "@/lib/actions/addresses";
import { formatPhone } from "@/lib/phone";

/** Smallest unit first, the way a courier reads it. */
function lineOf(a: Address): string {
  const p = findProvince(a.provinceCode);
  const w = findWard(a.provinceCode, a.wardCode);
  return [a.line, w && wardLabel(w), p && provinceLabel(p)].filter(Boolean).join(", ");
}

/**
 * The address book.
 *
 * ONE SOURCE since slice B1. Before it, half the entries came from the
 * fixture and half from `localStorage`, every row had to say which half it
 * was, and only the device's own could be deleted — a "Xoá" that does not
 * delete being worse than none. They are rows in Postgres now, behind row
 * level security, so every row can be edited, made default and removed, and
 * the sentence about what lives in this browser has gone with the browser
 * copy.
 *
 * No `"use client"`: three forms and two links need no state, the Server
 * Actions do the writing, and `data/regions.ts` — 218KB of communes, needed
 * here to turn two codes into a readable line — stays on the server where it
 * was always meant to be.
 */
export function AddressesScreen({ addresses }: { addresses: Address[] }) {
  return (
    <>
      <div className="pghead">
        <h1>Địa chỉ</h1>
        <span className="meta">
          {addresses.length === 0 ? "chưa có địa chỉ nào" : `${addresses.length} địa chỉ`}
        </span>
        <Link className="more" href="/account/addresses/new" style={{ marginLeft: "auto" }}>
          Thêm địa chỉ
        </Link>
      </div>

      {addresses.length === 0 ? (
        <Empty
          icon="pin"
          title="Chưa có địa chỉ nào"
          text="Lưu một địa chỉ để khỏi gõ lại ở bước thanh toán."
          action={
            <ButtonLink icon="plus" href="/account/addresses/new">
              Thêm địa chỉ
            </ButtonLink>
          }
        />
      ) : (
        <div className="rows3">
          {addresses.map((a) => (
            <div className="row" key={a.id}>
              <b>
                <span className="nm">{a.recipient}</span>
                <Badge tone="flat" dot={false}>
                  {a.label}
                </Badge>
                {a.isDefault && (
                  <Badge tone="flat" dot={false}>
                    Mặc định
                  </Badge>
                )}
              </b>
              <span className="sub">
                {lineOf(a)}
                <br />
                <span className="nw">{formatPhone(a.phone)}</span>
              </span>
              {/* Side by side, not stacked: two 44px targets need a
                  gap wider than 12px between them (DESIGN.md §5, trap
                  2) and the row is only 56px tall. */}
              <span className="right">
                <span className="acts">
                  <Link className="lnk" href={`/account/addresses/new?edit=${a.id}`}>
                    Sửa
                  </Link>
                  {/* The one already prefilling checkout has nothing to set. */}
                  {!a.isDefault && (
                    <form action={makeDefault}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="lnk">
                        Đặt mặc định
                      </button>
                    </form>
                  )}
                  <form action={removeAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="lnk">
                      Xoá
                    </button>
                  </form>
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="note3" style={{ marginTop: 16 }}>
        <Icon name="info" className="ic sm" />
        <span>
          Địa chỉ mặc định được điền sẵn ở bước thanh toán. Sổ này thuộc tài khoản, nên
          mở ở thiết bị nào cũng thấy.
        </span>
      </p>

      {addresses.length > 0 && (
        <p style={{ marginTop: 16 }}>
          <ButtonLink tone="ink" icon="plus" href="/account/addresses/new">
            Thêm địa chỉ
          </ButtonLink>
        </p>
      )}
    </>
  );
}

