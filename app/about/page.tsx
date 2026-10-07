import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { aboutLead, fourRules, fourRulesScope } from "@/lib/lexicon";
import { getLocale } from "@/lib/locale";

/** The page's name: the glossary's "About" in English (round v6 slice E3b). */
const TITLE: Pair = { vi: "Giới thiệu", en: "About" };

/** "Giới thiệu" — the layout's template adds "· HIVE" — and the page's opening sentence, in the page's language. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: picker(locale)(TITLE), description: aboutLead(locale) };
}

/** The phone's bar: back to the home page; the title once the page's own has scrolled away. */
function mbarOf(locale: Locale): FeedMbarProps {
  return { title: picker(locale)(TITLE), back: "/", watch: "[data-ui='feed'] .b-title" };
}

/**
 * What this shop is, round v4 "Feed" (slice 4b). The mock has no such page:
 * the page keeps the words it had (QĐ-34) and wears the Feed frame — the top
 * bar, the phone's bar with the title, the light footer, the tab bar with
 * nothing lit — and Feed's type: the display title, the sentence at an
 * answer's measure, the four rules as Hỏi đáp's rows (`.b-read`, `.b-rules`).
 *
 * One sentence, and every part of it is a rule the build enforces — the
 * window, the single cut, the shelf running out; the four rules under it say
 * the same in four lines (`FOUR_RULES`). Everything a brand page usually
 * carries is MISSING ON PURPOSE: nobody has told this build who makes the
 * clothes, where, or why the shop exists, so the story is an empty slot
 * marked "Đang chuẩn bị" — the way the Feed says a thing is not there yet, as
 * on "Xoá tài khoản" (and on the Google button until slice B16 made it work) —
 * rather than something warm and untrue.
 *
 * In the page's language since round v6 slice E3b: the sentence and the rules
 * from `lib/lexicon.ts` (`aboutLead`, `fourRules`), the slot "Brand story" ·
 * "Coming soon", still empty.
 */
export default async function AboutPage() {
  const locale = await getLocale();
  const t = picker(locale);
  return (
    <FeedFrame page="about" foot="lite" mainClass="b-wrap b-page" mbar={mbarOf(locale)}>
      <div className="b-head">
        <h1 className="b-title disp">{t(TITLE)}</h1>
      </div>
      <div className="b-read">
        <p>{aboutLead(locale)}</p>
        <div className="b-slot" role="note">
          <b>{t({ vi: "Câu chuyện thương hiệu", en: "Brand story" })}</b>
          <span>{t({ vi: "Đang chuẩn bị", en: "Coming soon" })}</span>
        </div>
      </div>
      <section className="b-rules" aria-labelledby="h-rules">
        <h2 className="sect-title" id="h-rules">
          {t({ vi: "Bốn quy tắc", en: "Four rules" })}
        </h2>
        <p className="b-rules-sub">{fourRulesScope(locale)}</p>
        <dl>
          {/* Keyed by place: a rule's title changes with the language. */}
          {fourRules(locale).map((r, i) => (
            <div className="b-rule" key={i}>
              <dt>{r.title}</dt>
              <dd>{r.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </FeedFrame>
  );
}
