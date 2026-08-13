import { Cairo, Tajawal } from "next/font/google";
import "./styles.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${tajawal.variable} ${cairo.variable} ${tajawal.className}`} lang="und">
      <head>
        <link href="/commerce-storefront.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
