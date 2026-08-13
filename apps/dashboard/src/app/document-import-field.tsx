"use client";

import { useEffect, useRef, useState } from "react";
import { uploadDocumentForImportAction } from "@/app/actions";

interface ImportDraft {
  readonly sourcePdfMediaId: string | null;
  readonly sourceFilename: string;
  readonly locale: "ar" | "en";
  readonly status: "not_started" | "review_required" | "confirmed";
  readonly extractedText: string;
  readonly reviewNotes: string;
}

const emptyDraft: ImportDraft = {
  sourcePdfMediaId: null,
  sourceFilename: "",
  locale: "en",
  status: "not_started",
  extractedText: "",
  reviewNotes: "",
};

export function DocumentImportField({
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
  const serializedDraft = JSON.stringify(draft);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    hidden.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [serializedDraft]);

  function update(next: ImportDraft) {
    setDraft(next);
  }

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setMessage("Uploading securely and extracting readable text…");
    const formData = new FormData();
    formData.set("websiteId", websiteId);
    formData.set("file", file);
    try {
      const result = await uploadDocumentForImportAction(formData);
      if (!result) throw new Error("IMPORT_REJECTED");
      update({
        ...draft,
        sourcePdfMediaId: result.assetId,
        sourceFilename: result.filename,
        status: "review_required",
        extractedText: result.extractedText,
      });
      setMessage(
        result.warning ??
          `Imported ${result.pageCount || "the"} page${result.pageCount === 1 ? "" : "s"}. Review and correct the extracted text before confirming.`,
      );
    } catch {
      setMessage("The PDF could not be imported. Check the file and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <fieldset className="documentImportField">
      <legend>{label}</legend>
      <input
        data-autosave
        name={`jsonField:${fieldName}`}
        readOnly
        ref={hidden}
        type="hidden"
        value={serializedDraft}
      />
      <div className="documentImportSteps" aria-label="PDF import workflow">
        <span className={draft.sourcePdfMediaId ? "complete" : "active"}>1 Upload</span>
        <span
          className={
            draft.status === "review_required"
              ? "active"
              : draft.status === "confirmed"
                ? "complete"
                : ""
          }
        >
          2 Review
        </span>
        <span className={draft.status === "confirmed" ? "complete" : ""}>3 Confirm</span>
      </div>
      <div className="documentImportUpload">
        <label>
          PDF language
          <select
            onChange={(event) =>
              update({ ...draft, locale: event.target.value === "ar" ? "ar" : "en" })
            }
            value={draft.locale}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </label>
        <label>
          Menu PDF
          <input
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        <button disabled={!file || uploading} onClick={() => void upload()} type="button">
          {uploading ? "Processing…" : draft.sourcePdfMediaId ? "Replace PDF" : "Upload & extract"}
        </button>
      </div>
      {draft.sourceFilename ? (
        <div className="documentImportSource">
          <strong>{draft.sourceFilename}</strong>
          <button
            className="textButton dangerButton"
            onClick={() => update({ ...emptyDraft, locale: draft.locale })}
            type="button"
          >
            Remove import
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="formNotice" role="status">
          {message}
        </p>
      ) : null}
      {draft.sourcePdfMediaId ? (
        <>
          <label>
            Extracted menu text
            <textarea
              dir={draft.locale === "ar" ? "rtl" : "ltr"}
              lang={draft.locale}
              onChange={(event) =>
                update({ ...draft, extractedText: event.target.value, status: "review_required" })
              }
              rows={12}
              value={draft.extractedText}
            />
          </label>
          <label>
            Review notes
            <textarea
              onChange={(event) => update({ ...draft, reviewNotes: event.target.value })}
              placeholder="Record unclear prices, missing images, or corrections still needed."
              rows={3}
              value={draft.reviewNotes}
            />
          </label>
          <label>
            Review status
            <select
              onChange={(event) =>
                update({
                  ...draft,
                  status: event.target.value === "confirmed" ? "confirmed" : "review_required",
                })
              }
              value={draft.status}
            >
              <option value="review_required">Needs review</option>
              <option value="confirmed">Reviewed and confirmed</option>
            </select>
          </label>
        </>
      ) : null}
    </fieldset>
  );
}

function parseDraft(value: string): ImportDraft {
  try {
    const parsed = JSON.parse(value) as Partial<ImportDraft>;
    if (!parsed || typeof parsed !== "object") return emptyDraft;
    return {
      sourcePdfMediaId:
        typeof parsed.sourcePdfMediaId === "string" ? parsed.sourcePdfMediaId : null,
      sourceFilename: typeof parsed.sourceFilename === "string" ? parsed.sourceFilename : "",
      locale: parsed.locale === "ar" ? "ar" : "en",
      status:
        parsed.status === "confirmed"
          ? "confirmed"
          : parsed.status === "review_required"
            ? "review_required"
            : "not_started",
      extractedText: typeof parsed.extractedText === "string" ? parsed.extractedText : "",
      reviewNotes: typeof parsed.reviewNotes === "string" ? parsed.reviewNotes : "",
    };
  } catch {
    return emptyDraft;
  }
}
