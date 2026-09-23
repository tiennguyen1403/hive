"use client";

import { useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEMO_CLOCK_NOTE } from "@/lib/clock";
import { LEX } from "@/lib/lexicon";
import { useSim } from "./SimContext";

/**
 * The foot of the sidebar: where the back office says what it is.
 *
 * Two facts, both load-bearing. That every action here is stored in this
 * browser and reaches no server — which is why the screens are allowed to
 * behave as if something happened. And how many changes are currently
 * sitting on top of the fixtures, because without that number "Đặt lại dữ
 * liệu mẫu" is a button whose effect nobody can predict.
 *
 * With nothing recorded there is no reset link: a control that would do
 * nothing is not rendered (DESIGN.md §9 rule 3). The mock draws it always;
 * the rule is older than the mock and the sentence beside it already says
 * there is nothing to reset.
 */
export function SimBar() {
  const { count, ready, reset } = useSim();
  const [asking, setAsking] = useState(false);
  const live = ready && count > 0;

  return (
    <div className="simbar">
      <Badge>Chế độ mô phỏng</Badge>
      <div>
        {DEMO_CLOCK_NOTE}
        <br />
        Thao tác lưu trên trình duyệt này, không có máy chủ.{" "}
        {live ? (
          <>
            <b>{count}</b> thay đổi.
          </>
        ) : (
          "Chưa có thay đổi nào."
        )}
      </div>
      {live && (
        <button type="button" className="lnk" onClick={() => setAsking(true)}>
          Đặt lại dữ liệu mẫu
        </button>
      )}

      <AdminSheet
        open={asking}
        onClose={() => setAsking(false)}
        title="Đặt lại dữ liệu mẫu?"
        sub={
          <>
            Mọi thay đổi đã ghi trên trình duyệt này sẽ bị xoá: đơn đã đánh dấu thanh toán, đã bàn
            giao hoặc huỷ, ghi chú, {LEX.tl} và mã tạo ở đây, điều chỉnh tồn kho, và cả nhật ký
            thao tác. Dữ liệu mẫu quay về đúng như lúc mở trang lần đầu.
          </>
        }
        footer={
          <>
            <Button tone="ink sm" icon="back" onClick={() => setAsking(false)}>
              Giữ nguyên
            </Button>
            <Button
              tone="sm"
              icon="refresh"
              onClick={() => {
                reset();
                setAsking(false);
              }}
            >
              Đặt lại
            </Button>
          </>
        }
      />
    </div>
  );
}
