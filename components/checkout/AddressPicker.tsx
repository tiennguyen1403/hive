"use client";

import type { SavedAddress } from "@/lib/address-book";
import { formatPhone } from "@/lib/phone";

interface AddressPickerProps {
  book: SavedAddress[];
  /** The one currently shipping to. `null` while a new address is typed. */
  pickedId: string | null;
  onPick: (address: SavedAddress) => void;
  /** Builds the one-line address; the ward name arrives asynchronously. */
  lineOf: (a: SavedAddress) => string;
  /** The row that opens the blank form, and whether it is the chosen one. */
  adding: boolean;
  onAddNew: () => void;
}

/**
 * "Giao tới" — the addresses this device already has, as radios, with the
 * blank form behind the last row.
 *
 * One tap instead of a form. Everything here was typed by the person reading
 * it, on this device (`lib/address-book.ts`), which is why checkout is
 * allowed to prefill at all and why the panel's own heading says where the
 * entries live.
 *
 * The whole row is the control rather than a dot with a label beside it: a
 * 20px circle is not a target, and the address is what is being chosen.
 * `role="radio"` with `aria-checked` on the button keeps that honest for
 * anyone not using a pointer.
 */
export function AddressPicker({
  book,
  pickedId,
  onPick,
  lineOf,
  adding,
  onAddNew,
}: AddressPickerProps) {
  return (
    <div className="picks3" role="radiogroup" aria-label="Địa chỉ giao">
      {book.map((a) => (
        <button
          key={a.id}
          type="button"
          className="pick"
          role="radio"
          aria-checked={a.id === pickedId}
          onClick={() => onPick(a)}
        >
          <span className="radio" />
          <span className="t">
            <b>
              {a.label} · {a.recipient} · {formatPhone(a.phone)}
            </b>
            <span>{lineOf(a)}</span>
          </span>
        </button>
      ))}

      <button
        type="button"
        className="pick"
        role="radio"
        aria-checked={adding}
        onClick={onAddNew}
      >
        <span className="radio" />
        <span className="t">
          <b>Giao tới địa chỉ khác</b>
          <span>Nhập địa chỉ mới, lưu vào sổ nếu muốn</span>
        </span>
      </button>
    </div>
  );
}
