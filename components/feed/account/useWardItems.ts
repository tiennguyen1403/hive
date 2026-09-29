"use client";

import { useCallback, useRef, useState } from "react";
import { wardOptionLabel } from "@/components/checkout/wards";
import type { Ward } from "@/data/regions";
import type { PickItem } from "../FeedPicker";

type WardStatus = "loading" | "error";

/**
 * The communes of a province for the Feed's commune picker, asked of
 * `/api/wards` once per province, in the official order the mock lists them
 * (`?order=official`), named "Phường Sài Gòn" — the checkout's way
 * (`CheckoutView`), for the address book's sheet. `waiting` is the line the
 * picker shows while a list is on its way or could not be fetched; a failed
 * province is asked again the next time.
 */
export function useWardItems() {
  const [wards, setWards] = useState<Record<string, PickItem[]>>({});
  const [status, setStatus] = useState<Record<string, WardStatus>>({});
  const asked = useRef(new Set<string>());

  const fetchWards = useCallback((code: string) => {
    if (!code || asked.current.has(code)) return;
    asked.current.add(code);
    setStatus((s) => ({ ...s, [code]: "loading" }));
    fetch(`/api/wards?province=${encodeURIComponent(code)}&order=official`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { wards: Ward[] }) => {
        setWards((w) => ({ ...w, [code]: data.wards.map((x) => ({ value: x.code, label: wardOptionLabel(x) })) }));
        setStatus((s) => {
          const next = { ...s };
          delete next[code];
          return next;
        });
      })
      .catch(() => {
        asked.current.delete(code);
        setStatus((s) => ({ ...s, [code]: "error" }));
      });
  }, []);

  const waiting = (code: string) => (status[code] === "error" ? "Không tải được" : "Đang tải…");

  return { wards, fetchWards, waiting };
}
