import "../../../../renderer/src/app/styles.css";
import "./preview-overrides.css";

export default function TemplatePreviewLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div className="catalogPreviewDocument">{children}</div>;
}
