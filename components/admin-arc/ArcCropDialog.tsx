"use client";

import { ArrowLeft, Check, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { COLORS } from "@/data/colors";
import type { ColorKey } from "@/data/types";
import {
  defaultCrop,
  dims,
  isHandle,
  isSoft,
  keyCrop,
  moveCrop,
  outputSize,
  previewBox,
  resizeFromHandle,
  type Crop,
  type Handle,
} from "@/lib/photo-crop";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import styles from "./ArcCropDialog.module.css";
import form from "./ArcProductForm.module.css";
import { keepOpenForToasts } from "./arc-toasts";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** A photo waiting for its region: the file, where it is drawn from, its size, the frame so far. v3's `CropTarget`. */
export interface CropTarget {
  color: ColorKey;
  file: File;
  name: string;
  bytes: number;
  src: string;
  nw: number;
  nh: number;
  crop: Crop;
  /**
   * Just picked (or dropped): "Huỷ" drops the file and the row keeps the
   * photo it had. False when "Khung cắt" reopened a file already on the row.
   */
  fresh: boolean;
}

/** The preview beside the stage is the product page's 4:5, 96 × 120. */
const PREVIEW_HEIGHT = 120;

/**
 * "Chọn vùng cắt" in an Arc `Dialog`, 720px in the middle of the screen
 * (round v5 slice 5b, §2): one focused job on one photo. v3's `CropSheet`
 * (`components/admin/CropSheet.tsx`) rule for rule and word for word: the
 * picked photo with a 4:5 frame over it. Drag the frame to move it, a corner
 * to resize it (ratio locked, the opposite corner stays put), the arrow keys
 * to nudge it 8 pixels (40 with Shift), `+` and `−` to grow or shrink it 5 %.
 * Beside it: the region as the shop will show it, its size, the size it will
 * be saved at, a warning when it is too narrow to stay sharp, and "Toàn ảnh"
 * to start again from the largest frame.
 *
 * Everything outside the frame is dimmed by one large shadow that the stage
 * clips; the frame is a 2px accent edge with four 14px corners, which are a
 * drag affordance and not buttons (the keyboard has its own keys).
 *
 * The arithmetic is `lib/photo-crop.ts`, in the photo's own pixels; this
 * component only turns pointer movement into those pixels by the scale it
 * drew the photo at. "Huỷ", Escape and a press on the overlay all cancel;
 * a press on a toast does not (`keepOpenForToasts`). The form says where
 * focus goes when it shuts (`onCloseAutoFocus`): Radix only hands it back to
 * a `DialogTrigger`, and this dialog opens from a file picker or a drop.
 */
export function ArcCropDialog({
  target,
  opening,
  onApply,
  onCancel,
  onCloseAutoFocus,
}: {
  /** The photo being cropped, or null while the dialog is shut. */
  target: CropTarget | null;
  /** Which opening this is: the frame starts from the target's own each time. */
  opening: number;
  onApply: (crop: Crop) => void;
  onCancel: () => void;
  /** Where focus goes when the dialog shuts: the row's "Khung cắt", else its file picker. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  // The dialog animates out after `target` is gone: it keeps drawing the last
  // photo until then, or its title would lose the colour on the way out.
  const [shown, setShown] = useState<CropTarget | null>(target);
  if (target && target !== shown) setShown(target);

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent
        className={styles.dialog}
        title={shown ? `Chọn vùng cắt · ${COLORS[shown.color].label}` : ""}
        description="Kéo khung để dời, kéo góc để đổi cỡ."
        onInteractOutside={keepOpenForToasts}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {shown && <CropBody key={opening} target={shown} onApply={onApply} onCancel={onCancel} />}
      </DialogContent>
    </Dialog>
  );
}

/** Where the photo sits on the stage: the scale it is drawn at, and its offset. */
interface Stage {
  scale: number;
  left: number;
  top: number;
}

interface Drag {
  mode: "move" | Handle;
  x: number;
  y: number;
  start: Crop;
}

/** The stage, the column beside it and the two buttons. Mounted each time the dialog opens. */
function CropBody({
  target,
  onApply,
  onCancel,
}: {
  target: CropTarget;
  onApply: (crop: Crop) => void;
  onCancel: () => void;
}) {
  const { nw, nh, src } = target;
  const [crop, setCrop] = useState<Crop>(target.crop);
  const [stage, setStage] = useState<Stage | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<Drag | null>(null);

  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.clientWidth === 0) return;
    setStage({ scale: img.clientWidth / nw, left: img.offsetLeft, top: img.offsetTop });
  }, [nw]);

  // The photo may already be decoded when the dialog mounts (the thumbnail
  // drew the same object URL); a resize changes the scale it is drawn at.
  useLayoutEffect(() => {
    if (imgRef.current?.complete) measure();
  }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const out = outputSize(crop);
  const preview = previewBox(crop, nw, PREVIEW_HEIGHT);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const handle = (e.target as HTMLElement).getAttribute("data-h");
    drag.current = {
      mode: isHandle(handle) ? handle : "move",
      x: e.clientX,
      y: e.clientY,
      start: crop,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Pressing the frame is choosing it: it takes the arrow keys next.
    e.currentTarget.focus();
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !stage) return;
    const dx = (e.clientX - d.x) / stage.scale;
    const dy = (e.clientY - d.y) / stage.scale;
    setCrop(
      d.mode === "move"
        ? moveCrop(d.start, dx, dy, nw, nh)
        : resizeFromHandle(d.start, d.mode, dx, dy, nw, nh),
    );
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const next = keyCrop(crop, e.key, e.shiftKey, nw, nh);
    if (!next) return;
    e.preventDefault();
    setCrop(next);
  }

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.stage}>
          <Image
            ref={imgRef}
            src={src}
            alt=""
            width={nw}
            height={nh}
            draggable={false}
            onLoad={measure}
          />
          <div
            className={styles.frame}
            role="group"
            tabIndex={0}
            aria-roledescription="khung cắt"
            aria-label="Khung cắt 4:5 · phím mũi tên để dời, cộng và trừ để đổi cỡ"
            // Where the frame sits is the photo's own numbers times the scale
            // it is drawn at: it can only be written inline.
            style={
              stage
                ? {
                    left: stage.left + crop.x * stage.scale,
                    top: stage.top + crop.y * stage.scale,
                    width: crop.w * stage.scale,
                    height: crop.h * stage.scale,
                  }
                : { visibility: "hidden" }
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          >
            <span className={styles.handle} data-h="nw" />
            <span className={styles.handle} data-h="ne" />
            <span className={styles.handle} data-h="sw" />
            <span className={styles.handle} data-h="se" />
          </div>
        </div>
        <div className={styles.side}>
          <span
            className={styles.preview}
            aria-hidden="true"
            style={{
              backgroundImage: `url("${src}")`,
              backgroundSize: `${preview.size.toFixed(1)}px auto`,
              backgroundPosition: `${preview.x.toFixed(1)}px ${preview.y.toFixed(1)}px`,
            }}
          />
          <p className={styles.facts}>
            Vùng chọn <strong>{dims(crop.w, crop.h)}</strong>
            <br />
            lưu {dims(out.w, out.h)}
          </p>
          {isSoft(crop) && (
            <p className={styles.warning}>
              <TriangleAlert {...ICON} />
              <span>Hẹp hơn 800px, ảnh trên trang sẽ mờ</span>
            </p>
          )}
          <button type="button" className={form.link} onClick={() => setCrop(defaultCrop(nw, nh))}>
            Toàn ảnh
          </button>
        </div>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          <ArrowLeft {...ICON} />
          Huỷ
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={() => onApply(crop)}>
          <Check {...ICON} />
          Dùng vùng này
        </Button>
      </div>
    </>
  );
}
