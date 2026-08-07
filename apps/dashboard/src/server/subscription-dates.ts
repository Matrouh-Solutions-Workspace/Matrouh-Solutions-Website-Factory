export type SubscriptionCadenceValue = "trial" | "monthly" | "yearly";

export function defaultSubscriptionExpiry(
  cadence: SubscriptionCadenceValue,
  startsAt: Date = new Date(),
): Date {
  const expiresAt = new Date(startsAt);
  if (cadence === "trial") {
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  } else if (cadence === "monthly") {
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);
  } else {
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  }
  return expiresAt;
}
