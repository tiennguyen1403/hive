import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { IssueRecap } from "@/components/feed/issue/IssueRecap";
import type { Drop } from "@/data/types";
import type { Catalog } from "@/lib/catalog";
import { demoNowMs } from "@/lib/clock";
import { loadCatalog } from "@/lib/db/catalog";
import { dropState } from "@/lib/drop";
import { issueLabel } from "@/lib/lexicon";

/** The issue the address names — `/so/5` — or nothing for a number no issue has. */
async function askedDrop(catalog: Catalog, props: PageProps<"/so/[no]">): Promise<Drop | undefined> {
  const { no } = await props.params;
  const asked = Number(no);
  return Number.isInteger(asked) ? catalog.dropByNo.get(asked) : undefined;
}

/** "Số 04" — the layout adds "· HIVE". */
export async function generateMetadata(props: PageProps<"/so/[no]">): Promise<Metadata> {
  const drop = await askedDrop(await loadCatalog(), props);
  return { title: drop ? issueLabel(drop.no) : "Không tìm thấy" };
}

/**
 * One issue, round v4 "Feed" (slice 1b): the approved mock's
 * `prototype/explore/feed/issue.html` — a closed issue as a record
 * (`IssueRecap`).
 *
 * The state is read off the clock, never off the address, as everywhere. An
 * issue that is still selling has no record yet: the address leads to the
 * shop's grid on it, the home page's Cửa hàng tab (`/?line=N#cua-hang`); one
 * only announced leads to the home page's Sắp mở (`/#sap-mo`), where it comes
 * first. A number no issue has is a 404 (the brief; the mock draws an empty
 * state instead). `params` is a promise in Next 16; `redirect` and
 * `notFound` throw, so nothing after them runs.
 */
export default async function IssuePage(props: PageProps<"/so/[no]">) {
  const catalog = await loadCatalog();
  const drop = await askedDrop(catalog, props);
  if (!drop) notFound();

  const nowMs = demoNowMs();
  const state = dropState(drop, new Date(nowMs));
  if (state === "OPEN") redirect(`/?line=${drop.no}#cua-hang`);
  if (state === "UPCOMING") redirect("/#sap-mo");

  return (
    <FeedFrame
      page="issue"
      now={nowMs}
      mbar={{ title: issueLabel(drop.no), back: "/so", watch: "[data-ui='feed'] .b-hero-no" }}
    >
      <div className="b-wrap b-page">
        <IssueRecap no={drop.no} />
      </div>
    </FeedFrame>
  );
}
