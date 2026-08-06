import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { DashboardShell } from "@/app/dashboard-shell";
import "./styles.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: { default: "Website Factory", template: "%s · Website Factory" },
  description: "Matrouh Solutions multi-tenant website control plane",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cairo.variable}>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
