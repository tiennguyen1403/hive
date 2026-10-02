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
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatPhone } from "@/lib/phone";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

/** The page's name: "Addresses" in English (round v6 slice E3a). */
const TITLE: Pair = { vi: "Địa chỉ", en: "Addresses" };

/**
 * "Địa chỉ" — the layout's template adds "· HIVE" — in the page's language,
 * with the site's description in it; the link card keeps the layout's
 * Vietnamese one (QĐ-40).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return {
    title: t(TITLE),
    description: t(SITE_DESCRIPTION_TEXT),
    // Somebody's home address. Nothing here belongs in a search index.
    robots: { index: false, follow: false },
  };
}

/** The phone's bar: back to Tôi, the title once the page's own has scrolled away. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/account", watch: "[data-ui='feed'] [data-hero]" };
}

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
  const [me, sp, locale] = await Promise.all([loadMe(), props.searchParams, getLocale()]);
  const t = picker(locale);
  const mbar = mbarOf(locale);

  if (!me) {
    return (
      <FeedFrame page="addresses" foot="lite" mainClass="acc-layout" mbar={mbar}>
        <AccountNav on="addresses" signedIn={false} locale={locale} />
        <div className="acc-main">
          <h1 className="acc-h1 disp" data-hero>
            {t(TITLE)}
          </h1>
          <OutCard
            title={t({ vi: "Đăng nhập để lưu địa chỉ", en: "Sign in to save addresses" })}
            id="out-ad"
            here={pathWithQuery("/account/addresses", sp)}
            locale={locale}
          />
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
    <FeedFrame page="addresses" foot="lite" mainClass="acc-layout" mbar={mbar}>
      <AccountNav on="addresses" signedIn locale={locale} />
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
