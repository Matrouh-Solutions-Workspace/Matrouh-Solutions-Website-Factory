import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "@fontsource/tajawal/900.css";
import "./styles.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="und">
      <head>
        <link href="/commerce-storefront.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
