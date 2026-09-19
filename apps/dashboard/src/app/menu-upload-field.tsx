"use client";

import { useEffect, useRef, useState } from "react";
import { uploadMediaForPickerAction } from "@/app/actions";

type MenuUploadDraft = {
  mediaId: string | null;
  mediaKind: "image" | "document" | null;
  filename: string;
};

const emptyDraft: MenuUploadDraft = { mediaId: null, mediaKind: null, filename: "" };

export function MenuUploadField({
  fieldName,
  initialJson,
  label,
  websiteId,
}: {
  readonly fieldName: string;
  readonly initialJson: string;
  readonly label: string;
  readonly websiteId: string;
}) {
  const [draft, setDraft] = useState(() => parseDraft(initialJson));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const hidden = useRef<HTMLInputElement>(null);
  const didMount = useRef(false);
  const serialized = JSON.stringify(draft);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    hidden.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [serialized]);

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setMessage("Uploading your menu…");
    const formData = new FormData();
    formData.set("websiteId", websiteId);
    formData.set("file", file);
    try {
      const result = await uploadMediaForPickerAction(formData);
      if (!result) throw new Error("UPLOAD_REJECTED");
      setDraft({
        mediaId: result.assetId,
        mediaKind: file.type === "application/pdf" ? "document" : "image",
        filename: file.name.slice(0, 255),
      });
      setFile(null);
      setMessage("Menu uploaded. Save and publish to make it available from the QR code.");
    } catch {
      setMessage("The menu could not be uploaded. Use a PDF, PNG, JPEG, WebP, or GIF file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <fieldset className="documentImportField menuUploadField">
      <legend>{label}</legend>
      <input
        data-autosave
        name={`jsonField:${fieldName}`}
        readOnly
        ref={hidden}
        type="hidden"
        value={serialized}
      />
      <p>Upload one PDF or image. Customers will see this file when they scan the menu QR code.</p>
      <div className="documentImportUpload">
        <input
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          aria-label="Menu PDF or image"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <button disabled={!file || uploading} onClick={() => void upload()} type="button">
          {uploading ? "Uploading…" : draft.mediaId ? "Replace menu" : "Upload menu"}
        </button>
      </div>
      {draft.filename ? (
        <div className="documentImportSource">
          <strong>{draft.filename}</strong>
          <button
            className="textButton dangerButton"
            onClick={() => {
              setDraft(emptyDraft);
              setMessage("Menu removed. Upload a new file before publishing.");
            }}
            type="button"
          >
            Remove menu
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="formNotice" role="status">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}

function parseDraft(value: string): MenuUploadDraft {
  try {
    const parsed = JSON.parse(value) as Partial<MenuUploadDraft>;
    if (!parsed || typeof parsed !== "object") return emptyDraft;
    return {
      mediaId: typeof parsed.mediaId === "string" ? parsed.mediaId : null,
      mediaKind:
        parsed.mediaKind === "document" || parsed.mediaKind === "image" ? parsed.mediaKind : null,
      filename: typeof parsed.filename === "string" ? parsed.filename : "",
    };
  } catch {
    return emptyDraft;
  }
}
