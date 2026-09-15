export function EditorDisclosure({
  children,
  description,
  eyebrow,
  open = false,
  title,
}: {
  readonly children: React.ReactNode;
  readonly description?: string;
  readonly eyebrow?: string;
  readonly open?: boolean;
  readonly title: string;
}) {
  return (
    <details className="clientEditorDisclosure" open={open}>
      <summary>
        <span className="clientEditorDisclosureMarker" aria-hidden="true" />
        <span>
          {eyebrow ? <small>{eyebrow}</small> : null}
          <strong>{title}</strong>
          {description ? <em>{description}</em> : null}
        </span>
      </summary>
      <div className="clientEditorDisclosureBody">{children}</div>
    </details>
  );
}
