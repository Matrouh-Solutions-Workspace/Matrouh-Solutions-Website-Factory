import type { PublicationSnapshot } from "@factory/publication-contract";
import type { WhatsAppContactProperties } from "@/app/whatsapp-contact";

export function whatsappContactSettings(
  snapshot: PublicationSnapshot,
  locale: string,
): WhatsAppContactProperties | null {
  const settings = snapshot.website.settings;
  const values =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  if (values.whatsappEnabled === false) return null;

  const arabic = locale.toLowerCase().startsWith("ar");
  const phone = firstText(values, "whatsappPhone", "centralPhone", "phone") ?? "+20 100 000 0000";
  return {
    phone,
    greeting:
      text(values, arabic ? "whatsappGreetingAr" : "whatsappGreeting") ??
      (arabic ? "أهلاً بك" : "Welcome"),
    availability:
      text(values, arabic ? "whatsappAvailabilityAr" : "whatsappAvailability") ??
      (arabic ? "فريقنا متاح لمساعدتك" : "Our team is ready to help"),
    prompt:
      text(values, arabic ? "whatsappPromptAr" : "whatsappPrompt") ??
      (arabic ? "كيف يمكننا مساعدتك؟" : "How can we help you?"),
    buttonLabel:
      text(values, arabic ? "whatsappButtonLabelAr" : "whatsappButtonLabel") ??
      (arabic ? "تواصل معنا على واتساب" : "Contact us on WhatsApp"),
  };
}

function firstText(values: Readonly<Record<string, unknown>>, ...keys: readonly string[]) {
  for (const key of keys) {
    const value = text(values, key);
    if (value) return value;
  }
  return undefined;
}

function text(values: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = values[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
