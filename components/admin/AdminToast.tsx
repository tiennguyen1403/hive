"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Toast, type ToastTone } from "@/components/shop/Toast";

/**
 * Say something in the back office's toast: a confirmation (the default), or
 * — `"error"` — a refusal, which carries the `danger` icon and is announced
 * as an alert (slice B4b, `components/shop/Toast.tsx`).
 */
type Say = (message: string, tone?: ToastTone) => void;

const Ctx = createContext<Say | null>(null);

/**
 * The one toast the whole back office shares.
 *
 * Until slice B3b it rode on the simulation's provider (`SimProvider`), which
 * is gone with the simulation: every move is a Server Action now, and what a
 * screen has left to say is what the server answered — "DH-2430 → đã thanh
 * toán · đã lưu", "Tồn kho đã đổi ở nơi khác — tải lại rồi sửa tiếp" — or a
 * copy, a download. Mounted once by the admin layout, so a sheet that closes
 * on success can still be answered after it has gone.
 *
 * Since slice B4b the caller says which of the two it is: an action's answer
 * is `ok` when `result.ok`, `"error"` otherwise, and a sentence written here
 * to refuse something ("Ghi chú trống thì chưa có gì để lưu") is `"error"`.
 */
export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [said, setSaid] = useState<{ message: string; tone: ToastTone } | null>(null);
  // Both stable, so the toast's timer runs from the moment it was raised
  // rather than restarting on every render of the screen under it.
  const done = useCallback(() => setSaid(null), []);
  const say = useCallback<Say>((message, tone = "ok") => setSaid({ message, tone }), []);

  return (
    <Ctx.Provider value={say}>
      {children}
      <Toast message={said?.message ?? null} tone={said?.tone ?? "ok"} onDone={done} />
    </Ctx.Provider>
  );
}

/** Say something in the back office's toast. */
export function useAdminToast(): Say {
  const say = useContext(Ctx);
  if (!say) throw new Error("useAdminToast() outside <AdminToastProvider>");
  return say;
}
