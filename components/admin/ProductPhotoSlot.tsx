"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { COLORS } from "@/data/colors";
import type { ColorKey } from "@/data/types";
import { styleInList } from "@/lib/lexicon";
import { dims, outputSize, previewBox, type Crop } from "@/lib/photo-crop";
import { photoUrl } from "@/lib/photos";
import { PICK_TYPES, fileSizeLabel, type LoanPhoto } from "@/lib/product-form";

/**
 * What one colour row holds for its photo (`PhotoKind` in `lib/product-form`
 * names the four). A picked `file` keeps the File itself — it is encoded and
 * uploaded only when the form is saved — the object URL the thumbnail and the
 * crop sheet draw it from, its natural size, the region chosen, and, once it
 * has been uploaded, the key the server gave it: a second try after a refused
 * save sends that key again instead of the file.
 */
export type SlotPhoto =
  | { kind: "none" }
  | { kind: "loan"; key: string }
  | { kind: "saved"; key: string }
  | FilePhoto;

export interface FilePhoto {
  kind: "file";
  file: File;
  name: string;
  bytes: number;
  src: string;
  nw: number;
  nh: number;
  crop: Crop;
  key?: string;
}

/** The thumbnail is the product page's 4:5, 96 × 120. */
const SHOT_HEIGHT = 120;

const ACCEPT = PICK_TYPES.join(",");

/**
 * One row of "Màu và ảnh" (v3 slice 7, `prototype/v3/admin-product-new.html`):
 * the colour's photo at 4:5, its name with the band-order arrows, a line
 * saying what the photo is, and the moves that change it.
 *
 * The photo is one of four things, and the row says which — a picked FILE
 * (name, size, the region and the size it will be saved at), a BORROWED
 * stand-in (always labelled "mượn tạm", naming the style it belongs to —
 * PRODUCT.md: a stand-in is never shown as the real thing), a photo already
 * UPLOADED for this style, or NOTHING yet (a dashed box). Every one of them
 * also takes a file dropped on it. There is no "Bỏ ảnh": the mock took it out.
 *
 * The file pickers are `<label>`s wrapping a visually hidden `<input
 * type=file>`, so the button and the link ARE the input for a click, a tap,
 * Enter and Space alike; the ring for a keyboard user is drawn on the label
 * (`:focus-within`, admin.css).
 */
export function ProductPhotoSlot({
  color,
  index,
  count,
  mode,
  photo,
  loans,
  picking,
  progress,
  onMove,
  onUnpick,
  onFile,
  onCrop,
  onTogglePick,
  onPickLoan,
}: {
  color: ColorKey;
  /** Place in the band; the first colour is the style's cover photo. */
  index: number;
  count: number;
  mode: "new" | "edit";
  photo: SlotPhoto;
  loans: readonly LoanPhoto[];
  /** The borrowed-photo grid is open under this row. */
  picking: boolean;
  /** This colour's upload: running, finished, or not part of a save in flight. */
  progress: "run" | "done" | null;
  onMove: (dir: -1 | 1) => void;
  onUnpick: () => void;
  onFile: (file: File | undefined) => void;
  onCrop: () => void;
  onTogglePick: () => void;
  onPickLoan: (key: string) => void;
}) {
  const [over, setOver] = useState(false);
  const label = COLORS[color].label;

  const filePicker = (text: string, tone: "btn" | "lnk") => (
    <label className={tone === "btn" ? "btn ink sm" : "lnk"}>
      {tone === "btn" && <Icon name="gallery" className="ic sm" />}
      {text}
      <input
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label={`${text} cho ${label}`}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          // Picking the same file again must still arrive as a change.
          e.target.value = "";
        }}
      />
    </label>
  );

  const loanToggle = (text: string) => (
    <button type="button" className="lnk" aria-expanded={picking} onClick={onTogglePick}>
      {text}
    </button>
  );

  // The box: a picked file is drawn as a background so only the chosen
  // region shows (the mock's `cropStyle`); a stored photo is an image; an
  // empty box is dashed and carries the gallery icon.
  let shotStyle: React.CSSProperties | undefined;
  let shotBody: React.ReactNode = null;
  let caption: React.ReactNode;
  let actions: React.ReactNode;
  if (photo.kind === "file") {
    const box = previewBox(photo.crop, photo.nw, SHOT_HEIGHT);
    const out = outputSize(photo.crop);
    shotStyle = {
      backgroundImage: `url("${photo.src}")`,
      backgroundSize: `${box.size.toFixed(1)}px auto`,
      backgroundPosition: `${box.x.toFixed(1)}px ${box.y.toFixed(1)}px`,
    };
    caption = (
      <>
        <b>{photo.name}</b> · {fileSizeLabel(photo.bytes)} · vùng cắt{" "}
        {dims(photo.crop.w, photo.crop.h)} · lưu {dims(out.w, out.h)}
      </>
    );
    // No glyph on "Khung cắt": the one place on this form where the system's
    // "every button names its action with a glyph" gives way to the mock, as
    // on the cart's "Đưa vào giỏ" (LaterList). Measured at 1280, the scissors
    // took the button to 110px and pushed "Mượn tạm" onto a line of its own;
    // the mock keeps the three moves on one line, and the label names the move.
    actions = (
      <>
        <Button tone="ink sm" data-crop={color} onClick={onCrop}>
          Khung cắt
        </Button>
        {filePicker("Đổi ảnh", "lnk")}
        {loanToggle("Mượn tạm")}
      </>
    );
  } else if (photo.kind === "loan" || photo.kind === "saved") {
    const owner = photo.kind === "loan" ? loans.find((l) => l.key === photo.key)?.name : undefined;
    shotBody = <Image src={photoUrl(photo.key, 240)} alt="" width={96} height={SHOT_HEIGHT} />;
    caption =
      photo.kind === "loan" ? (
        <>
          <Badge tone="shut">mượn tạm</Badge>
          {/* The name held whole: "S04 –" over "RÊU" at 1280 (v3 slice 13). */}
          {owner ? ` ảnh của mẫu ${styleInList(owner)}` : ""}
        </>
      ) : (
        "Ảnh đã tải lên"
      );
    actions =
      photo.kind === "loan" ? (
        <>
          {filePicker("Tải ảnh thật", "btn")}
          {loanToggle("Đổi ảnh mượn")}
        </>
      ) : (
        <>
          {filePicker("Đổi ảnh", "btn")}
          {loanToggle("Mượn tạm")}
        </>
      );
  } else {
    shotBody = <Icon name="gallery" />;
    caption = "Chưa có ảnh · JPG, PNG hoặc WebP, tối đa 10 MB · kéo thả vào ô hoặc chọn tệp";
    actions = (
      <>
        {filePicker("Chọn tệp", "btn")}
        {loanToggle("Mượn tạm")}
      </>
    );
  }

  const shotClass = ["shot", photo.kind === "none" && "blank", over && "over"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cslot">
      <span
        className={shotClass}
        style={shotStyle}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFile(e.dataTransfer.files[0]);
        }}
      >
        {shotBody}
        {progress && (
          <span className="prog" data-state={progress}>
            <i />
          </span>
        )}
      </span>
      <div>
        <div className="hd">
          <i className="swatch" style={{ background: COLORS[color].hex }} aria-hidden="true" />
          <b>{label}</b>
          <span className="ord">
            <button
              type="button"
              data-move={color}
              data-dir="-1"
              aria-label={`Đưa ${label} lên trước`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <Icon name="down" className="ic sm flip" />
            </button>
            <button
              type="button"
              data-move={color}
              data-dir="1"
              aria-label={`Đưa ${label} xuống sau`}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              <Icon name="down" className="ic sm" />
            </button>
            {mode === "new" && (
              <button type="button" aria-label={`Bỏ màu ${label}`} onClick={onUnpick}>
                <Icon name="x" className="ic sm" />
              </button>
            )}
          </span>
        </div>
        <div className="file">
          {index === 0 && "Ảnh đại diện · "}
          {caption}
        </div>
        <div className="acts">{actions}</div>
        {picking && (
          <div className="photopick" role="radiogroup" aria-label={`Ảnh mượn tạm cho ${label}`}>
            {loans.map((l) => {
              const on = photo.kind === "loan" && photo.key === l.key;
              return (
                <button
                  key={l.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Ảnh của ${l.name}`}
                  className={on ? "on" : undefined}
                  onClick={() => onPickLoan(l.key)}
                >
                  <Image src={photoUrl(l.key, 120)} alt="" width={44} height={55} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
