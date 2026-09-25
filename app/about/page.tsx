import type { Metadata } from "next";
import { FourRules } from "@/components/shop/ClosedIssue";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { ABOUT_LEAD } from "@/lib/lexicon";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: ABOUT_LEAD,
};

/**
 * What this shop is.
 *
 * One sentence, and it is the only one: everything in it is a rule this
 * build really enforces — the window, the single cut, the shelf running out
 * — and the four rules under it are the same four the home page prints, from
 * the same component.
 *
 * Everything a brand page usually carries is MISSING ON PURPOSE. Nobody has
 * told this build who makes the clothes, where, or why the shop exists, and
 * `tasks/plan.md` records the decision to leave that blank rather than write
 * something warm and untrue. The dashed block says what belongs there, which
 * is more use to whoever writes it than a blank space would be.
 */
export default function AboutPage() {
  return (
    <ShopFrame>
      <div className="wrap3 readpage">
        <div className="pghead">
          <h1>Giới thiệu</h1>
        </div>

        <div className="prose">
          <p>{ABOUT_LEAD}</p>

          <div className="prep">
            <b>Câu chuyện thương hiệu đang chuẩn bị.</b>
            Ai làm, làm ở đâu, vì sao bắt đầu.
          </div>
        </div>

        <FourRules />
      </div>
    </ShopFrame>
  );
}
