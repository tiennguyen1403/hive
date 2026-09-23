"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select } from "@/components/ui/Select";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Catalog } from "@/lib/catalog";
import { FAMILIES, FAMILY_LABELS, type Family } from "@/data/types";
import type { SimActionInput } from "@/components/admin/SimContext";
import { LEX, issueNo } from "@/lib/lexicon";
import { photoUrl } from "@/lib/photos";

/** The kinds the catalogue actually uses, so the menu cannot invent one. */
function kindOptions(catalog: Catalog) {
  const seen = new Map<string, Family>();
  for (const p of catalog.products) seen.set(p.kind, p.family);
  return [...seen].sort((a, b) => a[0].localeCompare(b[0], "vi")).map(([kind, family]) => ({
    value: kind,
    label: kind,
    note: FAMILY_LABELS[family],
  }));
}

/**
 * The photos this build can offer — the ones the catalogue already borrows.
 *
 * PRODUCT.md records that there is no product photography at all, so an
 * upload box would be a control with nowhere to put a file. Choosing from
 * the borrowed set is the honest version of the same decision, and the sheet
 * says which set it is.
 */
function photoKeys(catalog: Catalog): string[] {
  return [...new Set(catalog.products.flatMap((p) => p.photoKeys))];
}

/**
 * "Thêm mẫu hé lộ" — a name, a kind and a picture, and nothing else.
 *
 * No price and no cut: both are published at the hour the issue opens, and a
 * form that asked for them would collect numbers the shop has not decided
 * (`Teaser` in `data/types.ts` refuses to carry them for the same reason).
 *
 * What it adds lives in the back office only. The shop front reads the
 * fixtures (DESIGN.md §8), so the sheet says where the new row will and will
 * not appear rather than letting somebody find out later.
 */
export function TeaserFormSheet({
  open,
  no,
  onClose,
  onConfirm,
}: {
  open: boolean;
  no: number;
  onClose: () => void;
  onConfirm: (action: Extract<SimActionInput, { kind: "TEASER_ADDED" }>) => void;
}) {
  const catalog = useCatalog();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setKind(null);
    setPhoto(null);
    setError(null);
  }, [open]);

  const kinds = kindOptions(catalog);
  const clean = name.trim().toLocaleUpperCase("vi");
  const ready = clean !== "" && kind !== null && photo !== null;
  /** The first thing still missing, so the button can name it. */
  const blocker = !clean ? "Nhập tên mẫu" : !kind ? "Chọn loại" : !photo ? "Chọn ảnh" : null;

  return (
    <AdminSheet
      open={open}
      onClose={onClose}
      title={`Thêm mẫu hé lộ cho ${LEX.tl} ${issueNo(no)}`}
      sub={
        <>
          Chỉ tên, loại và ảnh. Không giá, không số cắt: hai thứ đó công bố đúng lúc mở. Mẫu thêm ở
          đây hiện trong quản trị; trang chủ của khách đọc dữ liệu mẫu.
        </>
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            tone="sm"
            {...(ready ? { icon: "plus" as const } : {})}
            disabled={!ready}
            onClick={() => {
              if (!clean) return setError("Nhập tên mẫu.");
              if (!kind) return setError("Chọn loại.");
              if (!photo) return setError("Chọn một ảnh.");
              onConfirm({
                kind: "TEASER_ADDED",
                no,
                name: clean,
                garment: kind,
                family: familyOf(catalog, kind),
                photoKey: photo,
              });
            }}
          >
            {blocker ?? "Thêm"}
          </Button>
        </>
      }
    >
      <Field3 label="Tên mẫu" error={error && !clean ? error : undefined}>
        {({ id }) => (
          <input
            id={id}
            className="inp"
            placeholder="VIẾT HOA, một từ"
            style={{ textTransform: "uppercase" }}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        )}
      </Field3>
      <Field3 label="Loại" error={error && clean && !kind ? error : undefined}>
        {({ id }) => (
          <Select
            id={id}
            options={kinds}
            value={kind}
            placeholder="Chọn loại"
            onChange={(v) => {
              setKind(v);
              setError(null);
            }}
          />
        )}
      </Field3>
      <Field3
        label="Ảnh"
        help="Chưa có ảnh sản phẩm thật, nên đây là bộ ảnh mượn tạm các mẫu đang dùng."
        error={error && clean && kind && !photo ? error : undefined}
      >
        {() => (
          <div className="photopick" role="radiogroup" aria-label="Ảnh">
            {photoKeys(catalog).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={photo === k}
                aria-label={`Ảnh ${k}`}
                className={photo === k ? "on" : undefined}
                onClick={() => {
                  setPhoto(k);
                  setError(null);
                }}
              >
                <Image src={photoUrl(k, 120)} alt="" width={44} height={55} />
              </button>
            ))}
          </div>
        )}
      </Field3>
    </AdminSheet>
  );
}

/** The family a kind belongs to, read off the catalogue rather than typed. */
function familyOf(catalog: Catalog, kind: string): Family {
  return catalog.products.find((p) => p.kind === kind)?.family ?? FAMILIES[0];
}
