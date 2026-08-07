"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadMediaForPickerAction } from "@/app/actions";

export interface MediaPickerAsset {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

export function MediaPicker({
  assets,
  defaultValue = "",
  label,
  name,
  noneLabel = "No image",
  onChange,
  purpose,
  value,
  websiteId,
}: {
  readonly assets: readonly MediaPickerAsset[];
  readonly defaultValue?: string;
  readonly label: string;
  readonly name?: string;
  readonly noneLabel?: string;
  readonly onChange?: (value: string) => void;
  readonly purpose?: "favicon" | "logo";
  readonly value?: string;
  readonly websiteId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [provisionalAsset, setProvisionalAsset] = useState<MediaPickerAsset | null>(null);
  const selectedId = value === undefined ? internalValue : value;
  const selected =
    assets.find((asset) => asset.id === selectedId) ??
    (provisionalAsset?.id === selectedId ? provisionalAsset : undefined);
  const visibleAssets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? assets.filter((asset) => asset.name.toLocaleLowerCase().includes(normalized))
      : assets;
  }, [assets, query]);

  useEffect(() => {
    if (value === undefined) setInternalValue(defaultValue);
  }, [defaultValue, value]);

  useEffect(
    () => () => {
      if (provisionalAsset?.url.startsWith("blob:")) URL.revokeObjectURL(provisionalAsset.url);
    },
    [provisionalAsset],
  );

  function choose(assetId: string) {
    if (value === undefined) setInternalValue(assetId);
    onChange?.(assetId);
    if (field.current) {
      field.current.value = assetId;
      field.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (assetId || noneLabel) dialog.current?.close();
  }

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setUploadStatus("Uploading and processing image…");
    const formData = new FormData();
    formData.set("websiteId", websiteId);
    formData.set("file", file);
    if (purpose) formData.set("purpose", purpose);
    try {
      const result = await uploadMediaForPickerAction(formData);
      if (!result) throw new Error("UPLOAD_REJECTED");
      setProvisionalAsset({
        id: result.assetId,
        name: file.name,
        url: URL.createObjectURL(file),
      });
      setUploadStatus("Upload queued for processing and selected.");
      choose(result.assetId);
    } catch {
      setUploadStatus("The image could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mediaPickerField">
      <span className="mediaPickerLabel">{label}</span>
      {name && <input data-autosave name={name} ref={field} type="hidden" value={selectedId} />}
      <button
        className="mediaPickerCurrent"
        onClick={() => dialog.current?.showModal()}
        type="button"
      >
        {selected ? (
          <>
            <span
              aria-hidden="true"
              className="mediaPickerCurrentThumb"
              style={{ backgroundImage: `url(${selected.url})` }}
            />
            <span>
              <strong>{selected.name}</strong>
              <small>Click to choose another image</small>
            </span>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="mediaPickerEmptyIcon">
              +
            </span>
            <span>
              <strong>{noneLabel}</strong>
              <small>Choose from this website or upload a new image</small>
            </span>
          </>
        )}
      </button>

      <dialog className="mediaPickerDialog" ref={dialog}>
        <div className="mediaPickerDialogHead">
          <div>
            <p className="eyebrow">Website media</p>
            <h2>Choose an image</h2>
            <small>Only images in this website&apos;s folder are shown.</small>
          </div>
          <button
            aria-label="Close image picker"
            className="mediaPickerClose"
            onClick={() => dialog.current?.close()}
            type="button"
          >
            ×
          </button>
        </div>

        <input
          aria-label="Search website images"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search images…"
          type="search"
          value={query}
        />

        <div className="mediaPickerGrid">
          <button
            aria-pressed={!selectedId}
            className="mediaPickerOption mediaPickerOption--none"
            onClick={() => choose("")}
            type="button"
          >
            <span>No image</span>
            <strong>{noneLabel}</strong>
          </button>
          {visibleAssets.map((asset) => (
            <button
              aria-label={`Select ${asset.name}`}
              aria-pressed={selectedId === asset.id}
              className="mediaPickerOption"
              key={asset.id}
              onClick={() => choose(asset.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="mediaPickerThumb"
                style={{ backgroundImage: `url(${asset.url})` }}
              />
              <strong title={asset.name}>{asset.name}</strong>
            </button>
          ))}
        </div>
        {visibleAssets.length === 0 && (
          <p className="mediaPickerNoResults">No matching images in this website&apos;s folder.</p>
        )}

        <div className="mediaPickerUpload">
          <div>
            <strong>Upload a new image</strong>
            <small>PNG, JPEG, WebP, or GIF. It will be filed under this website.</small>
          </div>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="New website image"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <button
            disabled={!file || uploading}
            onClick={() => {
              void upload();
            }}
            type="button"
          >
            {uploading ? "Uploading…" : "Upload and select"}
          </button>
          {uploadStatus && <small className="mediaPickerUploadStatus">{uploadStatus}</small>}
        </div>
      </dialog>
    </div>
  );
}
