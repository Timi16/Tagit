import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["500", "600"] });

/** Absolute URLs for link previews: your domain, else Vercel's production URL, else localhost. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const description = "Send money to a name, not a code. Claim an @tag for your Stellar wallet and get paid by name.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "TagIt: send money to a name", template: "%s" },
  description,
  applicationName: "TagIt",
  openGraph: { type: "website", siteName: "TagIt", title: "TagIt: send money to a name", description },
  twitter: { card: "summary_large_image", title: "TagIt: send money to a name", description },
  appleWebApp: { title: "TagIt", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1F5EFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${mono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
