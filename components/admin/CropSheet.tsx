"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
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

/** A photo waiting for its region: the file, where it is drawn from, its size, the frame so far. */
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
 * "Chọn vùng cắt" (v3 slice 7, round 7b — the user asked for a frame to drag
 * rather than a centre cut, QĐ-27): the picked photo with a 4:5 frame over it.
 * Drag the frame to move it, a corner to resize it (ratio locked, the
 * opposite corner stays put), the arrow keys to nudge it 8 pixels (40 with
 * Shift), `+` and `−` to grow or shrink it 5 %. Beside it: the region as the
 * shop will show it, its size, the size it will be saved at, a warning when
 * it is too narrow to stay sharp, and "Toàn ảnh" to start again from the
 * largest frame.
 *
 * Everything outside the frame is dimmed by one 9999px shadow that the
 * stage clips; the frame is a honey thread with four 14px handles, which are
 * a drag affordance and not buttons (the keyboard has its own keys).
 *
 * The arithmetic is `lib/photo-crop.ts`, in the photo's own pixels; this
 * component only turns pointer movement into those pixels by the scale it
 * drew the photo at. "Huỷ", Escape and the scrim all cancel.
 */
export function CropSheet({
  target,
  onApply,
  onCancel,
}: {
  target: CropTarget | null;
  onApply: (crop: Crop) => void;
  onCancel: () => void;
}) {
  if (!target) return null;
  // Keyed on the photo, so each opening starts from the frame it was given.
  return (
    <CropSheetOpen
      key={`${target.src}:${target.fresh}`}
      target={target}
      onApply={onApply}
      onCancel={onCancel}
    />
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

function CropSheetOpen({
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

  // The photo may already be decoded when the sheet mounts (the thumbnail
  // drew the same object URL); a resize changes the scale it is drawn at.
  useLayoutEffect(() => {
    if (imgRef.current?.complete) measure();
  }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const label = COLORS[target.color].label;
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
    <AdminSheet
      open
      wide
      variant="crop"
      onClose={onCancel}
      title={`Chọn vùng cắt · ${label}`}
      sub="Ảnh trên trang luôn là 4:5. Kéo khung để dời, kéo góc để đổi cỡ; phần ngoài khung không được lưu."
      footer={
        <>
          <Button tone="ink sm" icon="back" onClick={onCancel}>
            Huỷ
          </Button>
          <Button tone="sm" icon="check" onClick={() => onApply(crop)}>
            Dùng vùng này
          </Button>
        </>
      }
    >
      <div className="cropwrap">
        <div className="cropper">
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
            className="frame"
            role="group"
            tabIndex={0}
            aria-roledescription="khung cắt"
            aria-label="Khung cắt 4:5 · phím mũi tên để dời, cộng và trừ để đổi cỡ"
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
            <i data-h="nw" />
            <i data-h="ne" />
            <i data-h="sw" />
            <i data-h="se" />
          </div>
        </div>
        <div className="cropside">
          <span
            className="shot"
            aria-hidden="true"
            style={{
              backgroundImage: `url("${src}")`,
              backgroundSize: `${preview.size.toFixed(1)}px auto`,
              backgroundPosition: `${preview.x.toFixed(1)}px ${preview.y.toFixed(1)}px`,
            }}
          />
          <div className="file">
            Vùng chọn <b>{dims(crop.w, crop.h)}</b>
            <br />
            lưu {dims(out.w, out.h)}
            {isSoft(crop) && (
              <div className="err">
                <Icon name="danger" className="ic sm" />
                <span>Hẹp hơn 800px, ảnh trên trang sẽ mờ</span>
              </div>
            )}
          </div>
          <button type="button" className="lnk" onClick={() => setCrop(defaultCrop(nw, nh))}>
            Toàn ảnh
          </button>
        </div>
      </div>
    </AdminSheet>
  );
}
