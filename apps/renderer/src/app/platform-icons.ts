import type { Metadata } from "next";

export const platformIcons = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  shortcut: "/favicon.ico",
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
} satisfies NonNullable<Metadata["icons"]>;
