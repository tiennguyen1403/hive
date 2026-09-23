import { Icon } from "@/components/icon/Icon";

/**
 * A slot whose copy nobody has written yet.
 *
 * It states what belongs here and leaves the space empty, instead of
 * filling it with plausible text. PRODUCT.md forbids inventing a brand
 * story, a workshop, partners or awards, and the decision recorded in
 * `tasks/plan.md` is explicit: where there is no truth yet, leave it blank
 * for the owner to write.
 *
 * Lorem ipsum, or a warm paragraph about craftsmanship nobody verified, is
 * the failure this component exists to prevent. It is visibly unfinished on
 * purpose — a dashed box reads as a gap, and a gap gets filled.
 */
export function NeedWrite({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="needwrite">
      <span className="lb">
        <Icon name="edit" />
        CHỜ NGƯỜI VIẾT
      </span>
      <p>
        <b>{title}</b> {children}
      </p>
    </div>
  );
}
