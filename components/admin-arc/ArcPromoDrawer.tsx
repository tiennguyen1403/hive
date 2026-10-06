"use client";

import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState, type ReactNode, type RefObject } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { Promotion } from "@/data/types";
import { PROMO_KIND_LABEL } from "@/lib/admin-rows";
import type { PromoKind } from "@/lib/catalog-admin";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { moneyInput, parseVnd, vnd } from "@/lib/money";
import { parseStamp, stampOf, type PromoDraft } from "@/lib/promo-form";
import { Button } from "@/registry/components/button/button";
import { Drawer, DrawerContent } from "@/registry/components/drawer/drawer";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import styles from "./ArcPromoDrawer.module.css";
import { keepOpenForToasts } from "./arc-toasts";
import { useCapitals } from "./useCapitals";

/** The three shapes a code can take, named the way the form names them (v3). */
const KIND_OPTIONS: Array<{ value: PromoKind; label: Pair }> = [
  { value: "PERCENT", label: { vi: "Giảm theo phần trăm", en: "Percentage off" } },
  { value: "AMOUNT", label: { vi: "Giảm số tiền", en: "Amount off" } },
  { value: "FREE_SHIPPING", label: { vi: "Miễn phí giao", en: "Free delivery" } },
];

/** The menu's rows in the page's language (round v6 slice E5). */
const kindOptions = (locale: Locale) => KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label[locale] }));

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** The fields a check reads, and what is wrong with each. */
/**
 * What is wrong, by field, in both languages: kept as pairs and said at render,
 * so a switch of language rewords a sentence already under a field (round v6
 * slice E5, the lookup's rule of slice E2).
 */
type Problems = Partial<Record<"code" | "percent" | "amount" | "from" | "to", Pair>>;

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
  const t = picker(useLocale());
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DrawerContent
        onInteractOutside={keepOpenForToasts}
        className={styles.drawer}
        title={promo ? t({ vi: `Sửa mã ${promo.code}`, en: `Edit code ${promo.code}` }) : t({ vi: "Tạo mã", en: "Create code" })}
        // Opening the sentence on a new code, the verb takes the capital
        // (v3 slice 13); after the standing it stays lower case.
        description={t({
          vi: `${standing ? `${standing} · đổi` : "Đổi"} điều kiện chỉ áp cho đơn đặt từ lúc lưu.${
            duplicate ? ` Nhân bản thì mã mới tên ${duplicate.code}, hiệu lực theo ${duplicate.label}.` : ""
          }`,
          en: `${standing ? `${standing} · changes` : "Changes"} to the terms apply to orders placed after saving.${
            duplicate ? ` A duplicate is named ${duplicate.code} and runs for ${duplicate.label}.` : ""
          }`,
        })}
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
  const locale = useLocale();
  const t = picker(locale);
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
    if (!clean) {
      return refuse({
        code: {
          vi: "Nhập mã — đây là thứ khách gõ ở ô giảm giá.",
          en: "Enter the code. It's what shoppers type in the discount box.",
        },
      });
    }
    if (clean !== String(promo?.code ?? "") && taken.includes(clean)) {
      return refuse({ code: { vi: `Mã ${clean} đã có rồi.`, en: `Code ${clean} already exists.` } });
    }
    if (kind === "PERCENT" && (Number(percent) <= 0 || Number(percent) > 100)) {
      return refuse({
        percent: { vi: "Phần trăm phải nằm giữa 1 và 100.", en: "The percentage must be between 1 and 100." },
      });
    }
    if (kind === "AMOUNT" && parseVnd(amount) <= 0) {
      return refuse({ amount: { vi: "Số tiền giảm phải lớn hơn 0.", en: "The discount must be more than 0." } });
    }
    const start = parseStamp(from);
    const end = parseStamp(to);
    if (!start || !end) {
      const format = { vi: "Nhập thời gian theo dạng 20:00 11/09/2026.", en: "Enter times as 20:00 11/09/2026." };
      return refuse({ ...(start ? {} : { from: format }), ...(end ? {} : { to: format }) });
    }
    if (Date.parse(end) <= Date.parse(start)) {
      return refuse({ to: { vi: "Giờ kết thúc phải sau giờ bắt đầu.", en: "The end must be after the start." } });
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
  /** A field's problem in the page's language, or nothing. */
  const said = (pair: Pair | undefined) => (pair ? t(pair) : undefined);

  /**
   * A code is written in capitals, as checkout reads it and as the table
   * prints it: v3 drew the box in capitals, and here the value itself is
   * (`useCapitals`, shared with the style names since slice 6), not while an
   * input method is still composing a character, and with the caret kept
   * where it was. Typing clears what was said, as in every field a check
   * reads.
   */
  const capitals = useCapitals(code, (next) => {
    setCode(next);
    clear();
  });

  return (
    <div className={styles.form}>
      <div className={styles.fields}>
        <Input
          {...capitals}
          label={t({ vi: "Mã", en: "Code" })}
          placeholder="DOT06"
          autoComplete="off"
          spellCheck={false}
          value={code}
          readOnly={promo !== null}
          className={promo ? styles.readOnly : undefined}
          description={
            promo
              ? t({
                  vi: "Mã không đổi được sau khi tạo — dùng Nhân bản để có mã mới.",
                  en: "A code can't change once created. Use Duplicate for a new one.",
                })
              : undefined
          }
          error={said(problems.code)}
        />
        {/* Another kind draws other fields: what was said about the old ones goes with them. */}
        <Select
          label={t({ vi: "Loại", en: "Type" })}
          options={kindOptions(locale)}
          value={kind}
          onValueChange={(v) => {
            setKind(v as PromoKind);
            clear();
          }}
        />

        {kind === "PERCENT" && (
          <>
            <Input
              label={t({ vi: "Giảm (%)", en: "Discount (%)" })}
              inputMode="numeric"
              value={percent}
              error={said(problems.percent)}
              onChange={(e) => {
                setPercent(e.target.value.replace(/\D/g, ""));
                clear();
              }}
            />
            <Input
              label={t({ vi: "Giảm tối đa (₫)", en: "Maximum discount (₫)" })}
              inputMode="numeric"
              value={moneyInput(cap, locale)}
              onChange={(e) => setCap(String(parseVnd(e.target.value) || ""))}
            />
          </>
        )}
        {kind === "AMOUNT" && (
          <Input
            label={t({ vi: "Giảm (₫)", en: "Discount (₫)" })}
            inputMode="numeric"
            value={moneyInput(amount, locale)}
            error={said(problems.amount)}
            onChange={(e) => {
              setAmount(String(parseVnd(e.target.value) || ""));
              clear();
            }}
          />
        )}

        <Input
          label={t({ vi: "Đơn từ (₫)", en: "Minimum order (₫)" })}
          inputMode="numeric"
          value={moneyInput(min, locale)}
          onChange={(e) => setMin(String(parseVnd(e.target.value) || ""))}
        />
        <Input
          label={t({ vi: "Giới hạn lượt · trống = không giới hạn", en: "Use limit · empty = no limit" })}
          inputMode="numeric"
          placeholder={t({ vi: "không giới hạn", en: "no limit" })}
          value={limit}
          onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
        />
        <Input
          label={t({ vi: "Bắt đầu", en: "Starts" })}
          placeholder="20:00 11/09/2026"
          autoComplete="off"
          value={from}
          error={said(problems.from)}
          onChange={(e) => {
            setFrom(e.target.value);
            clear();
          }}
        />
        <Input
          label={t({ vi: "Kết thúc", en: "Ends" })}
          placeholder="20:00 25/09/2026"
          autoComplete="off"
          value={to}
          error={said(problems.to)}
          onChange={(e) => {
            setTo(e.target.value);
            clear();
          }}
        />
      </div>

      <p className={styles.preview}>
        {t<ReactNode>({
          vi: (
            <>
              Xem trước: <b>{clean || "—"}</b>{" "}
              {kind === "PERCENT"
                ? `giảm ${percent || 0}%${parseVnd(cap) > 0 ? `, tối đa ${vnd(parseVnd(cap))}` : ""}`
                : kind === "AMOUNT"
                  ? `giảm ${vnd(parseVnd(amount))}`
                  : PROMO_KIND_LABEL.FREE_SHIPPING.toLocaleLowerCase("vi")}
              {parseVnd(min) > 0 ? `, cho đơn từ ${vnd(parseVnd(min))}` : ""},{" "}
              {limit.trim() === "" ? "không giới hạn lượt" : `${limit} lượt`}.
            </>
          ),
          en: (
            <>
              Preview: <b>{clean || "—"}</b>{" "}
              {kind === "PERCENT"
                ? `${percent || 0}% off${parseVnd(cap) > 0 ? `, up to ${vnd(parseVnd(cap), "en")}` : ""}`
                : kind === "AMOUNT"
                  ? `${vnd(parseVnd(amount), "en")} off`
                  : "free delivery"}
              {parseVnd(min) > 0 ? `, on orders from ${vnd(parseVnd(min), "en")}` : ""},{" "}
              {limit.trim() === "" ? "no use limit" : `${limit} ${limit === "1" ? "use" : "uses"}`}.
            </>
          ),
        })}
      </p>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          {t({ vi: "Huỷ", en: "Cancel" })}
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
            {t<ReactNode>({ vi: <>Nhân bản thành {duplicate.code}</>, en: <>Duplicate as {duplicate.code}</> })}
          </Button>
        )}
        <Button variant="primary" size="sm" loading={pending} onClick={() => submit(onSave)}>
          {pending ? null : <Check {...ICON} />}
          {pending ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Lưu", en: "Save" })}
        </Button>
      </div>
    </div>
  );
}
