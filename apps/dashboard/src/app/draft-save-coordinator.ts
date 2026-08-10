const websiteSaveQueues = new Map<string, Promise<unknown>>();

export async function serializeWebsiteSave<T>(
  websiteId: string,
  save: () => Promise<T>,
): Promise<T> {
  const previous = websiteSaveQueues.get(websiteId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(save);
  websiteSaveQueues.set(websiteId, current);
  try {
    return await current;
  } finally {
    if (websiteSaveQueues.get(websiteId) === current) websiteSaveQueues.delete(websiteId);
  }
}

export function newestRevision(left: string | null, right: string | null): string | null {
  const leftRevision = parseRevision(left);
  const rightRevision = parseRevision(right);
  if (leftRevision === null) return rightRevision === null ? null : rightRevision.toString();
  if (rightRevision === null) return leftRevision.toString();
  return (leftRevision > rightRevision ? leftRevision : rightRevision).toString();
}

export function incrementRevision(value: string | null): string | null {
  const revision = parseRevision(value);
  return revision === null ? null : (revision + 1n).toString();
}

function parseRevision(value: string | null): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const revision = BigInt(value);
  return revision > 0n ? revision : null;
}
