"use client";

import { ArrowDown, ArrowUp, ImageIcon, ImageUp, X } from "lucide-react";
import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { COLORS, colorLabel } from "@/data/colors";
import type { ColorKey } from "@/data/types";
import { phrase, stored } from "@/lib/admin-text";
import { picker } from "@/lib/i18n";
import { styleInList } from "@/lib/lexicon";
import { dims, outputSize, previewBox, type Crop } from "@/lib/photo-crop";
import { photoUrl } from "@/lib/photos";
import { PICK_TYPES, fileSizeLabel, savedPhotoCaption, type LoanPhoto } from "@/lib/product-form";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import buttonStyles from "@/registry/components/button/button.module.css";
import { phraseNode } from "./ArcPhrase";
import { ArcPhotoPicker } from "./ArcPhotoPicker";
import form from "./ArcProductForm.module.css";
import styles from "./ArcPhotoRow.module.css";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label or names its button. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * What one colour row holds for its photo (`PhotoKind` in `lib/product-form`
 * names the four). A picked `file` keeps the File itself (it is encoded and
 * uploaded only when the form is saved), the object URL the thumbnail and the
 * crop dialog draw it from, its natural size, the region chosen, and, once it
 * has been uploaded, the key the server gave it: a second try after a refused
 * save sends that key again instead of the file. v3's `SlotPhoto`
 * (`components/admin/ProductPhotoSlot.tsx`), unchanged.
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
 * One row of "Màu và ảnh" in the Arc frame (round v5 slice 5b): v3's
 * `ProductPhotoSlot` (`components/admin/ProductPhotoSlot.tsx`) rule for rule
 * and word for word. The colour's photo at 4:5, its swatch and name with the
 * band-order buttons, a line saying what the photo is, and the moves that
 * change it.
 *
 * The photo is one of four things, and the row says which: a picked FILE
 * (name, size, the region and the size it will be saved at), a BORROWED
 * stand-in (always labelled "mượn tạm", naming the style it belongs to;
 * PRODUCT.md: a stand-in is never shown as the real thing), a REAL photo
 * already on the style ("Ảnh đã tải lên" when uploaded, "Ảnh thật" when it
 * ships with the app), or NOTHING yet (a dashed box). Every one of them also
 * takes a file dropped on it.
 *
 * The file pickers are `<label>`s around a hidden `<input type=file>`, so the
 * button IS the input for a click, Enter and Space alike. "Chọn tệp", "Tải
 * ảnh thật" and "Đổi ảnh" wear Arc's small secondary button, borrowed from its
 * stylesheet the way `ArcButtonLink` borrows it (registry/PATCHES.md §4); the
 * one beside "Khung cắt" is a text link, as in v3, so the three moves of a
 * picked file stay one line. The keyboard ring is drawn on the label
 * (`:focus-within`), since the input it belongs to is out of sight.
 */
export function ArcPhotoRow({
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
  onChooseLoan,
  onCommitLoan,
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
  /** A borrowed photo chosen with the arrow keys: the grid stays open. */
  onChooseLoan: (key: string) => void;
  /** A borrowed photo pressed (pointer, Enter, Space): the grid closes. */
  onCommitLoan: (key: string) => void;
}) {
  const [over, setOver] = useState(false);
  // The page's language (round v6 slice E5).
  const locale = useLocale();
  const t = picker(locale);
  const label = colorLabel(color, locale);

  const filePicker = (text: string, look: "button" | "link", first: boolean) => (
    <label
      className={
        look === "button"
          ? [buttonStyles.button, buttonStyles.secondary, buttonStyles.sm, styles.picker].join(" ")
          : [form.link, styles.picker].join(" ")
      }
    >
      {look === "button" && <ImageUp {...ICON} />}
      {text}
      <input
        type="file"
        accept={ACCEPT}
        className={styles.file}
        aria-label={t({ vi: `${text} cho ${label}`, en: `${text} for ${label}` })}
        // Where focus goes back to when the crop dialog shuts with no "Khung cắt" on the row.
        data-pick={first ? color : undefined}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          // Picking the same file again must still arrive as a change.
          e.target.value = "";
        }}
      />
    </label>
  );

  const loanToggle = (text: string) => (
    <button type="button" className={form.link} aria-expanded={picking} data-loan={color} onClick={onTogglePick}>
      {text}
    </button>
  );

  // The box: a picked file is drawn as a background so only the chosen region
  // shows (v3's `cropStyle`); a stored photo is an image; an empty box is
  // dashed and carries the image icon.
  let shotStyle: CSSProperties | undefined;
  let shotBody: ReactNode = null;
  let caption: ReactNode;
  let actions: ReactNode;
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
        <strong>{photo.name}</strong>
        {t<ReactNode>({
          // The Vietnamese is the JSX it always was, text node for text node.
          vi: (
            <> · {fileSizeLabel(photo.bytes)} · vùng cắt {dims(photo.crop.w, photo.crop.h)}{" "}
              · lưu {dims(out.w, out.h)}</>
          ),
          en: (
            <> · {fileSizeLabel(photo.bytes, locale)} · crop {dims(photo.crop.w, photo.crop.h, locale)} · saved at{" "}
              {dims(out.w, out.h, locale)}</>
          ),
        })}
      </>
    );
    // No icon on "Khung cắt", as in v3 (brief v5 slice 5b, §3.5): the label
    // names the move, and the three moves of a picked file keep one line.
    actions = (
      <>
        <Button type="button" variant="secondary" size="sm" data-crop={color} onClick={onCrop}>
          {t({ vi: "Khung cắt", en: "Crop" })}
        </Button>
        {filePicker(t({ vi: "Đổi ảnh", en: "Change photo" }), "link", false)}
        {loanToggle(t({ vi: "Mượn tạm", en: "Borrow" }))}
      </>
    );
  } else if (photo.kind === "loan" || photo.kind === "saved") {
    const owner = photo.kind === "loan" ? loans.find((l) => l.key === photo.key)?.name : undefined;
    shotBody = <Image src={photoUrl(photo.key, 240)} alt="" width={96} height={SHOT_HEIGHT} />;
    caption =
      photo.kind === "loan" ? (
        <>
          <Badge tone="neutral" size="sm" className={styles.badge}>
            {t({ vi: "mượn tạm", en: "borrowed" })}
          </Badge>
          {/* The name held whole: "S04 –" never over "RÊU" (v3 slice 13). In
              English a Vietnamese name says so (`stored`). */}
          {owner
            ? phraseNode(
                locale === "vi"
                  ? ` ảnh của mẫu ${styleInList(owner)}`
                  : phrase(" photo of ", stored(styleInList(owner), locale)),
              )
            : ""}
        </>
      ) : (
        savedPhotoCaption(photo.key, locale)
      );
    actions =
      photo.kind === "loan" ? (
        <>
          {filePicker(t({ vi: "Tải ảnh thật", en: "Upload a real photo" }), "button", true)}
          {loanToggle(t({ vi: "Đổi ảnh mượn", en: "Change borrowed photo" }))}
        </>
      ) : (
        <>
          {filePicker(t({ vi: "Đổi ảnh", en: "Change photo" }), "button", true)}
          {loanToggle(t({ vi: "Mượn tạm", en: "Borrow" }))}
        </>
      );
  } else {
    shotBody = <ImageIcon size={24} strokeWidth={1.75} aria-hidden="true" />;
    caption = t({
      vi: "Chưa có ảnh · JPG, PNG hoặc WebP, tối đa 10 MB · kéo thả vào ô hoặc chọn tệp",
      en: "No photo yet · JPG, PNG or WebP, 10 MB at most · drop it on the box or choose a file",
    });
    actions = (
      <>
        {filePicker(t({ vi: "Chọn tệp", en: "Choose file" }), "button", true)}
        {loanToggle(t({ vi: "Mượn tạm", en: "Borrow" }))}
      </>
    );
  }

  return (
    <div className={styles.row}>
      <div className={styles.media}>
        <span
          className={styles.shot}
          data-blank={photo.kind === "none" ? "" : undefined}
          data-over={over ? "" : undefined}
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
        </span>
        {/* The upload of this photo while the form saves: the line travels
            while it runs (the upload reports no bytes) and stays full once
            the photo is through. The save bar says the same in words. */}
        {progress && (
          <span className={styles.progress} data-state={progress} aria-hidden="true">
            <span />
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.swatch} style={{ background: COLORS[color].hex }} aria-hidden="true" />
          <span className={styles.name}>{label}</span>
          <span className={styles.order}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.iconButton}
              data-move={color}
              data-dir="-1"
              aria-label={t({ vi: `Đưa ${label} lên trước`, en: `Move ${label} up` })}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp {...ICON} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.iconButton}
              data-move={color}
              data-dir="1"
              aria-label={t({ vi: `Đưa ${label} xuống sau`, en: `Move ${label} down` })}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown {...ICON} />
            </Button>
            {mode === "new" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.iconButton}
                aria-label={t({ vi: `Bỏ màu ${label}`, en: `Remove ${label}` })}
                onClick={onUnpick}
              >
                <X {...ICON} />
              </Button>
            )}
          </span>
        </div>
        <p className={styles.caption}>
          {index === 0 && t({ vi: "Ảnh đại diện · ", en: "Cover photo · " })}
          {caption}
        </p>
        <div className={styles.actions}>{actions}</div>
        {picking && (
          <div className={styles.loans}>
            <ArcPhotoPicker
              label={t({ vi: `Ảnh mượn tạm cho ${label}`, en: `Borrowed photo for ${label}` })}
              hideLabel
              keys={loans.map((l) => l.key)}
              value={photo.kind === "loan" ? photo.key : null}
              nameOf={(key) => {
                const owner = loans.find((l) => l.key === key)?.name ?? "";
                return t({ vi: `Ảnh của ${owner}`, en: `Photo of ${owner}` });
              }}
              onValueChange={onChooseLoan}
              onCommit={onCommitLoan}
            />
          </div>
        )}
      </div>
    </div>
  );
}
