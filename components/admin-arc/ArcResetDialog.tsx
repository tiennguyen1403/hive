"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resetDemo } from "@/lib/actions/admin";
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
 */
export function ArcResetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const say = useArcToast();
  const router = useRouter();
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
          result.message ?? result.errors.form ?? "Chưa đặt lại được. Thử lại sau ít phút.",
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
        title="Đặt lại dữ liệu mẫu?"
        description={`Đơn hàng quay về các đơn mẫu — đơn đặt thêm, kể cả của tài khoản đăng ký thật, sẽ mất. Mẫu, tồn kho, các ${LEX.tl}, mẫu hé lộ, mã giảm giá, các tài khoản mẫu và sổ địa chỉ của họ về như ban đầu; nhật ký bắt đầu lại. Ngày giờ mẫu neo vào 18:50 gần nhất.`}
      >
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            disabled={resetting}
            onClick={() => onOpenChange(false)}
          >
            {resetting ? null : <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}
            Giữ nguyên
          </Button>
          <Button variant="danger" size="sm" loading={resetting} onClick={confirmReset}>
            {resetting ? null : <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />}
            {resetting ? "Đang đặt lại…" : "Đặt lại"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
