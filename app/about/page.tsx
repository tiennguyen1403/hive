import type { Metadata } from "next";
import { FeedFrame } from "@/components/feed/FeedFrame";
import type { FeedMbarProps } from "@/components/feed/FeedMbar";
import { ABOUT_LEAD, FOUR_RULES, FOUR_RULES_SCOPE } from "@/lib/lexicon";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: ABOUT_LEAD,
};

/** The phone's bar: back to the home page; the title once the page's own has scrolled away. */
const MBAR: FeedMbarProps = { title: "Giới thiệu", back: "/", watch: "[data-ui='feed'] .b-title" };

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
 * on its Google button and on "Xoá tài khoản" — rather than something warm
 * and untrue.
 */
export default function AboutPage() {
  return (
    <FeedFrame page="about" foot="lite" mainClass="b-wrap b-page" mbar={MBAR}>
      <div className="b-head">
        <h1 className="b-title disp">Giới thiệu</h1>
      </div>
      <div className="b-read">
        <p>{ABOUT_LEAD}</p>
        <div className="b-slot" role="note">
          <b>Câu chuyện thương hiệu</b>
          <span>Đang chuẩn bị</span>
        </div>
      </div>
      <section className="b-rules" aria-labelledby="h-rules">
        <h2 className="sect-title" id="h-rules">
          Bốn quy tắc
        </h2>
        <p className="b-rules-sub">{FOUR_RULES_SCOPE}</p>
        <dl>
          {FOUR_RULES.map((r) => (
            <div className="b-rule" key={r.title}>
              <dt>{r.title}</dt>
              <dd>{r.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </FeedFrame>
  );
}
