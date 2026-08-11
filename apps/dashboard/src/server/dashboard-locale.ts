import { cookies } from "next/headers";
import { UI_LOCALE_COOKIE, uiLocale, type UiLocale } from "@/server/ui-locale";

export async function dashboardLocale(): Promise<UiLocale> {
  return uiLocale((await cookies()).get(UI_LOCALE_COOKIE)?.value);
}

export function dashboardText(locale: UiLocale, english: string, arabic: string): string {
  return locale === "ar" ? arabic : english;
}
