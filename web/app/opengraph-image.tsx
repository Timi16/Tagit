import { ImageResponse } from "next/og";

import { BLUE_GRADIENT, OG_SIZE, OgLogo, OgPill, ogFonts } from "@/lib/og";

export const alt = "TagIt: send money to a name, not a code.";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The link preview for the site: headline on the left, the welcome hero on the right. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F4F5F7", fontFamily: "Manrope", color: "#0D1321", position: "relative" }}>
        <div style={{ position: "absolute", right: -160, top: -200, width: 640, height: 640, borderRadius: 999, background: "#C9D8FF", opacity: 0.7, filter: "blur(80px)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, padding: "64px 0 60px 72px" }}>
          <OgLogo />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1.0 }}>Send money</div>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1.0 }}>to a name.</div>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1.0, color: "#1F5EFF" }}>Not a code.</div>
            <div style={{ marginTop: 26, fontSize: 26, fontWeight: 600, color: "#475467", lineHeight: 1.4, maxWidth: 480 }}>
              Claim an @tag for your Stellar wallet. Get paid by name.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 800, color: "#067647" }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: "#12B76A" }} />
            Live on Stellar Testnet
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, padding: "56px 64px 56px 24px" }}>
          <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", borderRadius: 44, background: BLUE_GRADIENT, overflow: "hidden", boxShadow: "0 40px 80px -40px rgba(31,94,255,.8)" }}>
            <div style={{ position: "absolute", width: 300, height: 300, borderRadius: 999, right: -90, top: -110, background: "rgba(255,255,255,.12)" }} />
            <div style={{ position: "absolute", width: 360, height: 360, borderRadius: 999, left: -150, bottom: -190, background: "rgba(255,255,255,.1)" }} />
            <div style={{ position: "absolute", left: 30, top: 34, display: "flex" }}>
              <OgPill tag="david" color="#7C5CFF" rotate={-6} />
            </div>
            <div style={{ position: "absolute", right: 30, top: 108, display: "flex" }}>
              <OgPill tag="ada" color="#FF7A45" rotate={5} />
            </div>
            <div style={{ position: "absolute", left: 40, bottom: 36, display: "flex" }}>
              <OgPill tag="zara" color="#12B76A" rotate={4} />
            </div>
            <div style={{ position: "absolute", right: 34, bottom: 30, display: "flex" }}>
              <OgPill tag="tunde" color="#F5B000" rotate={-4} />
            </div>
            <div style={{ position: "absolute", left: 74, top: 196, width: 360, display: "flex", flexDirection: "column", padding: 22, borderRadius: 28, background: "#fff", boxShadow: "0 30px 60px -24px rgba(5,20,70,.6)" }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#6B7280", marginBottom: 10 }}>Pick your tag</div>
              <div style={{ display: "flex", alignItems: "center", height: 64, padding: "0 16px", borderRadius: 18, border: "3px solid #12B76A", fontSize: 30, fontWeight: 800 }}>
                <span style={{ color: "#1F5EFF" }}>@</span>god
                <div style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 999, background: "#12B76A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 18, fontWeight: 800, color: "#067647" }}>
                <div style={{ width: 9, height: 9, borderRadius: 999, background: "#12B76A" }} />
                @god is available
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
