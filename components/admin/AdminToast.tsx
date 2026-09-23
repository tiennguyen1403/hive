"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Toast } from "@/components/shop/Toast";

type Say = (message: string) => void;

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
 */
export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  // Stable, so the toast's timer runs from the moment it was raised rather
  // than restarting on every render of the screen under it.
  const done = useCallback(() => setMessage(null), []);

  return (
    <Ctx.Provider value={setMessage}>
      {children}
      <Toast message={message} onDone={done} />
    </Ctx.Provider>
  );
}

/** Say something in the back office's toast. */
export function useAdminToast(): Say {
  const say = useContext(Ctx);
  if (!say) throw new Error("useAdminToast() outside <AdminToastProvider>");
  return say;
}
