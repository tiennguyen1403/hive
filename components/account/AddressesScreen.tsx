"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { Empty } from "@/components/shop/Empty";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { addressBookFor, type SavedAddress } from "@/lib/address-book";
import { formatPhone } from "@/lib/phone";
import { AccountGuard } from "./AccountGuard";
import { useAddressBook } from "./AddressBookContext";

/** Smallest unit first, the way a courier reads it. */
function lineOf(a: SavedAddress): string {
  const p = findProvince(a.provinceCode);
  const w = findWard(a.provinceCode, a.wardCode);
  return [a.line, w && wardLabel(w), p && provinceLabel(p)].filter(Boolean).join(", ");
}

/**
 * The address book, in the v3 frame.
 *
 * Same contents and same rules as v2 — an address saved here really is used,
 * because the default one prefills checkout, and the screen labels which
 * entries came with the account and which live on this device, since those
 * two disappear under different circumstances.
 *
 * Only what this device saved can be removed. A seeded address belongs to
 * the fixture and would come back on the next load; a "Xoá" that does not
 * delete is worse than none (DESIGN.md §9 rule 3).
 */
export function AddressesScreen() {
  const { device, ready, remove } = useAddressBook();

  return (
    <AccountGuard title="Địa chỉ" active="addresses">
      {(me) => {
        const book = addressBookFor(me, device);

        return (
          <>
            <div className="pghead">
              <h1>Địa chỉ</h1>
              <span className="meta">
                {ready ? `${book.length} địa chỉ` : "đang mở sổ địa chỉ…"}
              </span>
              <Link className="more" href="/account/addresses/new" style={{ marginLeft: "auto" }}>
                Thêm địa chỉ
              </Link>
            </div>

            {ready && book.length === 0 ? (
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
                {book.map((a) => (
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
                      <span className="nw">{formatPhone(a.phone)}</span> ·{" "}
                      {a.source === "account" ? "từ tài khoản mẫu" : "lưu trên thiết bị này"}
                    </span>
                    {/* Side by side, not stacked: two 44px targets need a
                        gap wider than 12px between them (DESIGN.md §5, trap
                        2) and the row is only 56px tall. */}
                    <span className="right">
                      <span className="acts">
                        <Link className="lnk" href={`/account/addresses/new?edit=${a.id}`}>
                          Sửa
                        </Link>
                        {a.source === "device" && (
                          <button type="button" className="lnk" onClick={() => remove(a.id)}>
                            Xoá
                          </button>
                        )}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="note3" style={{ marginTop: 16 }}>
              <Icon name="info" className="ic sm" />
              <span>
                Địa chỉ mặc định được điền sẵn ở bước thanh toán. Địa chỉ lưu ở đây nằm
                trong trình duyệt này, chưa đồng bộ giữa các thiết bị.
              </span>
            </p>

            {ready && book.length > 0 && (
              <p style={{ marginTop: 16 }}>
                <ButtonLink tone="ink" icon="plus" href="/account/addresses/new">
                  Thêm địa chỉ
                </ButtonLink>
              </p>
            )}
          </>
        );
      }}
    </AccountGuard>
  );
}
