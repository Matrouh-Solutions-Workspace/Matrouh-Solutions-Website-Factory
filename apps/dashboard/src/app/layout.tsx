import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = {
  title: { default: "Website Factory", template: "%s · Website Factory" },
  description: "Matrouh Solutions multi-tenant website control plane",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <aside>
          <div className="brand">
            <span>MS</span>
            <div>
              Website Factory<small>Control plane</small>
            </div>
          </div>
          <nav>
            {[
              "Overview",
              "Clients",
              "Websites",
              "Templates",
              "Media",
              "Domains",
              "SEO",
              "Plugins",
              "Settings",
            ].map((item, index) => (
              <a className={index === 0 ? "active" : ""} href={index === 0 ? "/" : "#"} key={item}>
                {item}
              </a>
            ))}
          </nav>
          <footer>Factory v0.1.0</footer>
        </aside>
        <main>{children}</main>
      </body>
    </html>
  );
}
