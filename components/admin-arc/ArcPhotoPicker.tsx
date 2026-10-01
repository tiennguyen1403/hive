"use client";

import Image from "next/image";
import { useId, useRef, type KeyboardEvent } from "react";
import { photoUrl } from "@/lib/photos";
import styles from "./ArcPhotoPicker.module.css";

/**
 * Choose one photo from a set, in the Arc back office (round v5 slice 4): v3's
 * `.photopick` of "Thêm mẫu hé lộ" (`components/admin/TeaserFormSheet.tsx`),
 * each photo 44×55 as there, drawn with Arc's tokens. Slice 5 reuses it for
 * the style form, so it knows nothing about teasers.
 *
 * A WAI-ARIA radio group (APG, "Radio Group"), where v3 made each photo a Tab
 * stop of its own: the group is one stop, named by its visible label; Tab
 * lands on the chosen photo, or on the first while none is; the arrow keys
 * move to the next or previous photo and choose it, wrapping at either end;
 * Space and a click choose the photo under them. The keyboard ring
 * (`--focus-ring`, QĐ-39) sits on the photo focus is on, and the chosen one
 * wears a 2px `--foreground` edge, so the two never read as one.
 *
 * Arc has no photo picker, and its `radio-group` is a list of text rows, so
 * this is built here on Arc's tokens. Each photo is named by `nameOf`, v3's
 * "Ảnh reu" by default; the image itself is decoration (`alt=""`).
 *
 * The style form (slice 5b) opens it under a colour row, "Mượn tạm": there
 * the row already says what the grid is for, so its label is for assistive
 * tech only (`hideLabel`, as Arc's `SearchField` hides one in a toolbar), and
 * a click, Enter or Space on a photo also commits it (`onCommit`), which
 * closes the grid as v3's did, while the arrow keys keep choosing in place.
 */
export function ArcPhotoPicker({
  label,
  keys,
  value,
  onValueChange,
  onCommit,
  hideLabel = false,
  nameOf = (key) => `Ảnh ${key}`,
}: {
  /** The visible label, and the group's accessible name. */
  label: string;
  /** The photos on offer, as `photoUrl` keys, in the order they are shown. */
  keys: readonly string[];
  /** The chosen key, or null while none is. */
  value: string | null;
  onValueChange: (key: string) => void;
  /** A press on a photo (pointer, Enter or Space), after `onValueChange`; the arrow keys do not commit. */
  onCommit?: (key: string) => void;
  /** Keep the label for assistive tech only, where the context already names the group. */
  hideLabel?: boolean;
  /** The name each photo is read by. */
  nameOf?: (key: string) => string;
}) {
  const labelId = useId();
  const photos = useRef<Array<HTMLButtonElement | null>>([]);
  const chosen = value === null ? -1 : keys.indexOf(value);
  // The group's one Tab stop: the chosen photo, else the first.
  const stop = chosen >= 0 ? chosen : 0;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0 || keys.length === 0) return;
    event.preventDefault();
    const at = photos.current.findIndex((photo) => photo === event.target);
    const next = ((at >= 0 ? at : stop) + step + keys.length) % keys.length;
    onValueChange(keys[next]!);
    photos.current[next]?.focus();
  }

  return (
    <div className={styles.field}>
      <span id={labelId} className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className={styles.photos} onKeyDown={onKeyDown}>
        {keys.map((key, i) => (
          <button
            key={key}
            ref={(el) => {
              photos.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={i === chosen}
            aria-label={nameOf(key)}
            tabIndex={i === stop ? 0 : -1}
            className={styles.photo}
            onClick={() => {
              onValueChange(key);
              onCommit?.(key);
            }}
          >
            <Image src={photoUrl(key, 120)} alt="" width={44} height={55} />
          </button>
        ))}
      </div>
    </div>
  );
}
