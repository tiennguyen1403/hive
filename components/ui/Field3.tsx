"use client";

// `useId` is a client hook, and every form that renders this is controlled.
import { useId } from "react";
import { Icon } from "@/components/icon/Icon";

interface Field3Props {
  /** Usually a string; a node so a label can carry "· không bắt buộc". */
  label: React.ReactNode;
  /** The control. Gets `id` and `aria-describedby` wired to it by the caller. */
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
  /** Shown under the field, in the error tone, with an icon beside it. */
  error?: string;
  /** Quiet help text. Replaced by `error` when there is one. */
  help?: string;
  className?: string;
}

/**
 * A form row in the v3 grammar — `.field3` in `app/styles/checkout.css`.
 *
 * Its own component and not `<Field>`: that one owns `.field`, whose
 * 13px/18px padding is the v2 page gutter. Inside `.wrap3`, which already
 * carries the gutter, every row would be indented twice. Same contract
 * otherwise, and the two rules that matter are the same:
 *
 * · the label is BOUND to the control, because a label that only looks like
 *   one is a label that only sighted mouse users get;
 * · the error carries an icon and is announced, never colour alone
 *   (PRODUCT.md's accessibility floor).
 *
 * `children` is a function so the control receives the generated `id` and
 * `aria-describedby`.
 */
export function Field3({ label, children, error, help, className = "" }: Field3Props) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? help;

  return (
    <div className={`field3 ${className}`.trim()}>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy: note ? noteId : undefined })}
      {error ? (
        <p className="err" id={noteId} role="alert">
          <Icon name="danger" className="ic sm" />
          {error}
        </p>
      ) : (
        help && (
          <p className="help" id={noteId}>
            {help}
          </p>
        )
      )}
    </div>
  );
}
