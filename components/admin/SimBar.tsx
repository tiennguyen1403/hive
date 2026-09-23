"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { resetDemo } from "@/lib/actions/admin";
import { signOut } from "@/lib/actions/auth";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX } from "@/lib/lexicon";
import { useAdminToast } from "./AdminToast";

/**
 * The foot of the sidebar: where the back office says what it is, and who is
 * using it.
 *
 * Two facts, both load-bearing:
 *
 *   · the clock is the real one, and the sample data was last put back at a
 *     given minute — read off the newest `DEMO_RESET` in the log, so a
 *     visitor can tell how fresh the shop in front of them is;
 *   · who is signed in, with the way out.
 *
 * Until slice B3b a third line counted the changes still simulated in this
 * browser (stock, issues, codes). There are none any more: every button in
 * the back office writes the database, so the line went with the simulation.
 *
 * "Đặt lại dữ liệu mẫu" is always there: the database can always be put
 * back, so the control always does what it says (DESIGN.md §9 rule 3). It
 * asks first, calls `resetDemo()`, and only once the server has answered
 * does it refresh the screen — a reset that failed must not look like one
 * that worked.
 */
export function SimBar({
  me,
  lastResetAt,
}: {
  me: { name: string; email: string };
  /** The newest `DEMO_RESET`, or null when the log has none. */
  lastResetAt: string | null;
}) {
  const say = useAdminToast();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [resetting, startReset] = useTransition();

  function confirmReset() {
    if (resetting) return;
    startReset(async () => {
      const result = await resetDemo();
      // After an `await` the transition has to be restated
      // (react.dev/reference/react/useTransition).
      startReset(() => {
        setAsking(false);
        if (result.ok) router.refresh();
        say(result.message ?? result.errors.form ?? "Chưa đặt lại được. Thử lại sau ít phút.");
      });
    });
  }

  return (
    <div className="simbar">
      <Badge>Dữ liệu mẫu</Badge>
      <div>
        Đồng hồ thật · dữ liệu mẫu{" "}
        {lastResetAt ? (
          <>
            đặt lại lần cuối{" "}
            <b>
              {clockLabel(lastResetAt)} · {dayMonth(lastResetAt)}
            </b>
          </>
        ) : (
          "chưa đặt lại"
        )}
        .
      </div>
      <button type="button" className="lnk" onClick={() => setAsking(true)}>
        Đặt lại dữ liệu mẫu
      </button>
      <div>
        <b>{me.name}</b> · {me.email}
      </div>
      <form action={signOut}>
        <button type="submit" className="lnk">
          Đăng xuất
        </button>
      </form>

      <AdminSheet
        open={asking}
        onClose={() => {
          if (!resetting) setAsking(false);
        }}
        title="Đặt lại dữ liệu mẫu?"
        sub={
          <>
            Đơn hàng quay về các đơn mẫu — đơn đặt thêm, kể cả của tài khoản đăng ký thật, sẽ mất.
            Mẫu, tồn kho, các {LEX.tl}, mẫu hé lộ, mã giảm giá, các tài khoản mẫu và sổ địa chỉ của
            họ về như ban đầu; nhật ký bắt đầu lại. Ngày giờ mẫu neo vào 18:50 gần nhất.
          </>
        }
        footer={
          <>
            <Button
              tone="ink sm"
              icon="back"
              disabled={resetting}
              onClick={() => setAsking(false)}
            >
              Giữ nguyên
            </Button>
            <Button
              tone="sm"
              disabled={resetting}
              {...(resetting ? {} : { icon: "refresh" as const })}
              onClick={confirmReset}
            >
              {resetting ? "Đang đặt lại…" : "Đặt lại"}
            </Button>
          </>
        }
      />
    </div>
  );
}
