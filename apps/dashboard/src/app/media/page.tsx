import { createMediaFolderAction, deleteMediaAction, uploadMediaAction } from "@/app/actions";
import { ConfirmSubmit } from "@/app/confirm-submit";
import { PendingSubmit } from "@/app/pending-submit";
import { loadMediaLibrary } from "@/server/control-data";
import { dashboardConfig } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; folder?: string }>;
}) {
  const parameters = await searchParams;
  const query = parameters.q?.trim().slice(0, 120) ?? "";
  const folderId = parameters.folder?.trim().slice(0, 80) ?? "";
  const { assets, folders } = await loadMediaLibrary({ query, folderId });
  const totalBytes = assets.reduce((sum, asset) => sum + Number(asset.byteSize), 0);
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Assets</p>
          <h1>Media library</h1>
          <p className="sub">Scan, organize, and safely reuse assets across your websites.</p>
        </div>
        <a className="buttonLink" href="#upload-media">
          Upload media
        </a>
      </header>
      <section className="stats compactStats">
        <article>
          <p>Ready assets</p>
          <strong>{assets.filter((item) => item.status === "ready").length}</strong>
          <small>Scanned and processed</small>
        </article>
        <article>
          <p>Storage</p>
          <strong>{formatBytes(totalBytes)}</strong>
          <small>Organization quota usage</small>
        </article>
        <article>
          <p>Folders</p>
          <strong>{folders.length}</strong>
          <small>Organization scoped</small>
        </article>
      </section>
      <form action="/media" className="panel mediaFilters" method="get">
        <label>
          Search assets
          <input defaultValue={query} name="q" placeholder="Filename" type="search" />
        </label>
        <label>
          Folder
          <select defaultValue={folderId} name="folder">
            <option value="">All folders</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply filters</button>
        {(query || folderId) && (
          <a className="textLink" href="/media">
            Clear
          </a>
        )}
      </form>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Recent uploads</p>
              <h2>Assets</h2>
            </div>
            <span>{assets.length} visible</span>
          </div>
          <div className="assetGrid">
            {assets.map((asset) => (
              <article className="assetCard" key={asset.id}>
                {asset.kind === "image" && asset.status === "ready" ? (
                  <div
                    className="assetPreview assetPreview--image"
                    style={{
                      backgroundImage: `url(${mediaUrl(asset.storageKey, asset.organizationId)})`,
                    }}
                  >
                    <span>Image asset</span>
                  </div>
                ) : (
                  <div className="assetPreview assetPreview--document">PDF</div>
                )}
                <div>
                  <strong title={asset.originalFilename}>{asset.originalFilename}</strong>
                  <p>
                    {asset.folder?.name ?? "Unfiled"} · {formatBytes(Number(asset.byteSize))}
                  </p>
                </div>
                <div className="assetMeta">
                  <span className="status">{asset.status}</span>
                  <small>
                    {asset._count.references} refs · {asset._count.variants} variants
                  </small>
                </div>
                <form action={deleteMediaAction}>
                  <input name="assetId" type="hidden" value={asset.id} />
                  <ConfirmSubmit
                    className="dangerButton"
                    confirmation="Delete this asset? Its files will be permanently removed after 24 hours."
                    disabled={asset._count.references > 0}
                    pendingLabel="Deleting…"
                  >
                    Delete
                  </ConfirmSubmit>
                  {asset._count.references > 0 && (
                    <small>Remove all content references before deleting.</small>
                  )}
                </form>
              </article>
            ))}
          </div>
          {assets.length === 0 && (
            <div className="emptyState">
              <strong>Your library is empty</strong>
              <p>Upload a JPG, PNG, WebP, GIF, or PDF up to 5 MB.</p>
            </div>
          )}
        </div>
        <div className="sideStack">
          <form action={uploadMediaAction} className="panel createPanel" id="upload-media">
            <div className="panelHead">
              <div>
                <p className="eyebrow">Secure upload</p>
                <h2>Upload asset</h2>
              </div>
            </div>
            <label>
              File
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                name="file"
                type="file"
                required
              />
            </label>
            <label>
              Folder
              <select name="folderId">
                <option value="">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="formNotice">
              Files are checked by content signature and stored by SHA-256 hash.
            </p>
            <PendingSubmit pendingLabel="Uploading…">Upload asset</PendingSubmit>
          </form>
          <form action={createMediaFolderAction} className="panel createPanel">
            <div className="panelHead">
              <div>
                <p className="eyebrow">Organize</p>
                <h2>New folder</h2>
              </div>
            </div>
            <label>
              Folder name
              <input name="name" maxLength={160} required />
            </label>
            <PendingSubmit pendingLabel="Creating…">Create folder</PendingSubmit>
          </form>
        </div>
      </section>
    </>
  );
}

function formatBytes(value: number): string {
  if (value < 1_000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

function mediaUrl(storageKey: string, organizationId: string): string {
  const filename = storageKey.split("/").at(-1) ?? "";
  const base =
    dashboardConfig.FACTORY_MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    dashboardConfig.FACTORY_RENDERER_PUBLIC_URL.replace(/\/$/, "");
  return `${base}/factory-media/${organizationId}/${encodeURIComponent(filename)}`;
}
