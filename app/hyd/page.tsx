"use client";
import { useState, useEffect } from "react";

export default function Hyd() {
  const [n, setN] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div style={{ padding: 40, fontSize: 20 }}>
      <p id="mounted">mounted: {String(mounted)}</p>
      <button id="inc" onClick={() => setN((v) => v + 1)}>
        dem: {n}
      </button>
    </div>
  );
}
