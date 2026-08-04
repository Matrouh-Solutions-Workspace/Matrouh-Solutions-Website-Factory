export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ fontFamily: "Arial", margin: 0, background: "#f6f7f8", color: "#17221f" }}>
        {children}
      </body>
    </html>
  );
}
