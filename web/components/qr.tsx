"use client";

// A real, scannable QR drawn the way the design draws it: one square per
// module on a 1-module quiet zone, with the blue "@" badge in the middle.
// Error correction H keeps it readable under the badge.

import QRCode from "qrcode";
import { useMemo } from "react";

export function Qr({ value, size, label }: { value: string; size: number; label: string }) {
  const { n, path } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
    const n = qr.modules.size;
    let path = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { n, path };
  }, [value]);

  const badge = Math.max(5, Math.round(n * 0.2));
  const at = (n - badge) / 2;

  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} fill="#fff" />
      <path d={path} fill="#0D1321" />
      <rect x={at - 0.5} y={at - 0.5} width={badge + 1} height={badge + 1} rx={1.8} fill="#fff" />
      <rect x={at} y={at} width={badge} height={badge} rx={1.6} fill="#1F5EFF" />
      <text
        x={n / 2}
        y={at + badge * 0.78}
        textAnchor="middle"
        fontSize={badge * 0.83}
        fontWeight={800}
        fill="#fff"
        fontFamily="Manrope,sans-serif"
      >
        @
      </text>
    </svg>
  );
}
