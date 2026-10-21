// Shared pieces for the generated icons and link-preview images, drawn in
// the TagIt design: Manrope, the blue @ tile, the hero gradient.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const fontDir = join(process.cwd(), "assets/fonts");

export async function ogFonts() {
  const [semi, extra] = await Promise.all([
    readFile(join(fontDir, "manrope-600.woff")),
    readFile(join(fontDir, "manrope-800.woff")),
  ]);
  return [
    { name: "Manrope", data: semi, weight: 600 as const, style: "normal" as const },
    { name: "Manrope", data: extra, weight: 800 as const, style: "normal" as const },
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };

export const BLUE_GRADIENT = "linear-gradient(135deg,#6C97FF 0%,#1F5EFF 45%,#1238B8 100%)";

/** The logo: blue @ tile + "tagit". */
export function OgLogo({ size = 44, light = false }: { size?: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.25 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.31,
          background: light ? "#fff" : "#1F5EFF",
          color: light ? "#1F5EFF" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.6,
          fontWeight: 800,
        }}
      >
        @
      </div>
      <div style={{ fontSize: size * 0.78, fontWeight: 800, letterSpacing: "-0.05em", color: light ? "#fff" : "#1F5EFF" }}>tagit</div>
    </div>
  );
}

/** A floating "@tag" pill from the welcome hero. */
export function OgPill({ tag, color, rotate = 0 }: { tag: string; color: string; rotate?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 64,
        padding: "0 22px 0 8px",
        borderRadius: 999,
        background: "#fff",
        boxShadow: "0 18px 36px -18px rgba(13,19,33,.55)",
        transform: `rotate(${rotate}deg)`,
        fontSize: 24,
        fontWeight: 800,
        color: "#0D1321",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}
      >
        {tag[0].toUpperCase()}
      </div>
      @{tag}
    </div>
  );
}
