import type { Metadata } from "next";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { AddressesView, type BookEntry } from "@/components/feed/account/AddressesView";
import { OutCard } from "@/components/feed/account/OutCard";
import type { ProvinceName } from "@/components/feed/checkout/CheckoutView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { PROVINCES, feedAddressLine, findWard, wardLabel } from "@/data/regions";
import { listAddresses } from "@/lib/db/addresses";
import { loadMe } from "@/lib/db/profiles";
import { pathWithQuery } from "@/lib/feed-account";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Địa chỉ",
  // Somebody's home address. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

const MBAR: FeedMbarProps = { title: "Địa chỉ", back: "/account", watch: "[data-ui='feed'] [data-hero]" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * "Địa chỉ", round v4 "Feed" (slice 3a): the approved mock's
 * `prototype/explore/feed/addresses.html` (`AddressesView`), in the account
 * frame. Signed out, the page asks to sign in to keep addresses, in place.
 *
 * Read here, on the server: the account's book (Postgres, row level
 * security), each address's line and its commune's name — `data/regions.ts`
 * and its 3,321 communes stay here — and the 34 provinces in the official
 * order for the sheet's picker; the communes come from `/api/wards` one
 * province at a time. A new address starts with the account's name and phone.
 * `?add=1` opens the add sheet, `?edit=<id>` that address's.
 */
export default async function AddressesPage(props: PageProps<"/account/addresses">) {
  const [me, sp] = await Promise.all([loadMe(), props.searchParams]);

  if (!me) {
    return (
      <FeedFrame page="addresses" foot="lite" mainClass="acc-layout" mbar={MBAR}>
        <AccountNav on="addresses" signedIn={false} />
        <div className="acc-main">
          <h1 className="acc-h1 disp" data-hero>
            Địa chỉ
          </h1>
          <OutCard title="Đăng nhập để lưu địa chỉ" id="out-ad" here={pathWithQuery("/account/addresses", sp)} />
        </div>
      </FeedFrame>
    );
  }

  const addresses = await listAddresses();
  const book: BookEntry[] = addresses.map((a) => {
    const ward = findWard(a.provinceCode, a.wardCode);
    return {
      id: String(a.id),
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      provinceCode: a.provinceCode,
      wardCode: a.wardCode,
      wardLabel: ward ? wardLabel(ward) : "",
      street: a.line,
      line: feedAddressLine(a),
      isDefault: a.isDefault,
    };
  });
  const provinces: ProvinceName[] = PROVINCES.map((p) => ({ code: p.code, name: p.name }));
  const edit = one(sp.edit);
  const open = one(sp.add) === "1" ? ({ kind: "add" } as const) : edit ? ({ kind: "edit", id: edit } as const) : null;

  return (
    <FeedFrame page="addresses" foot="lite" mainClass="acc-layout" mbar={MBAR}>
      <AccountNav on="addresses" signedIn />
      <div className="acc-main">
        <AddressesView
          book={book}
          provinces={provinces}
          seed={{ recipient: me.name, phone: me.phone ? formatPhone(me.phone).replace(/ /g, " ") : "" }}
          open={open}
        />
      </div>
    </FeedFrame>
  );
}
