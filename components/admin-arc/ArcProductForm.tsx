"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import { COLOR_KEYS, SIZES, type ColorKey, type Fit, type Size } from "@/data/types";
import {
  createProduct,
  removeUploadedPhoto,
  updateProduct,
  uploadProductPhoto,
} from "@/lib/actions/catalog-admin";
import type { ActionState } from "@/lib/actions/state";
import { FIXED_CHOICE } from "@/lib/admin-options";
import {
  MAX_CUT_PER_CELL,
  MAX_MATERIAL,
  MAX_NEW_SLUG,
  MAX_PRODUCT_NAME,
  MAX_SLUG,
  catalogFailureMessage,
  gridCells,
  slugFor,
  uniqueSlug,
} from "@/lib/catalog-admin";
import { FITS, FIT_LABELS } from "@/lib/catalog-query";
import { FIXED_WORD, LEX, stylePrefix } from "@/lib/lexicon";
import { moneyInitial, moneyInput, parseVnd, plainVnd } from "@/lib/money";
import { defaultCrop, sameCrop, type Crop } from "@/lib/photo-crop";
import { PhotoEncodeError, encodeCrop } from "@/lib/photo-encode";
import { UPLOAD_TYPES } from "@/lib/photos";
import {
  droppedColorMessage,
  gridTotal,
  loanPhotos,
  newStyleBlocker,
  panelMeta,
  photoTally,
  pickProblem,
  rowTotal,
  staleUploads,
  storedPhotoKind,
  type CellGrid,
  type PhotoKind,
} from "@/lib/product-form";
import { Button } from "@/registry/components/button/button";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import { Textarea } from "@/registry/components/textarea/textarea";
import { ArcButtonLink } from "./ArcButtonLink";
import { ArcCropDialog, type CropTarget } from "./ArcCropDialog";
import panel from "./ArcOrderScreen.module.css";
import { ArcPhotoRow, type FilePhoto, type SlotPhoto } from "./ArcPhotoRow";
import styles from "./ArcProductForm.module.css";
import stock from "./ArcStockDrawer.module.css";
import { useArcToast } from "./useArcToast";
import { useCapitals } from "./useCapitals";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

export interface ProductFormValues {
  name: string;
  kind: string;
  /** Null for a new style: nobody has chosen one yet. */
  fit: Fit | null;
  slug: string;
  priceVnd: number;
  /**
   * The issue. For a new style, null when no issue can take one (every one
   * has closed): "Cố định" is still there to pick; for a style being edited,
   * null is a FIXED style (slice B5).
   */
  dropNo: number | null;
  material: string;
  /** Band order: the order the shop's card draws the colour dots in. */
  colors: ColorKey[];
  /** `stock[color][size]`: pieces on the shelf. Empty for a new style. */
  stock: Record<string, Record<string, number>>;
  /** One photo per colour, in `colors` order: borrowed keys or uploads. */
  photoKeys: string[];
}

/** A menu's rows: the kinds with their count ("6 mẫu"), the issues with what they are doing. */
interface Option {
  value: string;
  label: string;
  note?: string;
}

const FIT_OPTIONS = FITS.map((f) => ({ value: f, label: FIT_LABELS[f] }));

const NONE: SlotPhoto = { kind: "none" };

type Keys = Partial<Record<ColorKey, string>>;
type Photos = Partial<Record<ColorKey, SlotPhoto>>;

/** An upload in flight: which colour, its place in the queue, and which are through. */
interface Upload {
  color: ColorKey;
  index: number;
  total: number;
  done: ColorKey[];
}

/**
 * Add or edit a style, in the Arc frame (round v5 slice 5b): v3's
 * `ProductForm` (`components/admin/ProductForm.tsx`, v3 slice 7, QĐ-27) rule
 * for rule and word for word, drawn with Arc's parts. The v3 file stays until
 * the clean-up slice.
 *
 * NEW: the colours are chosen here, as seven toggles, and the order they are
 * picked in IS the band order on the shop's card (a chosen toggle carries its
 * place; the first colour is the cover photo). Each colour gets a row in the
 * cut grid and a row in "Màu và ảnh" with one 4:5 photo: a file picked or
 * dropped on this device and cropped in the dialog, or a borrowed stand-in,
 * which stays labelled "mượn tạm" (PRODUCT.md). The save button says what is
 * still missing until nothing is (`newStyleBlocker`), then "Tạo mẫu · 36
 * chiếc".
 *
 * EDIT: the colours were fixed when the cloth was cut (QĐ-27), so there are
 * no toggles and no "Bỏ màu": only the band order and the photos change. The
 * grid is the shelf, saved as an adjustment with the reason "Sửa mẫu" (slice
 * B3b), and "Lưu thay đổi" is always there: an unchanged form comes back from
 * the server as "Chưa có thay đổi nào để lưu."
 *
 * TWO KINDS OF STYLE (v3 slice 12). The issue menu of a new style ends with
 * "Cố định", a style of no issue; an issue's style shows the issue's code as
 * a fixed segment at the head of the name field ("S06 –", `stylePrefix`, the
 * `prefix` patch of Arc's `Input`). Picking "Cố định" drops the segment, and
 * the grid is "Tồn kho" and the colours "Màu": a fixed style is never cut. A
 * fixed style being edited shows "Cố định" in a read-only issue field.
 *
 * SAVING, in v3's order: every picked file is cropped and shrunk in this
 * browser (`lib/photo-encode.ts`) and uploaded one at a time
 * (`uploadProductPhoto`), the bar counting "Đang tải ảnh lên… 1 / 2" and a
 * line running under the photo in flight. The key each upload gets is kept on
 * its row, so a save the server refuses (a taken address, say) sends the
 * same keys again instead of the files; a refusal saying the bucket has
 * forgotten them ("Đặt lại dữ liệu mẫu") sends those files again, once. Then
 * `createProduct` (and the styles table, where the toast is said) or
 * `updateProduct` (and this page, re-rendered with what the database now
 * holds: the screen keys this form on its values). Every answer is said in
 * the zone's toast (`useArcToast`), in the server's own words.
 *
 * While a save is in flight the two columns are `inert`: what is being sent
 * cannot change under it. Object URLs are given back when the form goes away.
 */
export function ArcProductForm({
  mode,
  productId,
  values,
  kindOptions,
  dropOptions,
  cutUnits,
}: {
  mode: "new" | "edit";
  /** The style being edited: what the save is keyed on. Absent for a new one. */
  productId?: string;
  values: ProductFormValues;
  kindOptions: Option[];
  dropOptions: Option[];
  /**
   * Units the issue cut, for the grid's line. A plain number, because
   * per-size sales are not recorded anywhere: deriving them would mean
   * apportioning a total nobody measured.
   */
  cutUnits?: number;
}) {
  const say = useArcToast();
  const router = useRouter();
  const catalog = useCatalog();
  const chipLabel = useId();
  const ids = { basics: useId(), grid: useId(), photos: useId() };

  const [name, setName] = useState(values.name);
  const [kind, setKind] = useState(values.kind);
  const [fit, setFit] = useState<Fit | null>(values.fit);
  const [slug, setSlug] = useState(values.slug);
  const [price, setPrice] = useState(moneyInitial(values.priceVnd));
  const [dropNo, setDropNo] = useState(values.dropNo === null ? "" : String(values.dropNo));
  // A FIXED style (slice B5): being made ("Cố định" picked in the issue menu)
  // or being edited. It belongs to no issue and never will
  // (`admin_update_product` refuses the crossing), and it has no cut.
  const fixed = mode === "edit" ? values.dropNo === null : dropNo === FIXED_CHOICE;
  // The issue whose code heads the name field: the one picked, if any.
  const issue = !fixed && dropNo !== "" ? Number(dropNo) : null;
  const [material, setMaterial] = useState(values.material);
  const [order, setOrder] = useState<ColorKey[]>(values.colors);
  const [cells, setCells] = useState<CellGrid>(values.stock as CellGrid);
  const [photos, setPhotos] = useState<Photos>(() => storedPhotos(values));
  const [picking, setPicking] = useState<ColorKey | null>(null);
  const [cropping, setCropping] = useState<CropTarget | null>(null);
  const [cropOpening, setCropOpening] = useState(0);
  const [upload, setUpload] = useState<Upload | null>(null);
  // Two flags, because a save has two halves. The uploads run as plain async
  // work, so every step of "Đang tải ảnh lên… 1 / 2" renders the moment it
  // happens; set inside a transition, the first one would be held back until
  // the whole save had finished. The action that writes the style, and the
  // move to the styles table, run as transitions (`02-guides/
  // server-actions.md`: invoke from an event handler wrapped in
  // `startTransition`), so the page they re-render arrives as one update.
  const [busy, setBusy] = useState(false);
  const [pending, startSaving] = useTransition();
  const saving = busy || pending;

  // The name in capitals as it is typed, the caret kept (`useCapitals`,
  // shared with the teaser dialog of the issues screen).
  const capitals = useCapitals(name, setName);

  const rootRef = useRef<HTMLDivElement>(null);
  // Focus to restore after the next commit: the same arrow after a move, the
  // row's loan toggle once a borrowed photo is pressed (the grid it was in is
  // gone).
  const focusNext = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const f = focusNext.current;
    focusNext.current = null;
    f?.();
  });
  // The colour the crop dialog was opened for, for focus to go back to its row.
  const cropColor = useRef<ColorKey | null>(null);

  // Object URLs are the browser's memory, not React's: give every one back
  // when the form goes away.
  const photosRef = useRef(photos);
  const croppingRef = useRef(cropping);
  useEffect(() => {
    photosRef.current = photos;
    croppingRef.current = cropping;
  }, [photos, cropping]);
  useEffect(
    () => () => {
      for (const p of Object.values(photosRef.current)) {
        if (p?.kind === "file") URL.revokeObjectURL(p.src);
      }
      // A file still in the crop dialog, never applied.
      if (croppingRef.current?.fresh) URL.revokeObjectURL(croppingRef.current.src);
    },
    [],
  );

  const loans = useMemo(() => loanPhotos(catalog), [catalog]);
  const kinds = useMemo(() => {
    const out: Partial<Record<ColorKey, PhotoKind>> = {};
    for (const c of order) out[c] = (photos[c] ?? NONE).kind;
    return out;
  }, [order, photos]);
  const tally = photoTally(order, kinds);
  const total = gridTotal(cells, order);
  const priceVnd = price === "" ? 0 : Number(price);
  const blocker =
    mode === "new"
      ? newStyleBlocker({ name, kind, fit, dropNo, priceVnd, material, colors: order, cells, photos: kinds })
      : null;
  // What an empty address box becomes: the action's own rule (`slugFor`: the
  // issue's code in front for an issue's style), so the placeholder is the
  // address the style will really get.
  const autoSlug =
    mode === "new" && name.trim() !== "" ? uniqueSlug(slugFor(name, issue), catalog) : "";

  // ─────────────────────────────────────────────────────────── the colours
  function toggleColor(color: ColorKey) {
    if (order.includes(color)) unpick(color);
    else setOrder([...order, color]);
  }

  /** A colour dropped (toggle or "Bỏ màu"): its typed pieces and its photo go with it. */
  function unpick(color: ColorKey) {
    const message = droppedColorMessage(color, rowTotal(cells, color));
    if (message) say(message);
    setOrder(order.filter((c) => c !== color));
    const nextCells = { ...cells };
    delete nextCells[color];
    setCells(nextCells);
    discard(photos[color]);
    const nextPhotos = { ...photos };
    delete nextPhotos[color];
    setPhotos(nextPhotos);
    if (picking === color) setPicking(null);
  }

  function move(color: ColorKey, dir: -1 | 1) {
    const i = order.indexOf(color);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    next.splice(i, 1);
    next.splice(j, 0, color);
    setOrder(next);
    // Keep the keyboard where it was: the same arrow of the same colour, or
    // the other one once this one has reached the end of the band.
    focusNext.current = () => {
      const root = rootRef.current;
      const same = root?.querySelector<HTMLButtonElement>(`[data-move="${color}"][data-dir="${dir}"]`);
      const other = root?.querySelector<HTMLButtonElement>(`[data-move="${color}"][data-dir="${-dir}"]`);
      (same && !same.disabled ? same : other)?.focus();
    };
  }

  function setCell(color: ColorKey, size: Size, raw: string) {
    const n = Math.max(0, Math.min(MAX_CUT_PER_CELL, Number(raw.replace(/\D/g, "")) || 0));
    setCells((prev) => ({ ...prev, [color]: { ...(prev[color] ?? {}), [size]: n } }));
  }

  // ──────────────────────────────────────────────────────────── the photos
  /** Let go of a photo that is being replaced: its object URL, and its upload if it had one. */
  function discard(photo: SlotPhoto | undefined) {
    if (photo?.kind !== "file") return;
    URL.revokeObjectURL(photo.src);
    if (photo.key) forget(photo.key);
  }

  /**
   * An upload nothing will attach any more (brief B3c §2.9: garbage the form
   * tidies when it knows). Best effort: "Đặt lại dữ liệu mẫu" clears the rest.
   */
  function forget(key: string) {
    removeUploadedPhoto(key).catch(() => undefined);
  }

  /** A file picked or dropped: checked, measured, then straight into the crop dialog. */
  async function pickFile(color: ColorKey, file: File | undefined) {
    if (!file) return;
    const problem = pickProblem(file);
    if (problem) return say(problem, "error");
    const src = URL.createObjectURL(file);
    const size = await naturalSize(src);
    if (!size) {
      URL.revokeObjectURL(src);
      return say("Không đọc được ảnh này · chọn tệp khác", "error");
    }
    setPicking(null);
    openCropDialog({
      color,
      file,
      name: file.name,
      bytes: file.size,
      src,
      nw: size.w,
      nh: size.h,
      crop: defaultCrop(size.w, size.h),
      fresh: true,
    });
  }

  function openCrop(color: ColorKey) {
    const p = photos[color];
    if (p?.kind !== "file") return;
    openCropDialog({
      color,
      file: p.file,
      name: p.name,
      bytes: p.bytes,
      src: p.src,
      nw: p.nw,
      nh: p.nh,
      crop: p.crop,
      fresh: false,
    });
  }

  function openCropDialog(target: CropTarget) {
    cropColor.current = target.color;
    setCropOpening((n) => n + 1);
    setCropping(target);
  }

  function applyCrop(crop: Crop) {
    const t = cropping;
    if (!t) return;
    const old = photos[t.color];
    const same = old?.kind === "file" && old.src === t.src ? old : null;
    // An upload of this file and this very region still stands; any other is stale.
    const key = same?.key && sameCrop(same.crop, crop) ? same.key : undefined;
    if (!same) discard(old);
    else if (same.key && !key) forget(same.key);
    setPhotos({
      ...photos,
      [t.color]: { kind: "file", file: t.file, name: t.name, bytes: t.bytes, src: t.src, nw: t.nw, nh: t.nh, crop, key },
    });
    setCropping(null);
  }

  /** "Huỷ", Escape or the overlay: the row keeps what it had; a file just picked is dropped. */
  function cancelCrop() {
    if (cropping?.fresh) URL.revokeObjectURL(cropping.src);
    setCropping(null);
  }

  /**
   * Where focus goes when the crop dialog shuts (Radix hands it back only to
   * a `DialogTrigger`): the row's "Khung cắt", as v3's sheet left it once a
   * region was applied; a row that holds no picked file has none, and focus
   * goes to its file picker instead.
   */
  function returnFromCrop(event: Event) {
    const root = rootRef.current;
    const color = cropColor.current;
    if (!root || !color) return;
    const back =
      root.querySelector<HTMLElement>(`[data-crop="${color}"]`) ??
      root.querySelector<HTMLElement>(`[data-pick="${color}"]`);
    if (!back) return;
    event.preventDefault();
    back.focus();
  }

  /** A borrowed photo chosen (a press, or an arrow key in the grid): it replaces what the row had. */
  function chooseLoan(color: ColorKey, key: string) {
    discard(photos[color]);
    setPhotos({ ...photos, [color]: { kind: "loan", key } });
  }

  /** A borrowed photo pressed: the grid closes, as v3's did, and focus goes to the row's toggle. */
  function commitLoan(color: ColorKey) {
    setPicking(null);
    focusNext.current = () =>
      rootRef.current?.querySelector<HTMLElement>(`[data-loan="${color}"]`)?.focus();
  }

  // ──────────────────────────────────────────────────────────────── saving
  /**
   * Upload every picked file that has no key yet, and those in `again`,
   * whose key the server no longer knows, one at a time, in band order.
   * Answers colour → key for every file, or null after saying why one failed.
   */
  async function uploadAll(snapshot: Photos, again: readonly ColorKey[]): Promise<Keys | null> {
    const keys: Keys = {};
    const todo: ColorKey[] = [];
    for (const c of order) {
      const p = snapshot[c];
      if (p?.kind !== "file") continue;
      if (p.key && !again.includes(c)) keys[c] = p.key;
      else todo.push(c);
    }
    const done: ColorKey[] = [];
    for (const [i, c] of todo.entries()) {
      const p = snapshot[c] as FilePhoto;
      setUpload({ color: c, index: i + 1, total: todo.length, done: [...done] });
      const key = await uploadOne(c, p);
      if (!key) {
        setUpload(null);
        return null;
      }
      keys[c] = key;
      done.push(c);
      setPhotos((prev) => withKey(prev, c, p.src, key));
    }
    if (todo.length > 0) setUpload({ color: todo.at(-1)!, index: todo.length, total: todo.length, done });
    return keys;
  }

  async function uploadOne(color: ColorKey, photo: FilePhoto): Promise<string | null> {
    const label = COLORS[color].label;
    try {
      const { blob, type } = await encodeCrop(photo.file, photo.crop);
      const form = new FormData();
      form.set("file", blob, `${color}.${UPLOAD_TYPES[type]}`);
      form.set("color", color);
      const answer = await uploadProductPhoto(form);
      if (answer.ok && answer.key) return answer.key;
      say(answer.errors.form ?? catalogFailureMessage("UPLOAD_PHOTO", "UNAVAILABLE", label), "error");
    } catch (e) {
      // A refusal of the encoder has its own words; anything else (the
      // request never answered, a body over the limit) is "không tải được".
      say(
        e instanceof PhotoEncodeError
          ? `Không tải được ảnh ${label}: ${lowerFirst(e.message)}`
          : catalogFailureMessage("UPLOAD_PHOTO", "UNAVAILABLE", label),
        "error",
      );
    }
    return null;
  }

  /** Colour → photo key for the save: the upload's key for a file, the key itself otherwise. */
  function photoKeysFor(snapshot: Photos, keys: Keys): Keys {
    const out: Keys = {};
    for (const c of order) {
      const p = snapshot[c];
      if (!p || p.kind === "none") continue;
      out[c] = p.kind === "file" ? keys[c] : p.key;
    }
    return out;
  }

  async function send(snapshot: Photos, keys: Keys): Promise<ActionState> {
    const chosen = photoKeysFor(snapshot, keys);
    try {
      if (mode === "new") {
        return await createProduct({
          name,
          kind,
          fit,
          slug: slug.trim(),
          priceVnd,
          material,
          // "Cố định" is sent as null: a style of no issue (slice B5).
          dropNo: fixed ? null : Number(dropNo),
          colors: order,
          photos: chosen,
          cells: Object.fromEntries(
            order.map((c) => [c, Object.fromEntries(SIZES.map((s) => [s, cells[c]?.[s] ?? 0]))]),
          ),
        });
      }
      // Only the colours whose photo changed; the rest keep what they have.
      const changed: Keys = {};
      for (const c of order) {
        const before = values.photoKeys[values.colors.indexOf(c)];
        const after = chosen[c];
        if (after && after !== before) changed[c] = after;
      }
      return await updateProduct(productId, {
        name,
        kind,
        slug,
        priceVnd,
        material,
        fit,
        // A fixed style (slice B5) stays fixed: it sends no issue.
        dropNo: fixed ? null : Number(dropNo),
        cells: gridCells(order, values.stock, cells as Record<string, Record<string, number>>),
        colors: order,
        photos: changed,
      });
    } catch {
      return { errors: { form: catalogFailureMessage("ADD_PRODUCT", "UNAVAILABLE") } };
    }
  }

  /** `send`, as a transition: resolves with the answer once the page it re-renders is in. */
  function sendInTransition(snapshot: Photos, keys: Keys): Promise<ActionState> {
    return new Promise((resolve) => {
      startSaving(async () => {
        resolve(await send(snapshot, keys));
      });
    });
  }

  async function save() {
    if (saving || blocker !== null) return;
    const snapshot = photos;
    setBusy(true);
    try {
      let keys = await uploadAll(snapshot, []);
      if (!keys) return;
      let answer = await sendInTransition(snapshot, keys);
      // "Đặt lại dữ liệu mẫu" empties the bucket, uploads this form still
      // holds included: send those files again, once.
      const stale = staleUploads(answer.errors.form, order).filter(
        (c) => snapshot[c]?.kind === "file",
      );
      if (!answer.ok && stale.length > 0) {
        keys = await uploadAll(snapshot, stale);
        if (!keys) return;
        answer = await sendInTransition(snapshot, keys);
      }
      if (!answer.ok) {
        say(answer.errors.form ?? catalogFailureMessage("ADD_PRODUCT", "UNAVAILABLE"), "error");
        return;
      }
      say(answer.message ?? "");
      // A new style is a row of the styles table now, on its own tab: Cố
      // định, or its issue's. The zone's toast stack lives in the Arc frame,
      // which the move keeps, so the answer is still said there. An edited
      // style is this page, already re-rendered by the action's own response.
      if (mode === "new") {
        const tab = fixed ? "fixed=1" : `drop=${dropNo}`;
        startSaving(() => router.push(`/admin/products?${tab}`));
      }
    } finally {
      setUpload(null);
      setBusy(false);
    }
  }

  // ──────────────────────────────────────────────────────────────── render
  const uploading = upload !== null && upload.done.length < upload.total;
  const shownPrice = priceVnd > 0 ? `${plainVnd(priceVnd)}₫` : "chưa nhập";
  const bar = uploading ? (
    <>
      Đang tải ảnh lên… <b>{upload.index}</b> / {upload.total}
    </>
  ) : mode === "new" ? (
    <>
      Giá đang nhập: <b>{shownPrice}</b> · <b>{order.length}</b> màu · lưới <b>{total}</b> chiếc
      {tally.missing.length > 0 ? (
        <>
          {" · "}
          <b>{tally.missing.length}</b> ảnh chưa có
        </>
      ) : tally.loans.length > 0 ? (
        <>
          {" · "}
          <b>{tally.loans.length}</b> ảnh mượn tạm
        </>
      ) : null}
    </>
  ) : (
    <>
      Giá: <b>{shownPrice}</b> · còn <b>{total}</b>
      {fixed ? " chiếc" : ` / ${cutUnits ?? total} chiếc`}
      {tally.loans.length > 0 && (
        <>
          {" · "}
          <b>{tally.loans.length}</b> ảnh mượn tạm
        </>
      )}
    </>
  );

  const ready = blocker === null;
  const saveLabel = saving
    ? "Đang lưu…"
    : (blocker ?? (mode === "new" ? `Tạo mẫu · ${total} chiếc` : "Lưu thay đổi"));

  const progressOf = (c: ColorKey): "run" | "done" | null =>
    upload?.done.includes(c) ? "done" : upload?.color === c ? "run" : null;

  return (
    <div ref={rootRef} className={styles.form}>
      <div className={styles.split} inert={saving}>
        <div className={styles.column}>
          <section className={panel.panel} aria-labelledby={ids.basics}>
            <div className={panel.panelHead}>
              <h2 id={ids.basics} className={panel.panelTitle}>
                Thông tin cơ bản
              </h2>
            </div>
            <div className={styles.fields}>
              {/* An issue's style: the issue's code heads the field, fixed, on
                  the muted ground; typed around, never typed. */}
              <Input
                {...capitals}
                label="Tên mẫu"
                prefix={issue === null ? undefined : stylePrefix(issue)}
                placeholder={fixed ? "VD: ÁO THUN TRƠN" : "VD: KHÓI"}
                maxLength={MAX_PRODUCT_NAME}
                autoComplete="off"
                spellCheck={false}
                value={name}
              />
              <div className={styles.pair}>
                <Select
                  label="Loại"
                  placeholder="Chọn loại"
                  options={kindOptions}
                  value={kind}
                  onValueChange={setKind}
                />
                <Select
                  label="Form"
                  placeholder="Chọn form"
                  options={FIT_OPTIONS}
                  value={fit ?? ""}
                  onValueChange={(v) => setFit(v as Fit)}
                />
                {/* A fixed style being edited can never join an issue: its
                    issue field says so, read-only. */}
                {mode === "edit" && fixed ? (
                  <Input label={LEX.t} readOnly value={FIXED_WORD} className={styles.readOnly} />
                ) : (
                  <Select
                    label={LEX.t}
                    placeholder={`Chọn ${LEX.tl}`}
                    options={dropOptions}
                    value={dropNo}
                    onValueChange={setDropNo}
                  />
                )}
                {/* The box shows `390.000` like every other amount in the app,
                    the form keeps the integer, and `parseVnd` accepts whatever
                    shape a paste arrives in. A new style starts EMPTY, not at
                    0: nobody has decided a price yet. */}
                <Input
                  label="Giá bán (₫)"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="VD: 390.000"
                  value={moneyInput(price)}
                  onChange={(e) => setPrice(String(parseVnd(e.target.value) || ""))}
                />
              </div>
              <Input
                label={mode === "new" ? "Mã trên địa chỉ · không bắt buộc" : "Mã trên địa chỉ"}
                description={
                  mode === "new"
                    ? autoSlug
                      ? `Tự sinh từ tên nếu để trống: /products/${autoSlug}.`
                      : "Tự sinh từ tên nếu để trống."
                    : `Đổi mã thì đường dẫn cũ /products/${values.slug} không còn mở được.`
                }
                placeholder={autoSlug || undefined}
                maxLength={mode === "new" ? MAX_NEW_SLUG : MAX_SLUG}
                autoComplete="off"
                spellCheck={false}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <Textarea
                label="Chất liệu & form"
                rows={4}
                maxLength={MAX_MATERIAL}
                placeholder="Chất liệu, form dáng, cách bảo quản"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
            </div>
          </section>

          <section className={panel.panel} aria-labelledby={ids.grid}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.grid} className={panel.panelTitle}>
                  {mode === "new" && !fixed ? "Số lượng sẽ cắt" : "Tồn kho"}
                </h2>
                <p className={panel.panelSub}>
                  {mode === "new"
                    ? `tổng ${total} chiếc`
                    : fixed
                      ? `còn ${total}`
                      : `đã cắt ${cutUnits ?? total} · còn ${total}`}
                </p>
              </div>
            </div>
            {order.length === 0 ? (
              <p className={styles.quiet}>Chọn màu trước thì lưới size mới có hàng để điền.</p>
            ) : (
              <table className={stock.grid}>
                <thead>
                  <tr>
                    <th scope="col">Màu</th>
                    {SIZES.map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                    <th scope="col">Cộng</th>
                  </tr>
                </thead>
                <tbody>
                  {order.map((c) => (
                    <tr key={c}>
                      <th scope="row">
                        <span className={stock.colour}>
                          <span className={stock.swatch} style={{ background: COLORS[c].hex }} aria-hidden="true" />
                          {COLORS[c].label}
                        </span>
                      </th>
                      {SIZES.map((s) => (
                        <td key={s}>
                          <input
                            className={styles.count}
                            inputMode="numeric"
                            autoComplete="off"
                            aria-label={`${COLORS[c].label} ${s}`}
                            value={cells[c]?.[s] ?? 0}
                            onChange={(e) => setCell(c, s, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className={stock.sum}>
                        <b>{rowTotal(cells, c)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className={styles.column}>
          <section className={panel.panel} aria-labelledby={ids.photos}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.photos} className={panel.panelTitle}>
                  Màu và ảnh
                </h2>
                <p className={panel.panelSub}>{panelMeta(order, tally)}</p>
              </div>
            </div>
            {mode === "new" ? (
              <div className={styles.colorField}>
                <span className={styles.label} id={chipLabel}>
                  {fixed ? "Màu" : "Màu sẽ cắt"}
                </span>
                <div className={styles.chips} role="group" aria-labelledby={chipLabel}>
                  {COLOR_KEYS.map((c) => {
                    const place = order.indexOf(c);
                    const on = place >= 0;
                    return (
                      <button
                        key={c}
                        type="button"
                        className={styles.chip}
                        aria-pressed={on}
                        onClick={() => toggleColor(c)}
                      >
                        <span className={styles.dot} style={{ background: COLORS[c].hex }} aria-hidden="true" />
                        {COLORS[c].label}
                        {on && <span className={styles.place}>{place + 1}</span>}
                      </button>
                    );
                  })}
                </div>
                <p className={styles.help}>Thứ tự chọn là thứ tự dải màu trên thẻ; màu đầu là ảnh đại diện.</p>
              </div>
            ) : (
              <p className={styles.quiet}>{values.colors.map((c) => COLORS[c].label).join(" · ")}.</p>
            )}
            {order.length > 0 && (
              <div className={styles.rows}>
                {order.map((c, i) => (
                  <ArcPhotoRow
                    key={c}
                    color={c}
                    index={i}
                    count={order.length}
                    mode={mode}
                    photo={photos[c] ?? NONE}
                    loans={loans}
                    picking={picking === c}
                    progress={progressOf(c)}
                    onMove={(dir) => move(c, dir)}
                    onUnpick={() => unpick(c)}
                    onFile={(file) => void pickFile(c, file)}
                    onCrop={() => openCrop(c)}
                    onTogglePick={() => setPicking(picking === c ? null : c)}
                    onChooseLoan={(key) => chooseLoan(c, key)}
                    onCommitLoan={() => commitLoan(c)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* What the form holds, then the way out and the one primary button. At
          the end of the page, not stuck to the bottom: the form reads whole,
          and a floating bar over two columns covers the one it belongs to. */}
      <div className={styles.bar}>
        <p className={styles.barText}>{bar}</p>
        <ArcButtonLink variant="secondary" size="sm" href="/admin/products">
          <ArrowLeft {...ICON} />
          Huỷ
        </ArcButtonLink>
        <Button variant="primary" size="sm" disabled={!ready} loading={saving} onClick={() => void save()}>
          {ready && !saving ? <Check {...ICON} /> : null}
          {saveLabel}
        </Button>
      </div>

      <ArcCropDialog
        target={cropping}
        opening={cropOpening}
        onApply={applyCrop}
        onCancel={cancelCrop}
        onCloseAutoFocus={returnFromCrop}
      />
    </div>
  );
}

/**
 * The photos a style already has, one per colour: a real one (uploaded, or
 * shipped with the app) or a borrowed stand-in.
 */
function storedPhotos(values: ProductFormValues): Photos {
  const out: Photos = {};
  values.colors.forEach((c, i) => {
    const key = values.photoKeys[i];
    if (key) out[c] = { kind: storedPhotoKind(key), key };
  });
  return out;
}

/** The row's file photo with its upload key, only if the row still shows that file. */
function withKey(prev: Photos, color: ColorKey, src: string, key: string): Photos {
  const p = prev[color];
  return p?.kind === "file" && p.src === src ? { ...prev, [color]: { ...p, key } } : prev;
}

/** A picked file's pixel size, read the way the crop dialog will draw it; null when it is not an image. */
async function naturalSize(src: string): Promise<{ w: number; h: number } | null> {
  const img = new window.Image();
  img.src = src;
  try {
    await img.decode();
  } catch {
    return null;
  }
  return img.naturalWidth > 0 && img.naturalHeight > 0
    ? { w: img.naturalWidth, h: img.naturalHeight }
    : null;
}

/** "Ảnh quá nặng sau khi thu" → "ảnh quá nặng…", after a colon. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase("vi") + text.slice(1);
}
