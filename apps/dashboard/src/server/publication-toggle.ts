export function canReuseActivePublication(input: {
  readonly activeStatus: string | null;
  readonly activeDraftRevision: bigint | null;
  readonly websiteDraftRevision: bigint;
}): boolean {
  return (
    input.activeStatus === "ready" &&
    input.activeDraftRevision !== null &&
    input.activeDraftRevision === input.websiteDraftRevision
  );
}
