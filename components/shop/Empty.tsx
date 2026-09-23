import { Icon, type IconName } from "@/components/icon/Icon";

interface EmptyProps {
  icon: IconName;
  title: string;
  text: string;
  /** The way out. An empty state without one is a dead end. */
  action?: React.ReactNode;
}

/**
 * Nothing here — and what to do about it.
 *
 * `.empty3` (`prototype/v3/v3-pages.css`): the icon at the empty-state size
 * of the scale, 28px, then the heading in the display face, then one line
 * saying why, then the way out. Set to the LEFT and capped at 44ch rather
 * than centred in a ring — an empty state is a sentence the page is saying,
 * and it reads on the same left edge as everything above it.
 *
 * The icon is decoration and stays hidden from assistive tech; the heading
 * already says what happened. Linear rather than Bulk here, which is what the
 * approved mock draws: at 28px the filled form reads as an illustration, and
 * this is a state, not a moment.
 */
export function Empty({ icon, title, text, action }: EmptyProps) {
  return (
    <div className="empty3">
      <Icon name={icon} />
      <h2>{title}</h2>
      <p>{text}</p>
      {/* A <p> and not a <div>: `interaction.css` stretches a lone
          `div > button.btn` to its container's width, which here is the
          44ch measure of the paragraph above it. */}
      {action && <p className="act3">{action}</p>}
    </div>
  );
}
