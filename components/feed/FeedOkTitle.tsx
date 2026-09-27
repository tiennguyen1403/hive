import { FeedIcon } from "./icon/FeedIcon";

/**
 * A success header's words with the check on their first line (`feed.js`:
 * `okTitle`; `feed.css` `.ok-lead`, `.ok-mark`): the check and the first
 * word never part, so a title that wraps keeps its check, and its later lines
 * hang under the words. Goes inside the heading: `<h1 className="ok-title
 * disp"><FeedOkTitle text="Đã đặt hàng" /></h1>`.
 */
export function FeedOkTitle({ text }: { text: string }) {
  const cut = text.indexOf(" ");
  const first = cut < 0 ? text : text.slice(0, cut);
  return (
    <>
      <span className="ok-lead">
        <FeedIcon name="check-circle-fill" className="ok-mark" />
        {first}
      </span>
      {cut < 0 ? null : text.slice(cut)}
    </>
  );
}
