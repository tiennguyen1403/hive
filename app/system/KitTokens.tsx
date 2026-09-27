"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Feed colour tokens as the browser resolved them inside the zone. The
 * value printed under each swatch is read back from the page
 * (`getComputedStyle`), not typed a second time here, so the kit shows what
 * `app/globals.css` actually declares. Roles from the mock's
 * `direction.json` → `palette`, and for the four named literals, the rule
 * they came from.
 */
const COLOURS: ReadonlyArray<readonly [token: string, role: string]> = [
  ["--f-bg", "Nền"],
  ["--f-bg2", "Nền nhóm, chip khi nghỉ, ô nhập"],
  ["--f-bg3", "Chip, pill, nút đóng khi rê chuột"],
  ["--f-ink", "Chữ, lựa chọn đang bật"],
  ["--f-ink2", "Chữ phụ"],
  ["--f-blue", "Điểm nhấn duy nhất"],
  ["--f-blue2", "Nút xanh khi rê chuột"],
  ["--f-err", "Chỉ cho lỗi"],
  ["--f-line", "Đường kẻ"],
  ["--f-line2", "Viền điều khiển, kẻ đậm"],
  ["--f-grab", "Tay nắm của sheet"],
  ["--f-white", "Chữ trên xanh và trên mực"],
  ["--f-select", "Chữ đang bôi đen"],
];

const EFFECTS: ReadonlyArray<readonly [token: string, role: string, cls: string]> = [
  ["--f-scrim", "Dưới chữ đặt trên ảnh", "kit-scrim"],
  ["--f-lift", "Bóng của sheet và thanh mua", "kit-lift"],
];

export function KitTokens() {
  const ref = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    const read: Record<string, string> = {};
    for (const [t] of [...COLOURS, ...EFFECTS]) read[t] = cs.getPropertyValue(t).trim();
    setValues(read);
  }, []);

  return (
    <div ref={ref}>
      <ul className="kit-swatches">
        {COLOURS.map(([token, role]) => (
          <li key={token}>
            <span className="kit-swatch-c" style={{ "--kit-c": `var(${token})` } as React.CSSProperties} />
            <span className="kit-swatch-n">{token}</span>
            <span className="kit-swatch-v">{values[token] ?? ""}</span>
            <span className="kit-swatch-r">{role}</span>
          </li>
        ))}
      </ul>
      <ul className="kit-swatches kit-effects">
        {EFFECTS.map(([token, role, cls]) => (
          <li key={token}>
            <span className={`kit-swatch-c ${cls}`} />
            <span className="kit-swatch-n">{token}</span>
            <span className="kit-swatch-v">{values[token] ?? ""}</span>
            <span className="kit-swatch-r">{role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
