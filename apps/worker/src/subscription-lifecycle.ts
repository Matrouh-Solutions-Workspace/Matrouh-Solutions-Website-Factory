export type SubscriptionCadence = "trial" | "monthly" | "yearly";

export interface SubscriptionNotice {
  readonly key: "30d" | "3d" | "24h" | "3h";
  readonly label: string;
}

export interface SubscriptionExpiredMessage {
  readonly recipientEmail: string;
  readonly kind: string;
  readonly subject: string;
  readonly bodyText: string;
}

export function subscriptionExpiredMessage(input: {
  readonly cadence: SubscriptionCadence;
  readonly expiresAt: Date;
  readonly recipientEmail: string | null;
  readonly websiteName: string;
}): SubscriptionExpiredMessage | null {
  const recipientEmail = input.recipientEmail?.trim().toLowerCase();
  if (!recipientEmail) return null;

  const plan = input.cadence === "trial" ? "trial" : `${input.cadence} plan`;
  return {
    recipientEmail,
    kind: `subscription.expired.${input.expiresAt.getTime()}`,
    subject: `${input.websiteName} subscription has expired`,
    bodyText: `Your ${plan} subscription for ${input.websiteName} has expired. The website is now offline. Please contact Matrouh Solutions to renew service.`,
  };
}

export function subscriptionNotice(
  cadence: SubscriptionCadence,
  millisecondsRemaining: number,
): SubscriptionNotice | null {
  const hours = millisecondsRemaining / 3_600_000;
  if (hours <= 0) return null;
  if (cadence === "trial") {
    if (hours <= 3) return { key: "3h", label: "within 3 hours" };
    if (hours <= 24) return { key: "24h", label: "within 24 hours" };
    return null;
  }
  if (hours <= 24) return { key: "24h", label: "within 24 hours" };
  if (hours <= 72) return { key: "3d", label: "within 3 days" };
  if (cadence === "yearly" && hours <= 24 * 30) {
    return { key: "30d", label: "within 1 month" };
  }
  return null;
}
