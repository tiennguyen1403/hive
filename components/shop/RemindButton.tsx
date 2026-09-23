"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/shop/Toast";
import { readReminders, useReminders, writeReminders } from "@/components/shop/reminders";
import type { Drop } from "@/data/types";
import { LEX } from "@/lib/lexicon";
import { hasReminder, toggleReminder } from "@/lib/reminder";

/**
 * "Đặt nhắc giờ mở" — and it really does something.
 *
 * There is no server to send a message from, so this does the one honest
 * thing a browser can do alone: it remembers the drop on this device, says
 * so, and the home page's band reads it back in the two hours before the
 * doors open (`lib/reminder.ts`). The label the mock carried — "gửi trước
 * giờ mở 2 giờ" — promised a message nothing here could deliver, so it is
 * rewritten to what actually happens.
 *
 * Pressed state survives a reload because the list is in `localStorage`,
 * and `aria-pressed` says the same thing the icon and the label do: three
 * channels, no colour among them.
 */
export function RemindButton({ drop, tone = "" }: { drop: Drop; tone?: string }) {
  const { list, ready } = useReminders();
  const [toast, setToast] = useState<string | null>(null);

  const on = ready && hasReminder(list, drop.no);
  const no = String(drop.no).padStart(2, "0");

  function press() {
    // Read through storage rather than trusting `list`: the band on this
    // page writes nothing, but a second tab might have, and the last write
    // should not silently undo it.
    const next = toggleReminder(readReminders(), drop.no);
    writeReminders(next);
    setToast(
      hasReminder(next, drop.no)
        ? "Đã đặt nhắc giờ mở · lưu trên thiết bị này"
        : `Đã bỏ nhắc ${LEX.tl} ${no}`,
    );
  }

  return (
    <>
      <Button
        tone={tone}
        icon={on ? "confirm" : "bell"}
        aria-pressed={on}
        onClick={press}
      >
        {on ? "Đã đặt nhắc" : "Đặt nhắc giờ mở"}
      </Button>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
