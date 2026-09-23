"use client";

import { useEffect, useRef, useState } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { wardOptionLabel } from "./wards";
import type { Ward } from "@/data/regions";

interface WardSelectProps {
  provinceCode: string;
  value: string;
  /** The label comes back with the code: the receipt prints "Phường Sài Gòn",
   *  and the caller has no way to look that up without the region module. */
  onChange: (code: string, label: string) => void;
  ariaLabel: string;
  id?: string;
}

/**
 * The commune dropdown, fetched per province.
 *
 * `data/wards.json` is 218KB of 3,321 communes. Importing it here would ship
 * all of them to every shopper so that one dropdown can offer at most 168, so
 * it stays on the server behind `/api/wards` and this asks for the province
 * it needs. Answers are kept for the session — changing province back and
 * forth is normal, and refetching each time would be a spinner for data the
 * browser already has.
 */
export function WardSelect({ provinceCode, value, onChange, ariaLabel, id }: WardSelectProps) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const cache = useRef(new Map<string, Ward[]>());

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      setState("idle");
      return;
    }

    const cached = cache.current.get(provinceCode);
    if (cached) {
      setWards(cached);
      setState("idle");
      return;
    }

    // A slow answer for a province the shopper has already moved on from
    // must not overwrite the list they are looking at now.
    const ac = new AbortController();
    setState("loading");
    fetch(`/api/wards?province=${encodeURIComponent(provinceCode)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { wards: Ward[] }) => {
        cache.current.set(provinceCode, data.wards);
        setWards(data.wards);
        setState("idle");
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setState("error");
      });

    return () => ac.abort();
  }, [provinceCode]);

  const options: SelectOption[] = wards.map((w) => ({
    value: w.code,
    label: wardOptionLabel(w),
  }));

  // A value that arrived prefilled has a code but no label until this list
  // loads. Report it the moment it is knowable, or the receipt prints an
  // address with the ward missing from the middle of it.
  const resolved = options.find((o) => o.value === value)?.label ?? "";
  useEffect(() => {
    if (resolved) onChange(value, resolved);
    // Only when the resolved label changes — re-running on every render of
    // the parent would loop through its setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  return (
    <>
      <Select
        options={options}
        value={value || null}
        onChange={(code) =>
          onChange(code, options.find((o) => o.value === code)?.label ?? "")
        }
        ariaLabel={ariaLabel}
        id={id}
        disabled={!provinceCode || state === "loading"}
        placeholder={
          !provinceCode
            ? "Chọn tỉnh trước"
            : state === "loading"
              ? "Đang tải…"
              : state === "error"
                ? "Không tải được"
                : "Chọn phường / xã"
        }
      />
      {state === "error" && (
        <div className="err" role="alert">
          Không tải được danh sách phường / xã. Thử chọn lại tỉnh.
        </div>
      )}
    </>
  );
}
