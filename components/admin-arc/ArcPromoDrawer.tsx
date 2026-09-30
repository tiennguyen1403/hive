"use client";

import { ArrowLeft, Check, Copy } from "lucide-react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Promotion } from "@/data/types";
import { PROMO_KIND_LABEL } from "@/lib/admin-rows";
import type { PromoKind } from "@/lib/catalog-admin";
import { moneyInput, parseVnd, vnd } from "@/lib/money";
import { parseStamp, stampOf, type PromoDraft } from "@/lib/promo-form";
import { Button } from "@/registry/components/button/button";
import { Drawer, DrawerContent } from "@/registry/components/drawer/drawer";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import styles from "./ArcPromoDrawer.module.css";

/** The three shapes a code can take, named the way the form names them (v3). */
const KIND_OPTIONS: Array<{ value: PromoKind; label: string }> = [
  { value: "PERCENT", label: "Giảm theo phần trăm" },
  { value: "AMOUNT", label: "Giảm số tiền" },
  { value: "FREE_SHIPPING", label: "Miễn phí giao" },
];

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** The fields a check reads, and what is wrong with each. */
type Problems = Partial<Record<"code" | "percent" | "amount" | "from" | "to", string>>;

/** The name and window a copy of a code would take. */
export interface PromoCopy {
  code: string;
  startsAt: string;
  endsAt: string;
  /** "số 06", or "cùng khoảng thời gian". */
  label: string;
}

interface ArcPromoDrawerProps {
  open: boolean;
  /** The save is on its way to the server. */
  pending: boolean;
  /** The code being edited, or null when this is a fresh one. */
  promo: Promotion | null;
  /** What it is doing right now, and how much of its cap is spent. */
  standing?: string;
  /** Codes already in use, so a clash is refused before it is saved. */
  taken: string[];
  /** Offered when editing: the name and window a copy would take. */
  duplicate?: PromoCopy;
  /** Where focus goes back to when the drawer shuts: the button or the row menu that opened it. */
  opener: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSave: (draft: PromoDraft) => void;
  onDuplicate?: (draft: PromoDraft) => void;
}

/**
 * One discount code, whole: create, edit, and the copy button. v3's
 * `PromoFormSheet` (`components/admin/PromoFormSheet.tsx`) rule for rule and
 * word for word, in an Arc `Drawer` from the right (brief v5 slice 3, §2: a
 * form too long for a dialog that should not leave the list), 680px wide as
 * v3's wide sheet.
 *
 * ONE FORM FOR THREE JOBS, because they are three readings of the same eight
 * fields. `usedCount` is never a field: it is what the code has already done,
 * and a box somebody could type into would turn it into a claim about sales.
 * The code itself is read-only when editing: orders carry the code they were
 * placed with, so a renamed code would be a different code wearing an old
 * one's history; "Nhân bản" is how a new code is made from an old one.
 *
 * Focus goes in to the drawer when it opens and back to what opened it when
 * it shuts (Radix returns it only to a `DrawerTrigger`, and this drawer is
 * opened from a button and from row menus). While the save is on its way the
 * drawer cannot be closed and "Lưu" shows Arc's spinner with "Đang lưu…".
 */
export function ArcPromoDrawer({
  open,
  pending,
  promo,
  standing,
  taken,
  duplicate,
  opener,
  onClose,
  onSave,
  onDuplicate,
}: ArcPromoDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DrawerContent
        className={styles.drawer}
        title={promo ? `Sửa mã ${promo.code}` : "Tạo mã"}
        // Opening the sentence on a new code, the verb takes the capital
        // (v3 slice 13); after the standing it stays lower case.
        description={`${standing ? `${standing} · đổi` : "Đổi"} điều kiện chỉ áp cho đơn đặt từ lúc lưu.${
          duplicate ? ` Nhân bản thì mã mới tên ${duplicate.code}, hiệu lực theo ${duplicate.label}.` : ""
        }`}
        onCloseAutoFocus={(event) => {
          const back = opener.current;
          if (!back?.isConnected) return;
          event.preventDefault();
          back.focus();
        }}
      >
        <PromoForm
          promo={promo}
          taken={taken}
          duplicate={duplicate}
          pending={pending}
          onCancel={onClose}
          onSave={onSave}
          onDuplicate={onDuplicate}
        />
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The fields and the three buttons. Mounted each time the drawer opens, so it
 * starts from the code being edited, or from v3's starting values for a new
 * one, without an effect to reset it.
 */
function PromoForm({
  promo,
  taken,
  duplicate,
  pending,
  onCancel,
  onSave,
  onDuplicate,
}: {
  promo: Promotion | null;
  taken: string[];
  duplicate?: PromoCopy;
  pending: boolean;
  onCancel: () => void;
  onSave: (draft: PromoDraft) => void;
  onDuplicate?: (draft: PromoDraft) => void;
}) {
  const [code, setCode] = useState(promo ? String(promo.code) : "");
  const [kind, setKind] = useState<PromoKind>(promo ? promo.kind : "PERCENT");
  const [percent, setPercent] = useState(promo?.kind === "PERCENT" ? String(promo.percent) : "10");
  const [amount, setAmount] = useState(promo?.kind === "AMOUNT" ? String(promo.amountVnd) : "50000");
  const [cap, setCap] = useState(
    promo ? (promo.kind === "PERCENT" ? String(promo.maxDiscountVnd ?? "") : "") : "150000",
  );
  const [min, setMin] = useState(promo ? String(promo.minOrderVnd ?? "") : "500000");
  const [limit, setLimit] = useState(
    promo ? (promo.usageLimit === null ? "" : String(promo.usageLimit)) : "200",
  );
  const [from, setFrom] = useState(promo ? stampOf(promo.startsAt) : "");
  const [to, setTo] = useState(promo ? stampOf(promo.endsAt) : "");
  const [problems, setProblems] = useState<Problems>({});

  const clean = code.trim().toLocaleUpperCase("vi");

  /**
   * The draft, or what is still wrong and in which field, in v3's words and
   * in v3's order: the first check that fails is the one said. Each sentence
   * lands under the field it is about (Arc: errors are tied to their field),
   * where v3's sheet said them all under "Kết thúc". A time that does not
   * read is said under each box that does not read.
   */
  function check(): { ok: true; draft: PromoDraft } | { ok: false; problems: Problems } {
    const refuse = (found: Problems) => ({ ok: false as const, problems: found });
    if (!clean) return refuse({ code: "Nhập mã — đây là thứ khách gõ ở ô giảm giá." });
    if (clean !== String(promo?.code ?? "") && taken.includes(clean)) {
      return refuse({ code: `Mã ${clean} đã có rồi.` });
    }
    if (kind === "PERCENT" && (Number(percent) <= 0 || Number(percent) > 100)) {
      return refuse({ percent: "Phần trăm phải nằm giữa 1 và 100." });
    }
    if (kind === "AMOUNT" && parseVnd(amount) <= 0) {
      return refuse({ amount: "Số tiền giảm phải lớn hơn 0." });
    }
    const start = parseStamp(from);
    const end = parseStamp(to);
    if (!start || !end) {
      const format = "Nhập thời gian theo dạng 20:00 11/09/2026.";
      return refuse({ ...(start ? {} : { from: format }), ...(end ? {} : { to: format }) });
    }
    if (Date.parse(end) <= Date.parse(start)) {
      return refuse({ to: "Giờ kết thúc phải sau giờ bắt đầu." });
    }
    return {
      ok: true,
      draft: {
        code: clean,
        promoKind: kind,
        percent: Number(percent) || 0,
        amountVnd: parseVnd(amount),
        maxDiscountVnd: kind === "PERCENT" ? parseVnd(cap) : 0,
        minOrderVnd: parseVnd(min),
        usageLimit: limit.trim() === "" ? null : Number(limit.replace(/\D/g, "")),
        startsAt: start,
        endsAt: end,
      },
    };
  }

  function submit(run: (d: PromoDraft) => void) {
    const result = check();
    if (!result.ok) return setProblems(result.problems);
    setProblems({});
    run(result.draft);
  }

  /** As in v3, typing in any field a check reads clears what was said. */
  const clear = () => setProblems({});

  /**
   * A code is written in capitals, as checkout reads it and as the table
   * prints it: v3 drew the box in capitals, and here the value itself is, so
   * no text transform is needed. Not while an input method is still
   * composing a character; the finished character is raised when it lands.
   * Raising the value makes React rewrite the box, which would throw the
   * caret to the end: it is put back where it was.
   */
  const codeBox = useRef<HTMLInputElement>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  function typeCode(box: HTMLInputElement, composing: boolean) {
    const value = composing ? box.value : box.value.toLocaleUpperCase("vi");
    if (value !== box.value) {
      caret.current = { start: box.selectionStart ?? value.length, end: box.selectionEnd ?? value.length };
    }
    setCode(value);
    clear();
  }
  useLayoutEffect(() => {
    const box = codeBox.current;
    if (!box || !caret.current) return;
    box.setSelectionRange(caret.current.start, caret.current.end);
    caret.current = null;
  }, [code]);

  return (
    <div className={styles.form}>
      <div className={styles.fields}>
        <Input
          ref={codeBox}
          label="Mã"
          placeholder="DOT06"
          autoComplete="off"
          spellCheck={false}
          value={code}
          readOnly={promo !== null}
          className={promo ? styles.readOnly : undefined}
          description={promo ? "Mã không đổi được sau khi tạo — dùng Nhân bản để có mã mới." : undefined}
          error={problems.code}
          onChange={(e) => typeCode(e.target, (e.nativeEvent as InputEvent).isComposing)}
          onCompositionEnd={(e) => typeCode(e.currentTarget, false)}
        />
        {/* Another kind draws other fields: what was said about the old ones goes with them. */}
        <Select
          label="Loại"
          options={KIND_OPTIONS}
          value={kind}
          onValueChange={(v) => {
            setKind(v as PromoKind);
            clear();
          }}
        />

        {kind === "PERCENT" && (
          <>
            <Input
              label="Giảm (%)"
              inputMode="numeric"
              value={percent}
              error={problems.percent}
              onChange={(e) => {
                setPercent(e.target.value.replace(/\D/g, ""));
                clear();
              }}
            />
            <Input
              label="Giảm tối đa (₫)"
              inputMode="numeric"
              value={moneyInput(cap)}
              onChange={(e) => setCap(String(parseVnd(e.target.value) || ""))}
            />
          </>
        )}
        {kind === "AMOUNT" && (
          <Input
            label="Giảm (₫)"
            inputMode="numeric"
            value={moneyInput(amount)}
            error={problems.amount}
            onChange={(e) => {
              setAmount(String(parseVnd(e.target.value) || ""));
              clear();
            }}
          />
        )}

        <Input
          label="Đơn từ (₫)"
          inputMode="numeric"
          value={moneyInput(min)}
          onChange={(e) => setMin(String(parseVnd(e.target.value) || ""))}
        />
        <Input
          label="Giới hạn lượt · trống = không giới hạn"
          inputMode="numeric"
          placeholder="không giới hạn"
          value={limit}
          onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
        />
        <Input
          label="Bắt đầu"
          placeholder="20:00 11/09/2026"
          autoComplete="off"
          value={from}
          error={problems.from}
          onChange={(e) => {
            setFrom(e.target.value);
            clear();
          }}
        />
        <Input
          label="Kết thúc"
          placeholder="20:00 25/09/2026"
          autoComplete="off"
          value={to}
          error={problems.to}
          onChange={(e) => {
            setTo(e.target.value);
            clear();
          }}
        />
      </div>

      <p className={styles.preview}>
        Xem trước: <b>{clean || "—"}</b>{" "}
        {kind === "PERCENT"
          ? `giảm ${percent || 0}%${parseVnd(cap) > 0 ? `, tối đa ${vnd(parseVnd(cap))}` : ""}`
          : kind === "AMOUNT"
            ? `giảm ${vnd(parseVnd(amount))}`
            : PROMO_KIND_LABEL.FREE_SHIPPING.toLocaleLowerCase("vi")}
        {parseVnd(min) > 0 ? `, cho đơn từ ${vnd(parseVnd(min))}` : ""},{" "}
        {limit.trim() === "" ? "không giới hạn lượt" : `${limit} lượt`}.
      </p>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          Huỷ
        </Button>
        {duplicate && onDuplicate && (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
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
            {pending ? null : <Copy {...ICON} />}
            Nhân bản thành {duplicate.code}
          </Button>
        )}
        <Button variant="primary" size="sm" loading={pending} onClick={() => submit(onSave)}>
          {pending ? null : <Check {...ICON} />}
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>
    </div>
  );
}
