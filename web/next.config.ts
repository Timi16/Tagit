import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser e2e builds (with the test wallet) never share output with real builds.
  distDir: process.env.NEXT_PUBLIC_E2E === "1" ? ".next-e2e" : ".next",
  // Always defined, so it's inlined as a literal and the test wallet in
  // lib/stellar/wallet.ts is dead code (and removed) in every normal build.
  env: { NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0" },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
