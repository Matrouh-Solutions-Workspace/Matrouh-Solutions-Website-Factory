type RestorableWebsiteStatus = "draft" | "published" | "unpublished" | "disabled" | "archived";

export function renewalResumeStatus(
  previousStatus: RestorableWebsiteStatus | null,
): Exclude<RestorableWebsiteStatus, "archived"> {
  if (
    previousStatus === "published" ||
    previousStatus === "draft" ||
    previousStatus === "disabled"
  ) {
    return previousStatus;
  }
  return "unpublished";
}
