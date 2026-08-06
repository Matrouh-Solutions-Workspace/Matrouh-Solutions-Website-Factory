"use client";

import { startTransition, useState, type DragEvent, type ReactNode } from "react";

const dragType = "application/x-matrouh-section";

export function DraggableSection({
  action,
  children,
  sectionId,
  websiteId,
  websiteDraftRevision,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly children: ReactNode;
  readonly sectionId: string;
  readonly websiteId: string;
  readonly websiteDraftRevision: string;
}) {
  const [over, setOver] = useState(false);

  function dragStart(event: DragEvent<HTMLDivElement>): void {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(dragType, sectionId);
  }

  function drop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setOver(false);
    const sourceSectionId = event.dataTransfer.getData(dragType);
    if (!sourceSectionId || sourceSectionId === sectionId) return;
    const formData = new FormData();
    formData.set("websiteId", websiteId);
    formData.set("sectionId", sourceSectionId);
    formData.set("targetSectionId", sectionId);
    formData.set("websiteDraftRevision", websiteDraftRevision);
    startTransition(() => void action(formData));
  }

  return (
    <div
      className={over ? "draggableSection draggableSection--over" : "draggableSection"}
      draggable
      onDragEnd={() => setOver(false)}
      onDragLeave={() => setOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragStart={dragStart}
      onDrop={drop}
    >
      {children}
    </div>
  );
}
