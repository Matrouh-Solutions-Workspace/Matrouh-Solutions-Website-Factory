export interface MediaUploadInput {
  upload: File;
  folderId: string;
  websiteId: string;
  purpose: "favicon" | "logo" | null;
}

export function parseMediaUploadInput(
  formData: FormData,
  maxBytes: number,
): MediaUploadInput | null {
  const upload = formData.get("file");
  const folderId =
    typeof formData.get("folderId") === "string"
      ? String(formData.get("folderId")).trim().slice(0, 80)
      : "";
  const websiteId =
    typeof formData.get("websiteId") === "string"
      ? String(formData.get("websiteId")).trim().slice(0, 80)
      : "";
  const purposeInput =
    typeof formData.get("purpose") === "string"
      ? String(formData.get("purpose")).trim().slice(0, 24)
      : "";
  const purpose = purposeInput === "favicon" || purposeInput === "logo" ? purposeInput : null;
  if (!(upload instanceof File) || upload.size < 1 || upload.size > maxBytes) return null;
  return { upload, folderId, websiteId, purpose };
}

export function mediaType(
  contentType: string,
): { kind: "image" | "document"; extension: string } | null {
  return (
    (
      {
        "image/jpeg": { kind: "image", extension: "jpg" },
        "image/png": { kind: "image", extension: "png" },
        "image/webp": { kind: "image", extension: "webp" },
        "image/gif": { kind: "image", extension: "gif" },
        "application/pdf": { kind: "document", extension: "pdf" },
      } as Record<string, { kind: "image" | "document"; extension: string }>
    )[contentType] ?? null
  );
}

export function hasExpectedSignature(bytes: Buffer, contentType: string): boolean {
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (contentType === "image/png")
    return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (contentType === "image/webp")
    return (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    );
  if (contentType === "image/gif") {
    const signature = bytes.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}
