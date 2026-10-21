import { ImageResponse } from "next/og";

import { ogFonts } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon: the blue @ tile, full bleed (iOS rounds it). */
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#4A7DFF,#1F5EFF)",
          color: "#fff",
          fontSize: 116,
          fontWeight: 800,
          fontFamily: "Manrope",
          paddingBottom: 10,
        }}
      >
        @
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
