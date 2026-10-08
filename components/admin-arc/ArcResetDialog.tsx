"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { resetDemo } from "@/lib/actions/admin";
import { picker } from "@/lib/i18n";
import { LEX } from "@/lib/lexicon";
import { Button } from "@/registry/components/button/button";
import { Dialog, DialogContent } from "@/registry/components/dialog/dialog";
import styles from "./ArcDialog.module.css";
import { keepOpenForToasts } from "./arc-toasts";
import { useArcToast } from "./useArcToast";

/**
 * "Đặt lại dữ liệu mẫu?", the question the v3 sidebar asked (`SimBar`), in an
 * Arc `Dialog`. Every word is SimBar's.
 *
 * It calls `resetDemo()` and refreshes the screen only once the server has
 * answered: a reset that failed must not look like one that worked. While it
 * runs the dialog cannot be closed, and "Đặt lại" shows Arc's spinner
 * (`loading`) with "Đang đặt lại…" as its label.
 *
 * Radix hands focus back only to a `DialogTrigger`, and this dialog is opened
 * from the sidebar's own button, so the sidebar says where focus goes when it
 * shuts (`onCloseAutoFocus`, slice 5a), as the issues' dialogs do (slice 4).
 *
 * In the page's language since round v6 slice E0 (QĐ-40), and so is the
 * toast: `resetDemo()` writes its sentence in the visitor's language.
 */
export function ArcResetDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes when the dialog shuts: the button that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}) {
  const say = useArcToast();
  const router = useRouter();
  const t = picker(useLocale());
  const [resetting, startReset] = useTransition();

  function confirmReset() {
    if (resetting) return;
    startReset(async () => {
      const result = await resetDemo();
      // After an `await` the transition has to be restated
      // (react.dev/reference/react/useTransition).
      startReset(() => {
        onOpenChange(false);
        if (result.ok) router.refresh();
        say(
          result.message ??
            result.errors.form ??
            t({ vi: "Chưa đặt lại được. Thử lại sau ít phút.", en: "Couldn't reset. Try again in a few minutes." }),
          result.ok ? "ok" : "error",
        );
      });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && resetting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        onInteractOutside={keepOpenForToasts}
        onCloseAutoFocus={onCloseAutoFocus}
        title={t({ vi: "Đặt lại dữ liệu mẫu?", en: "Reset demo data?" })}
        description={t({
          vi: `Đơn hàng quay về các đơn mẫu: đơn đặt thêm, kể cả của tài khoản đăng ký thật, sẽ mất. Mẫu, tồn kho, các ${LEX.tl}, mẫu hé lộ, mã giảm giá, các tài khoản mẫu và sổ địa chỉ của họ về như ban đầu; nhật ký bắt đầu lại. Ngày giờ mẫu neo vào 18:50 gần nhất.`,
          en: "Orders return to the sample orders, and any order placed since, including those of real sign-ups, is lost. Styles, stock, drops, teasers, discount codes, the demo accounts and their address books go back to how they started, and the activity log starts over. Demo dates and times are anchored to the most recent 18:50.",
        })}
      >
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            disabled={resetting}
            onClick={() => onOpenChange(false)}
          >
            {resetting ? null : <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}
            {t({ vi: "Giữ nguyên", en: "Keep as is" })}
          </Button>
          <Button variant="danger" size="sm" loading={resetting} onClick={confirmReset}>
            {resetting ? null : <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />}
            {resetting ? t({ vi: "Đang đặt lại…", en: "Resetting…" }) : t({ vi: "Đặt lại", en: "Reset" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
