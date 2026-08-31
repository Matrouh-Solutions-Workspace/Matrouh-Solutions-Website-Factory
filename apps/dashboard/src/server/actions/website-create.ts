import { websiteLanguageSelection } from "../website-languages";

export interface WebsiteCreationInput {
  name: string;
  templateKey: string;
  hostnameInput: string;
  clientId: string | null;
  cadenceInput: string;
  cadence: "trial" | "monthly" | "yearly" | null;
  expiresOn: string;
  languages: NonNullable<ReturnType<typeof websiteLanguageSelection>>;
}

function text(value: FormDataEntryValue | null, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseWebsiteCreationInput(formData: FormData): WebsiteCreationInput | null {
  const name = text(formData.get("name"), 120);
  const templateKey = text(formData.get("template"), 260);
  const hostnameInput = text(formData.get("hostname"), 80);
  const clientId = text(formData.get("clientId"), 80) || null;
  const cadenceInput = text(formData.get("subscriptionCadence"), 20);
  const cadence =
    cadenceInput === "trial" || cadenceInput === "monthly" || cadenceInput === "yearly"
      ? cadenceInput
      : null;
  const expiresOn = text(formData.get("subscriptionExpiresAt"), 32);
  const languages = websiteLanguageSelection(
    text(formData.get("languageMode"), 10),
    text(formData.get("defaultLanguage"), 10),
  );
  if (!name || !templateKey || !languages) return null;
  return {
    name,
    templateKey,
    hostnameInput,
    clientId,
    cadenceInput,
    cadence,
    expiresOn,
    languages,
  };
}
