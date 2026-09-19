import type { ReactNode } from "react";

export function AdminEditorSection({
  children,
  description,
  id,
  number,
  open = false,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly id: string;
  readonly number: string;
  readonly open?: boolean;
  readonly title: string;
}) {
  return (
    <details className="adminEditorDisclosure" id={id} open={open}>
      <summary>
        <span>
          <small>{number}</small>
          <strong>{title}</strong>
          <em>{description}</em>
        </span>
      </summary>
      <div className="adminEditorDisclosureBody">{children}</div>
    </details>
  );
}
