import type { MetadataRoute } from "next";

/** "Add to Home Screen": opens the app, in TagIt blue. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TagIt",
    short_name: "TagIt",
    description: "Send money to a name, not a code.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F4F5F7",
    theme_color: "#1F5EFF",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
