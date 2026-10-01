"use client";

import { ArrowLeft, Plus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { LEX, issueNo } from "@/lib/lexicon";
import {
  kindOptions,
  photoKeys,
  teaserBlocker,
  teaserName,
  type TeaserDraft,
} from "@/lib/teaser-form";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import box from "./ArcDialog.module.css";
import { ArcPhotoPicker } from "./ArcPhotoPicker";
import { keepOpenForToasts } from "./arc-toasts";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * "Thêm mẫu hé lộ": a name, a kind and a picture, and nothing else. v3's
 * `TeaserFormSheet` (`components/admin/TeaserFormSheet.tsx`) rule for rule and
 * word for word, in an Arc `Dialog` in the middle of the screen (brief v5
 * slice 4, §2), its pure parts in `lib/teaser-form.ts`.
 *
 * No price and no cut: both are published at the hour the issue opens, and a
 * form that asked for them would collect numbers the shop has not decided.
 * What it adds is a row of `public.teasers` (`admin_add_teaser()`), which the
 * shop's home page reads too.
 *
 * The kind is Arc's `Select`, each kind with its family at the row's end (the
 * `note` patch, registry/PATCHES.md), as v3's menu had it. The photo is
 * `ArcPhotoPicker`, a radio group. Until all three are there the button is
 * disabled, without an icon, and names the first thing missing, as in v3.
 */
export function ArcTeaserDialog({
  open,
  pending,
  no,
  opening,
  onClose,
  onConfirm,
  onCloseAutoFocus,
}: {
  open: boolean;
  /** The save is on its way to the server. */
  pending: boolean;
  /** The issue the teaser is announced for; kept while the dialog animates out. */
  no: number;
  /** Which opening this is: the form starts empty each time. */
  opening: number;
  onClose: () => void;
  onConfirm: (draft: TeaserDraft) => void;
  /** Where focus goes when the dialog shuts: the button that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        title={`Thêm mẫu hé lộ cho ${LEX.tl} ${issueNo(no)}`}
        onCloseAutoFocus={onCloseAutoFocus}
        onInteractOutside={keepOpenForToasts}
      >
        <TeaserForm key={opening} no={no} pending={pending} onCancel={onClose} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  );
}

/** The three fields and the two buttons. Mounted each time the dialog opens, so it starts empty. */
function TeaserForm({
  no,
  pending,
  onCancel,
  onConfirm,
}: {
  no: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (draft: TeaserDraft) => void;
}) {
  const catalog = useCatalog();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const clean = teaserName(name);
  const blocker = teaserBlocker(clean, kind, photo);
  const ready = blocker === null;

  /**
   * A style's name is written in capitals, as the shop prints it: v3 drew the
   * box in capitals, and here the value itself is, as the code field of the
   * discount form does (slice 3), since Arc draws no uppercase transform. Not
   * while an input method is still composing a character; the finished
   * character is raised when it lands. Raising the value makes React rewrite
   * the box, which would throw the caret to the end: it is put back.
   */
  const nameField = useRef<HTMLInputElement>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  function typeName(field: HTMLInputElement, composing: boolean) {
    const value = composing ? field.value : field.value.toLocaleUpperCase("vi");
    if (value !== field.value) {
      caret.current = { start: field.selectionStart ?? value.length, end: field.selectionEnd ?? value.length };
    }
    setName(value);
  }
  useLayoutEffect(() => {
    const field = nameField.current;
    if (!field || !caret.current) return;
    field.setSelectionRange(caret.current.start, caret.current.end);
    caret.current = null;
  }, [name]);

  return (
    <>
      <div className={box.fields}>
        <Input
          ref={nameField}
          label="Tên mẫu"
          placeholder="VIẾT HOA, một từ"
          autoComplete="off"
          spellCheck={false}
          value={name}
          onChange={(e) => typeName(e.target, (e.nativeEvent as InputEvent).isComposing)}
          onCompositionEnd={(e) => typeName(e.currentTarget, false)}
        />
        <Select
          label="Loại"
          placeholder="Chọn loại"
          options={kindOptions(catalog)}
          value={kind ?? ""}
          onValueChange={setKind}
        />
        <ArcPhotoPicker label="Ảnh" keys={photoKeys(catalog)} value={photo} onValueChange={setPhoto} />
      </div>
      <div className={box.actions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          Huỷ
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          loading={pending}
          onClick={() => {
            if (pending || !kind || !photo || !clean) return;
            onConfirm({ dropNo: no, name: clean, garment: kind, photoKey: photo });
          }}
        >
          {ready && !pending ? <Plus {...ICON} /> : null}
          {pending ? "Đang lưu…" : (blocker ?? "Thêm")}
        </Button>
      </div>
    </>
  );
}
