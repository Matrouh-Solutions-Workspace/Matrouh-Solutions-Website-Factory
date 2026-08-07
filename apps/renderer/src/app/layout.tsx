import "./styles.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="und">
      <body>{children}</body>
    </html>
  );
}
