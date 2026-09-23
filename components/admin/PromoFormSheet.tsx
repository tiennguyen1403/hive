"use client";

import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { Select } from "@/components/ui/Select";
import type { Promotion } from "@/data/types";
import type { PromoKind } from "@/lib/admin-sim";
import { PROMO_KIND_LABEL } from "@/lib/admin-rows";
import { clockLabel, dayMonthYear, isoDayFromInput } from "@/lib/datetime";
import { moneyInput, parseVnd, vnd } from "@/lib/money";

/** The three shapes a code can take, named the way the sheet names them. */
const KIND_OPTIONS: Array<{ value: PromoKind; label: string }> = [
  { value: "PERCENT", label: "Giảm theo phần trăm" },
  { value: "AMOUNT", label: "Giảm số tiền" },
  { value: "FREE_SHIPPING", label: "Miễn phí giao" },
];

/** `"20:00 11/09/2026"` — an instant as this form writes it. */
export function stampOf(iso: string): string {
  return `${clockLabel(iso)} ${dayMonthYear(iso)}`;
}

/**
 * The same string read back, or null while it is unfinished.
 *
 * Strict on purpose: a half-typed date that silently parsed would set a code
 * running on a day nobody chose. The hour is required because a code that
 * starts "on the 11th" starts at some particular minute, and 00:00 is a
 * guess the form would be making on the shop's behalf.
 */
export function parseStamp(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})\s+(\d{1,2}\/\d{1,2}\/\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const day = isoDayFromInput(m[3]!);
  if (!day) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return `${day}T${String(hour).padStart(2, "0")}:${m[2]}:00+07:00`;
}

export interface PromoDraft {
  code: string;
  promoKind: PromoKind;
  percent: number;
  amountVnd: number;
  maxDiscountVnd: number;
  minOrderVnd: number;
  usageLimit: number | null;
  startsAt: string;
  endsAt: string;
}

interface PromoFormSheetProps {
  open: boolean;
  /** The code being edited, or null when this is a fresh one. */
  promo: Promotion | null;
  /** What it is doing right now, and how much of its cap is spent. */
  standing?: string;
  /** Codes already in use, so a clash is refused before it is saved. */
  taken: string[];
  /** Offered in edit mode: the name and window a copy would take. */
  duplicate?: { code: string; startsAt: string; endsAt: string; label: string };
  onClose: () => void;
  onSave: (draft: PromoDraft) => void;
  onDuplicate?: (draft: PromoDraft) => void;
}

/**
 * One discount code, whole — create, edit, and the copy button.
 *
 * ONE SHEET FOR THREE JOBS, because they are three readings of the same
 * eight fields; a separate "create" dialog was how the v2 screen ended up
 * with a form that could make a code it could not then change.
 *
 * `usedCount` is never editable and never shown as a field. It is the one
 * figure on this screen that is a stored fixture value rather than something
 * derived — nothing in this build records a redemption — and a box somebody
 * could type into would turn it into a claim about sales.
 */
export function PromoFormSheet({
  open,
  promo,
  standing,
  taken,
  duplicate,
  onClose,
  onSave,
  onDuplicate,
}: PromoFormSheetProps) {
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<PromoKind>("PERCENT");
  const [percent, setPercent] = useState("10");
  const [amount, setAmount] = useState("50000");
  const [cap, setCap] = useState("150000");
  const [min, setMin] = useState("500000");
  const [limit, setLimit] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (promo) {
      setCode(String(promo.code));
      setKind(promo.kind);
      setPercent(promo.kind === "PERCENT" ? String(promo.percent) : "10");
      setAmount(promo.kind === "AMOUNT" ? String(promo.amountVnd) : "50000");
      setCap(promo.kind === "PERCENT" ? String(promo.maxDiscountVnd ?? "") : "");
      setMin(String(promo.minOrderVnd ?? ""));
      setLimit(promo.usageLimit === null ? "" : String(promo.usageLimit));
      setFrom(stampOf(promo.startsAt));
      setTo(stampOf(promo.endsAt));
    } else {
      setCode("");
      setKind("PERCENT");
      setPercent("10");
      setAmount("50000");
      setCap("150000");
      setMin("500000");
      setLimit("200");
      setFrom("");
      setTo("");
    }
  }, [open, promo]);

  const clean = code.trim().toLocaleUpperCase("vi");

  /** The draft, or an error saying which field is still wrong. */
  function draft(): PromoDraft | string {
    if (!clean) return "Nhập mã — đây là thứ khách gõ ở ô giảm giá.";
    if (clean !== String(promo?.code ?? "") && taken.includes(clean)) {
      return `Mã ${clean} đã có rồi.`;
    }
    if (kind === "PERCENT" && (Number(percent) <= 0 || Number(percent) > 100)) {
      return "Phần trăm phải nằm giữa 1 và 100.";
    }
    if (kind === "AMOUNT" && parseVnd(amount) <= 0) return "Số tiền giảm phải lớn hơn 0.";
    const start = parseStamp(from);
    const end = parseStamp(to);
    if (!start || !end) return "Nhập thời gian theo dạng 20:00 11/09/2026.";
    if (Date.parse(end) <= Date.parse(start)) return "Giờ kết thúc phải sau giờ bắt đầu.";
    return {
      code: clean,
      promoKind: kind,
      percent: Number(percent) || 0,
      amountVnd: parseVnd(amount),
      maxDiscountVnd: kind === "PERCENT" ? parseVnd(cap) : 0,
      minOrderVnd: parseVnd(min),
      usageLimit: limit.trim() === "" ? null : Number(limit.replace(/\D/g, "")),
      startsAt: start,
      endsAt: end,
    };
  }

  function submit(run: (d: PromoDraft) => void) {
    const d = draft();
    if (typeof d === "string") return setError(d);
    run(d);
  }

  return (
    <AdminSheet
      open={open}
      onClose={onClose}
      wide
      title={promo ? `Sửa mã ${promo.code}` : "Tạo mã"}
      sub={
        <>
          {standing ? `${standing} · ` : ""}đổi điều kiện chỉ áp cho đơn đặt từ lúc lưu.
          {duplicate ? ` Nhân bản thì mã mới tên ${duplicate.code}, hiệu lực theo ${duplicate.label}.` : ""}
        </>
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" onClick={onClose}>
            Huỷ
          </Button>
          {duplicate && onDuplicate && (
            <Button
              tone="ink sm"
              icon="doc"
              onClick={() =>
                submit((d) =>
                  onDuplicate({
                    ...d,
                    code: duplicate.code,
                    startsAt: duplicate.startsAt,
                    endsAt: duplicate.endsAt,
                  }),
                )
              }
            >
              Nhân bản thành {duplicate.code}
            </Button>
          )}
          <Button tone="sm" icon="check" onClick={() => submit(onSave)}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="fgrid">
        <Field3 label="Mã">
          {({ id }) => (
            <input
              id={id}
              className="inp"
              placeholder="DOT06"
              style={{ textTransform: "uppercase", letterSpacing: ".04em" }}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
            />
          )}
        </Field3>
        <Field3 label="Loại">
          {({ id }) => (
            <Select id={id} options={KIND_OPTIONS} value={kind} onChange={setKind} />
          )}
        </Field3>

        {kind === "PERCENT" && (
          <>
            <Field3 label="Giảm (%)">
              {({ id }) => (
                <input
                  id={id}
                  className="inp"
                  inputMode="numeric"
                  value={percent}
                  onChange={(e) => {
                    setPercent(e.target.value.replace(/\D/g, ""));
                    setError(null);
                  }}
                />
              )}
            </Field3>
            <Field3 label="Giảm tối đa (₫)">
              {({ id }) => (
                <input
                  id={id}
                  className="inp"
                  inputMode="numeric"
                  value={moneyInput(cap)}
                  onChange={(e) => setCap(String(parseVnd(e.target.value) || ""))}
                />
              )}
            </Field3>
          </>
        )}
        {kind === "AMOUNT" && (
          <Field3 label="Giảm (₫)">
            {({ id }) => (
              <input
                id={id}
                className="inp"
                inputMode="numeric"
                value={moneyInput(amount)}
                onChange={(e) => {
                  setAmount(String(parseVnd(e.target.value) || ""));
                  setError(null);
                }}
              />
            )}
          </Field3>
        )}

        <Field3 label="Đơn từ (₫)">
          {({ id }) => (
            <input
              id={id}
              className="inp"
              inputMode="numeric"
              value={moneyInput(min)}
              onChange={(e) => setMin(String(parseVnd(e.target.value) || ""))}
            />
          )}
        </Field3>
        <Field3 label={<>Giới hạn lượt <span className="opt">· trống = không giới hạn</span></>}>
          {({ id }) => (
            <input
              id={id}
              className="inp"
              inputMode="numeric"
              placeholder="không giới hạn"
              value={limit}
              onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
            />
          )}
        </Field3>
        <Field3 label="Bắt đầu">
          {({ id }) => (
            <input
              id={id}
              className="inp"
              placeholder="20:00 11/09/2026"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setError(null);
              }}
            />
          )}
        </Field3>
        <Field3 label="Kết thúc" error={error ?? undefined}>
          {({ id }) => (
            <input
              id={id}
              className={error ? "inp bad" : "inp"}
              placeholder="20:00 25/09/2026"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setError(null);
              }}
            />
          )}
        </Field3>
      </div>

      <p className="note3">
        <Icon name="info" className="ic sm" />
        <span>
          Khách đang thấy mã đang chạy trong mục “Mã đang chạy” của tài khoản. Đổi mã hoặc kết thúc
          sớm thì mục đó cập nhật ngay trên trình duyệt này.
        </span>
      </p>
      <p className="fine3">
        Xem trước: <b>{clean || "—"}</b>{" "}
        {kind === "PERCENT"
          ? `giảm ${percent || 0}%${parseVnd(cap) > 0 ? `, tối đa ${vnd(parseVnd(cap))}` : ""}`
          : kind === "AMOUNT"
            ? `giảm ${vnd(parseVnd(amount))}`
            : PROMO_KIND_LABEL.FREE_SHIPPING.toLocaleLowerCase("vi")}
        {parseVnd(min) > 0 ? `, cho đơn từ ${vnd(parseVnd(min))}` : ""},{" "}
        {limit.trim() === "" ? "không giới hạn lượt" : `${limit} lượt`}.
      </p>
    </AdminSheet>
  );
}
