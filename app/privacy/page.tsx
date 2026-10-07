import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { dailyResetWindow } from "@/lib/daily-reset";
import { feedTight } from "@/lib/feed-range";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PRIVACY_UPDATED_DAY, privacyUpdated } from "@/lib/privacy";

/** The page's name, and the footer link's (`FOOT_HELP_TEXT`, `lib/feed-home.ts`). */
const TITLE: Pair = { vi: "Quyền riêng tư", en: "Privacy" };

/** The sentence the page opens with, which is also its description. */
const LEAD: Pair = {
  vi: "HIVE là cửa hàng demo. Đây là những gì demo lưu về bạn, ai xem được, và khi nào bị xoá.",
  en: "HIVE is a demo shop. This is what the demo keeps about you, who can see it, and when it is deleted.",
};

/** One line of a part: its bold opening ("Tài khoản:"), when it has one, then the rest. */
interface Line {
  lead?: Pair;
  text: Pair;
}

/** The hour the daily reset deletes in, on the Vietnamese clock: "19:00" to "20:00" (`lib/daily-reset.ts`). */
const RESET = dailyResetWindow();

/**
 * The page's four parts, each a title and its lines, word for word as the user
 * approved them on 06/10/2026 (`tasks/briefs/v6-privacy-copy.md`, with the
 * main session's change of one dash on 07/10), in both languages. Every
 * sentence has to stay true on the demo: after slice B16
 * (Google) and B17 (the back office masks real people, real accounts go every
 * day); the page changes when Stripe comes, and `PRIVACY_UPDATED_AT` with it.
 *
 * The deletion window is the daily reset's hour, read from `lib/` like every
 * figure on a screen (DESIGN.md §9, rule 2): the Vietnamese sentence sets it
 * as the Feed sets a range between two numbers, "19:00-20:00", the hyphen held
 * to both sides by word joiners so the line never breaks inside it
 * (`feedTight`; no en dash, the user's rule); the English one says "between
 * 19:00 and 20:00".
 */
const PARTS: readonly { id: string; title: Pair; lines: readonly Line[] }[] = [
  {
    id: "h-keeps",
    title: { vi: "Demo lưu gì", en: "What the demo keeps" },
    lines: [
      {
        lead: { vi: "Tài khoản:", en: "Account:" },
        text: {
          vi: "tên, email, mật khẩu (chỉ lưu dạng băm) và số điện thoại nếu bạn nhập. Đăng nhập bằng Google thì Google gửi tên, email và ảnh đại diện; demo chỉ dùng tên và email.",
          en: "name, email, password (stored only as a hash) and your phone number if you add one. If you sign in with Google, Google sends your name, email and profile picture; the demo uses only the name and email.",
        },
      },
      {
        lead: { vi: "Khi bạn dùng tài khoản:", en: "While you use your account:" },
        text: {
          vi: "địa chỉ, size, cài đặt thông báo, mẫu đã lưu và lời nhắc drop.",
          en: "addresses, sizes, notification settings, saved styles and drop reminders.",
        },
      },
      {
        lead: { vi: "Đơn hàng:", en: "Orders:" },
        text: {
          vi: "người nhận, số điện thoại, địa chỉ, cùng email và ghi chú nếu bạn nhập.",
          en: "recipient, phone number, address, and the email and note if you add them.",
        },
      },
      {
        lead: { vi: "Chống lạm dụng:", en: "Abuse protection:" },
        text: {
          vi: "một mã băm từ địa chỉ IP, giữ vài ngày.",
          en: "a hash of your IP address, kept for a few days.",
        },
      },
    ],
  },
  {
    id: "h-browser",
    title: { vi: "Trên trình duyệt của bạn", en: "In your browser" },
    lines: [
      {
        lead: { vi: "Cookie:", en: "Cookies:" },
        text: {
          vi: "ngôn ngữ, phiên đăng nhập, thông báo đã đọc, và các đơn bạn đặt khi chưa đăng nhập.",
          en: "language, sign-in session, notifications you have read, and orders placed without an account.",
        },
      },
      {
        lead: { vi: "Bộ nhớ trình duyệt:", en: "Browser storage:" },
        text: {
          vi: "giỏ, mã giảm giá, tìm kiếm gần đây và chiều cao bạn nhập ở Bảng size.",
          en: "your bag, discount code, recent searches and the height you enter in the size guide.",
        },
      },
      {
        text: {
          vi: "Không quảng cáo, không công cụ đo lường. Trang không tải gì từ bên thứ ba; chỉ khi đăng nhập bằng Google, trình duyệt mới chuyển qua Google.",
          en: "No ads and no analytics. Pages load nothing from third parties; only signing in with Google takes your browser to Google.",
        },
      },
    ],
  },
  {
    id: "h-who",
    title: { vi: "Ai xem được", en: "Who can see it" },
    lines: [
      {
        text: {
          vi: "Trang quản trị của demo mở cho mọi người xem thử. Ở đó tên bạn được rút gọn; email, số điện thoại và số nhà bị che.",
          en: "The demo's back office is open for anyone to try. There, your name is shortened and your email, phone number and street address are hidden.",
        },
      },
      {
        text: {
          vi: "Tài khoản thử là tài khoản dùng chung: những gì bạn nhập vào đó, người xem sau cũng thấy.",
          en: "The demo accounts are shared: whatever you enter in them, the next visitor sees too.",
        },
      },
      {
        text: {
          vi: "Dữ liệu nằm ở Supabase và Vercel, máy chủ tại Singapore. Demo không gửi email, không bán và không chia sẻ dữ liệu.",
          en: "Data is stored with Supabase and Vercel, on servers in Singapore. The demo sends no email and does not sell or share data.",
        },
      },
    ],
  },
  {
    id: "h-deleted",
    title: { vi: "Khi nào bị xoá", en: "When it is deleted" },
    lines: [
      {
        text: {
          vi: `Mỗi ngày trong khoảng ${feedTight(`${RESET.from}-${RESET.to}`)} giờ Việt Nam, demo xoá mọi tài khoản, đơn và dữ liệu bạn đã tạo.`,
          en: `Every day between ${RESET.from} and ${RESET.to} Vietnam time, the demo deletes every account, order and piece of data you created.`,
        },
      },
      {
        text: {
          vi: "Dữ liệu trên trình duyệt: xoá trong cài đặt của trình duyệt.",
          en: "To clear what is in your browser, use your browser's settings.",
        },
      },
    ],
  },
];

/** "Quyền riêng tư" — the layout's template adds "· HIVE" — and the page's opening sentence, in the page's language. */
export async function generateMetadata(): Promise<Metadata> {
  const t = picker(await getLocale());
  return { title: t(TITLE), description: t(LEAD) };
}

/** The phone's bar: back to the home page; the title once the page's own has scrolled away (as Giới thiệu's). */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/", watch: "[data-ui='feed'] .b-title" };
}

/**
 * What the demo keeps about a visitor, who can see it, and when it goes
 * (round v6 slice P, QĐ-41, QĐ-44, QĐ-45). Google's consent screen links here,
 * so the page is public: no sign-in, in both languages.
 *
 * The mock has no such page. It wears Giới thiệu's frame (`app/about/page.tsx`):
 * the top bar, the phone's bar with the title, the light footer, the tab bar
 * with nothing lit, the display title, the opening sentence at an answer's
 * measure (`.b-read`). Each part is a block spaced as Giới thiệu's four rules
 * (`.b-qgroup`, Hỏi đáp's group, with the same padding and measure as
 * `.b-rules`), its title a `.sect-title`, its lines the product page's list
 * (`.details`), the one bulleted list the Feed has, at Giới thiệu's reading
 * measure and size (`more.css`). The light footer leaves out the link to this
 * page, as every help page leaves out its own (the mock's `data-foot-skip`;
 * the main session, 07/10/2026). The day the words last changed closes the
 * page in Giới thiệu's small grey line (`.b-rules-sub`), from `lib/privacy.ts`.
 */
export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = picker(locale);
  return (
    <FeedFrame page="privacy" foot="lite" footSkip={["/privacy"]} mainClass="b-wrap b-page" mbar={mbarOf(locale)}>
      <div className="b-head">
        <h1 className="b-title disp">{t(TITLE)}</h1>
      </div>
      <div className="b-read">
        <p>{t(LEAD)}</p>
      </div>
      {PARTS.map((part) => (
        <section className="b-qgroup" aria-labelledby={part.id} key={part.id}>
          <h2 className="sect-title" id={part.id}>
            {t(part.title)}
          </h2>
          <ul className="details">
            {/* Keyed by place: a line's words change with the language. */}
            {part.lines.map((line, i) => (
              <li key={i}>
                {line.lead && (
                  <>
                    <b>{t(line.lead)}</b>{" "}
                  </>
                )}
                {t(line.text)}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="b-qgroup b-rules-sub">
        {t({ vi: "Cập nhật", en: "Updated" })} <time dateTime={PRIVACY_UPDATED_DAY}>{privacyUpdated(locale)}</time>.
      </p>
    </FeedFrame>
  );
}
