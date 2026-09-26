"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { CropSheet, type CropTarget } from "@/components/admin/CropSheet";
import {
  ProductPhotoSlot,
  type FilePhoto,
  type SlotPhoto,
} from "@/components/admin/ProductPhotoSlot";
import { useCatalog } from "@/components/shop/CatalogContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select, type SelectOption } from "@/components/ui/Select";
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

export interface ProductFormValues {
  name: string;
  kind: string;
  /** Null for a new style: nobody has chosen one yet. */
  fit: Fit | null;
  slug: string;
  priceVnd: number;
  /**
   * The issue. For a new style, null when no issue can take one (every one
   * has closed) — "Cố định" is still there to pick; for a style being
   * edited, null is a FIXED style (slice B5).
   */
  dropNo: number | null;
  material: string;
  /** Band order — the order the shop's card draws the colour dots in. */
  colors: ColorKey[];
  /** `stock[color][size]`: pieces on the shelf. Empty for a new style. */
  stock: Record<string, Record<string, number>>;
  /** One photo per colour, in `colors` order — borrowed keys or uploads. */
  photoKeys: string[];
}

interface ProductFormProps {
  mode: "new" | "edit";
  /** The style being edited — what the save is keyed on. Absent for a new one. */
  productId?: string;
  values: ProductFormValues;
  kindOptions: SelectOption[];
  dropOptions: SelectOption[];
  /**
   * Units the issue cut, for the heading line. A plain number, because
   * per-size sales are not recorded anywhere — deriving them would mean
   * apportioning a total nobody measured.
   */
  cutUnits?: number;
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
 * Add or edit a style — v3 slice 7 (`prototype/v3/admin-product-new.html`,
 * `admin-product-edit.html`, rounds 7 and 7b, approved 24/09; QĐ-27).
 *
 * NEW: the colours are chosen here, as seven chips, and the order they are
 * picked in IS the band order on the shop's card (a chosen chip carries its
 * place; the first colour is the cover photo). Each colour gets a row in the
 * cut grid and a row in "Màu và ảnh" with one 4:5 photo — a file picked or
 * dropped on this device and cropped in the sheet, or a borrowed stand-in,
 * which stays labelled "mượn tạm" (PRODUCT.md). The save button says what is
 * still missing until nothing is (`newStyleBlocker`), then "Tạo mẫu · 36
 * chiếc".
 *
 * EDIT: the colours were fixed when the cloth was cut (QĐ-27), so there are
 * no chips and no ✕ — only the band order (↑ ↓) and the photos change. The
 * grid is the shelf, saved as an adjustment with the reason "Sửa mẫu"
 * (slice B3b), and "Lưu thay đổi" is always there: an unchanged form comes
 * back from the server as "Chưa có thay đổi nào để lưu."
 *
 * TWO KINDS OF STYLE (v3 slice 12, the fixed-styles board, round 4, approved
 * 25/09/2026). The issue menu of a new style ends with "Cố định", a style of
 * no issue; an issue's style shows the issue's code as a fixed segment at the
 * head of the name field ("S06 –", `stylePrefix`), following the issue
 * picked. Picking "Cố định" drops the segment, and the grid is "Tồn kho" and
 * the colours "Màu": a fixed style is never cut. A fixed style being edited
 * shows "Cố định" in a read-only issue field — it can never join an issue.
 * No sentence on the form explains either kind: the user's call.
 *
 * SAVING, in the order the brief fixes: every picked file is cropped and
 * shrunk in this browser (`lib/photo-encode.ts`) and uploaded one at a time
 * (`uploadProductPhoto`), the bar counting "Đang tải ảnh lên… 1 / 2" and a
 * honey line running under the photo in flight. The key each upload gets is
 * kept on its row, so a save the server refuses — a taken address, say —
 * sends the same keys again instead of the files. Then `createProduct` (and
 * the products table) or `updateProduct` (and this page, re-rendered with
 * what the database now holds: the edit page keys this form on its values).
 * Every answer is said in the toast in the server's own words.
 *
 * While a save is in flight the form is `inert`: what is being sent cannot
 * change under it.
 */
export function ProductForm({
  mode,
  productId,
  values,
  kindOptions,
  dropOptions,
  cutUnits,
}: ProductFormProps) {
  const say = useAdminToast();
  const router = useRouter();
  const catalog = useCatalog();
  const chipLabel = useId();

  const [name, setName] = useState(values.name);
  const [kind, setKind] = useState(values.kind);
  const [fit, setFit] = useState<Fit | null>(values.fit);
  const [slug, setSlug] = useState(values.slug);
  const [price, setPrice] = useState(moneyInitial(values.priceVnd));
  const [dropNo, setDropNo] = useState(values.dropNo === null ? "" : String(values.dropNo));
  // A FIXED style (slice B5): being made — "Cố định" picked in the issue menu
  // (v3 slice 12) — or being edited. It belongs to no issue and never will
  // (`admin_update_product` refuses the crossing), and it has no cut.
  const fixed = mode === "edit" ? values.dropNo === null : dropNo === FIXED_CHOICE;
  // The issue whose code heads the name field: the one picked, if any.
  const issue = !fixed && dropNo !== "" ? Number(dropNo) : null;
  const prefixId = useId();
  const [material, setMaterial] = useState(values.material);
  const [order, setOrder] = useState<ColorKey[]>(values.colors);
  const [cells, setCells] = useState<CellGrid>(values.stock as CellGrid);
  const [photos, setPhotos] = useState<Photos>(() => storedPhotos(values));
  const [picking, setPicking] = useState<ColorKey | null>(null);
  const [cropping, setCropping] = useState<CropTarget | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  // Two flags, because a save has two halves. The uploads run as plain async
  // work, so every step of "Đang tải ảnh lên… 1 / 2" renders the moment it
  // happens — set inside a transition, the first one would be held back
  // until the whole save had finished. The action that writes the style, and
  // the move to the products table, run as transitions (`02-guides/
  // server-actions.md`: invoke from an event handler wrapped in
  // `startTransition`), so the page they re-render arrives as one update.
  const [busy, setBusy] = useState(false);
  const [pending, startSaving] = useTransition();
  const saving = busy || pending;

  const rootRef = useRef<HTMLDivElement>(null);
  // Focus to restore after the next commit: the same arrow after a move, the
  // row's "Khung cắt" after a crop (the control that opened it is gone).
  const focusNext = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const f = focusNext.current;
    focusNext.current = null;
    f?.();
  });

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
      // A file still in the crop sheet, never applied.
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
  // What an empty address box becomes — the action's own rule (`slugFor`:
  // the issue's code in front for an issue's style), so the placeholder is
  // the address the style will really get.
  const autoSlug =
    mode === "new" && name.trim() !== "" ? uniqueSlug(slugFor(name, issue), catalog) : "";

  // ─────────────────────────────────────────────────────────── the colours
  function toggleColor(color: ColorKey) {
    if (order.includes(color)) unpick(color);
    else setOrder([...order, color]);
  }

  /** A colour dropped (chip or ✕): its typed pieces and its photo go with it. */
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
   * tidies when it knows). Best effort — "Đặt lại dữ liệu mẫu" clears the rest.
   */
  function forget(key: string) {
    removeUploadedPhoto(key).catch(() => undefined);
  }

  /** A file picked or dropped: checked, measured, then straight into the crop sheet. */
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
    setCropping({
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
    setCropping({ color, file: p.file, name: p.name, bytes: p.bytes, src: p.src, nw: p.nw, nh: p.nh, crop: p.crop, fresh: false });
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
    focusNext.current = () =>
      rootRef.current?.querySelector<HTMLElement>(`[data-crop="${t.color}"]`)?.focus();
  }

  /** "Huỷ", Escape or the scrim: the row keeps what it had; a file just picked is dropped. */
  function cancelCrop() {
    if (cropping?.fresh) URL.revokeObjectURL(cropping.src);
    setCropping(null);
  }

  function pickLoan(color: ColorKey, key: string) {
    discard(photos[color]);
    setPhotos({ ...photos, [color]: { kind: "loan", key } });
    setPicking(null);
  }

  // ──────────────────────────────────────────────────────────────── saving
  /**
   * Upload every picked file that has no key yet — and those in `again`,
   * whose key the server no longer knows — one at a time, in band order.
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
      // A refusal of the encoder has its own words; anything else — the
      // request never answered, a body over the limit — is "không tải được".
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
      // A new style is a row of the products table now — on its own tab: Cố
      // định, or its issue's; an edited one is this page, already re-rendered
      // by the action's own response.
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

  const saveLabel = saving
    ? "Đang lưu…"
    : (blocker ?? (mode === "new" ? `Tạo mẫu · ${total} chiếc` : "Lưu thay đổi"));

  const progressOf = (c: ColorKey): "run" | "done" | null =>
    upload?.done.includes(c) ? "done" : upload?.color === c ? "run" : null;

  return (
    <div ref={rootRef}>
      <div className="split3" style={{ marginTop: 0 }} inert={saving}>
        <div>
          <section className="panel3">
            <h2>Thông tin cơ bản</h2>
            <div className="bd">
              <Field3 label="Tên mẫu">
                {({ id }) => {
                  const input = (
                    <input
                      id={id}
                      className="inp"
                      placeholder={fixed ? "VD: ÁO THUN TRƠN" : "VD: KHÓI"}
                      maxLength={MAX_PRODUCT_NAME}
                      style={{ textTransform: "uppercase" }}
                      aria-describedby={issue === null ? undefined : prefixId}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  );
                  // An issue's style: the issue's code heads the field, fixed,
                  // on the plate — typed around, never typed.
                  return issue === null ? (
                    input
                  ) : (
                    <span className="pfxin">
                      <span className="pfx" id={prefixId}>
                        {stylePrefix(issue)}
                      </span>
                      {input}
                    </span>
                  );
                }}
              </Field3>
              <div className="fgrid" style={{ marginTop: 14 }}>
                <Field3 label="Loại">
                  {({ id }) => (
                    <Select
                      id={id}
                      options={kindOptions}
                      value={kind || null}
                      onChange={setKind}
                      placeholder="Chọn loại"
                    />
                  )}
                </Field3>
                <Field3 label="Form">
                  {({ id }) => (
                    <Select
                      id={id}
                      options={FIT_OPTIONS}
                      value={fit}
                      onChange={setFit}
                      placeholder="Chọn form"
                    />
                  )}
                </Field3>
                {/* A fixed style being edited can never join an issue: its
                    issue field says so, read-only. */}
                {mode === "edit" && fixed ? (
                  <Field3 label={LEX.t}>
                    {({ id }) => <input id={id} className="inp" readOnly value={FIXED_WORD} />}
                  </Field3>
                ) : (
                  <Field3 label={LEX.t}>
                    {({ id }) => (
                      <Select
                        id={id}
                        options={dropOptions}
                        value={dropNo || null}
                        onChange={setDropNo}
                        placeholder={`Chọn ${LEX.tl}`}
                      />
                    )}
                  </Field3>
                )}
                {/* The box shows `390.000` like every other amount in the
                    app, the form keeps the integer, and `parseVnd` accepts
                    whatever shape a paste arrives in. A new style starts
                    EMPTY, not at 0: nobody has decided a price yet, and a
                    zero sitting in the box is a figure the screen made up. */}
                <Field3 label="Giá bán (₫)">
                  {({ id }) => (
                    <input
                      id={id}
                      className="inp"
                      inputMode="numeric"
                      placeholder="VD: 390.000"
                      value={moneyInput(price)}
                      onChange={(e) => setPrice(String(parseVnd(e.target.value) || ""))}
                    />
                  )}
                </Field3>
              </div>
              <Field3
                label={
                  mode === "new" ? (
                    <>
                      Mã trên địa chỉ <span className="opt">· không bắt buộc</span>
                    </>
                  ) : (
                    "Mã trên địa chỉ"
                  )
                }
                help={
                  mode === "new"
                    ? autoSlug
                      ? `Tự sinh từ tên nếu để trống: /products/${autoSlug}.`
                      : "Tự sinh từ tên nếu để trống."
                    : `Đổi mã thì đường dẫn cũ /products/${values.slug} không còn mở được.`
                }
              >
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    className="inp"
                    aria-describedby={describedBy}
                    placeholder={autoSlug || undefined}
                    maxLength={mode === "new" ? MAX_NEW_SLUG : MAX_SLUG}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                )}
              </Field3>
              <Field3 label="Chất liệu & form">
                {({ id }) => (
                  <textarea
                    id={id}
                    className="inp area"
                    rows={4}
                    maxLength={MAX_MATERIAL}
                    placeholder="Chất liệu, form dáng, cách bảo quản"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                )}
              </Field3>
            </div>
          </section>

          <section className="panel3">
            <h2>
              {mode === "new" && !fixed ? "Số lượng sẽ cắt" : "Tồn kho"}
              <span className="meta">
                {mode === "new"
                  ? `tổng ${total} chiếc`
                  : fixed
                    ? `còn ${total}`
                    : `đã cắt ${cutUnits ?? total} · còn ${total}`}
              </span>
            </h2>
            <div className="bd">
              {order.length === 0 ? (
                <p className="fine3" style={{ marginTop: 0 }}>
                  Chọn màu trước thì lưới size mới có hàng để điền.
                </p>
              ) : (
                <table className="invgrid cutgrid">
                  <thead>
                    <tr>
                      <th>Màu</th>
                      {SIZES.map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                      <th>Cộng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.map((c) => (
                      <tr key={c}>
                        <td>
                          <i className="swatch" style={{ background: COLORS[c].hex }} aria-hidden="true" />
                          {COLORS[c].label}
                        </td>
                        {SIZES.map((s) => (
                          <td key={s}>
                            <span className="cell">
                              <input
                                inputMode="numeric"
                                aria-label={`${COLORS[c].label} ${s}`}
                                value={cells[c]?.[s] ?? 0}
                                onChange={(e) => setCell(c, s, e.target.value)}
                              />
                            </span>
                          </td>
                        ))}
                        <td>
                          <b>{rowTotal(cells, c)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        <div>
          <section className="panel3">
            <h2>
              Màu và ảnh<span className="meta">{panelMeta(order, tally)}</span>
            </h2>
            <div className="bd">
              {mode === "new" ? (
                <div className="field3">
                  <span className="lbl" id={chipLabel}>
                    {fixed ? "Màu" : "Màu sẽ cắt"}
                  </span>
                  <div className="colorpick" role="group" aria-labelledby={chipLabel}>
                    {COLOR_KEYS.map((c) => {
                      const place = order.indexOf(c);
                      const on = place >= 0;
                      return (
                        <button
                          key={c}
                          type="button"
                          className={on ? "chip3 on" : "chip3"}
                          aria-pressed={on}
                          onClick={() => toggleColor(c)}
                        >
                          <i className="dot" style={{ background: COLORS[c].hex }} aria-hidden="true" />
                          {COLORS[c].label}
                          {on && <span className="pos">{place + 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="help">
                    Thứ tự chọn là thứ tự dải màu trên thẻ; màu đầu là ảnh đại diện.
                  </p>
                </div>
              ) : (
                <p className="fine3" style={{ marginTop: 0 }}>
                  {values.colors.map((c) => COLORS[c].label).join(" · ")}.
                </p>
              )}
              <div className="cslots">
                {order.map((c, i) => (
                  <ProductPhotoSlot
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
                    onPickLoan={(key) => pickLoan(c, key)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="formbar3">
        <span>{bar}</span>
        <ButtonLink tone="ink sm" icon="back" href="/admin/products">
          Huỷ
        </ButtonLink>
        <Button
          tone="sm"
          {...(saving || blocker !== null ? {} : { icon: "check" as const })}
          disabled={saving || blocker !== null}
          onClick={() => void save()}
        >
          {saveLabel}
        </Button>
      </div>

      <CropSheet target={cropping} onApply={applyCrop} onCancel={cancelCrop} />
    </div>
  );
}

/**
 * The photos a style already has, one per colour: a real one — uploaded
 * (B3c) or shipped with the app (v3 slice 14) — or a borrowed stand-in.
 */
function storedPhotos(values: ProductFormValues): Photos {
  const out: Photos = {};
  values.colors.forEach((c, i) => {
    const key = values.photoKeys[i];
    if (key) out[c] = { kind: storedPhotoKind(key), key };
  });
  return out;
}

/** The row's file photo with its upload key — only if the row still shows that file. */
function withKey(prev: Photos, color: ColorKey, src: string, key: string): Photos {
  const p = prev[color];
  return p?.kind === "file" && p.src === src ? { ...prev, [color]: { ...p, key } } : prev;
}

/** A picked file's pixel size, read the way the crop sheet will draw it; null when it is not an image. */
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
