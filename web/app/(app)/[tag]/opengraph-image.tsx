import { ImageResponse } from "next/og";

import { avatarColor } from "@/components/ui";
import { BLUE_GRADIENT, OG_SIZE, OgLogo, ogFonts } from "@/lib/og";
import { parseTag, safeDecode } from "@/lib/stellar/tag";

export const alt = "Pay by @tag on TagIt";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview for a pay link (tagit.app/@david): "Pay @david". */
export default async function Image({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = await params;
  const parsed = parseTag(safeDecode(raw));
  const tag = parsed.ok ? parsed.tag : null;
  const big = !tag ? 104 : tag.length > 16 ? 62 : tag.length > 12 ? 76 : 104;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", background: BLUE_GRADIENT, color: "#fff", fontFamily: "Manrope", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: 999, right: -160, top: -220, background: "rgba(255,255,255,.12)" }} />
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: 999, left: -240, bottom: -360, background: "rgba(255,255,255,.08)" }} />
        <OgLogo light />
        {tag ? (
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            <div
              style={{
                width: 180,
                height: 180,
                flexShrink: 0,
                borderRadius: 999,
                background: avatarColor(tag),
                border: "8px solid rgba(255,255,255,.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 84,
                fontWeight: 800,
              }}
            >
              {tag[0].toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 600, opacity: 0.85 }}>Pay</div>
              <div style={{ fontSize: big, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>{`@${tag}`}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>Pay by @tag</div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.9 }}>Send XLM or USDC by name. You see their full wallet before you pay.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,.16)", fontSize: 20, fontWeight: 800 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#FDB022" }} />
            Testnet
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
