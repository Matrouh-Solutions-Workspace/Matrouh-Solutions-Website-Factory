export function latestTemplateVersion(versions: readonly string[]): string | null {
  return (
    [...versions].sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true, sensitivity: "base" }),
    )[0] ?? null
  );
}
