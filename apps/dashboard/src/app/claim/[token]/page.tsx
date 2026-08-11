import { notFound } from "next/navigation";
import { getDashboardContext } from "@/server/auth";
import { findWebsiteClaim } from "@/server/website-claims";
import { claimWebsiteAction, registerAndClaimWebsiteAction } from "./actions";

export const dynamic = "force-dynamic";

type ClaimLocale = "ar" | "en";

const copy = {
  ar: {
    eyebrow: "ملكية الموقع",
    title: (websiteName: string) => `استلام ملكية ${websiteName}`,
    description: "هذا الرابط الآمن ينتهي تلقائيًا ويمكن استخدامه مرة واحدة فقط.",
    signedInAs: "مسجّل الدخول باسم",
    claimWebsite: "استلام ملكية الموقع",
    existingAccount: "لدي حساب بالفعل",
    createAndClaim: "إنشاء الحساب واستلام الموقع",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    switchLanguage: "English",
    emailError: "استخدم عنوان البريد الإلكتروني الذي أُرسلت إليه الدعوة.",
    passwordError: "يجب أن تتطابق كلمتا المرور وأن تتكون كلمة المرور من 10 أحرف على الأقل.",
    registrationError: "تعذر إنشاء الحساب. حاول مرة أخرى أو تواصل مع الدعم.",
    invalidError: "رابط استلام الملكية غير صالح أو تم استخدامه بالفعل.",
  },
  en: {
    eyebrow: "Website ownership",
    title: (websiteName: string) => `Claim ${websiteName}`,
    description: "This secure link expires automatically and can only be used once.",
    signedInAs: "Signed in as",
    claimWebsite: "Claim website",
    existingAccount: "I already have an account",
    createAndClaim: "Create account and claim",
    name: "Name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    switchLanguage: "العربية",
    emailError: "Use the email address this invitation was sent to.",
    passwordError: "Passwords must match and contain at least 10 characters.",
    registrationError: "We could not create the account. Please try again or contact support.",
    invalidError: "This ownership link is invalid or has already been used.",
  },
} as const;

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; locale?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const locale: ClaimLocale = query.locale === "en" ? "en" : "ar";
  const text = copy[locale];
  const claim = await findWebsiteClaim(token);
  if (!claim) notFound();
  const context = await getDashboardContext();
  const alternateLocale: ClaimLocale = locale === "ar" ? "en" : "ar";
  const claimPath = (targetLocale: ClaimLocale) =>
    `/claim/${token}?locale=${encodeURIComponent(targetLocale)}`;
  const loginPath = new URLSearchParams({ next: `/claim/${token}`, locale });

  return (
    <main className="loginShell" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <section className="panel loginCard authCard">
        <a className="textLink loginLanguageLink" href={claimPath(alternateLocale)}>
          {text.switchLanguage}
        </a>
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title(claim.websiteName)}</h1>
        <p>{text.description}</p>
        {query.error === "email" ? <p role="alert">{text.emailError}</p> : null}
        {query.error === "password" ? <p role="alert">{text.passwordError}</p> : null}
        {query.error === "registration" ? <p role="alert">{text.registrationError}</p> : null}
        {query.error === "invalid" ? <p role="alert">{text.invalidError}</p> : null}
        {context ? (
          <form action={claimWebsiteAction}>
            <input name="token" type="hidden" value={token} />
            <input name="locale" type="hidden" value={locale} />
            <p>
              {text.signedInAs} <strong>{context.actor.email}</strong>
            </p>
            <button type="submit">{text.claimWebsite}</button>
          </form>
        ) : (
          <>
            <a className="buttonLink secondaryButton" href={`/login?${loginPath.toString()}`}>
              {text.existingAccount}
            </a>
            <form action={registerAndClaimWebsiteAction} className="claimRegisterForm">
              <input name="token" type="hidden" value={token} />
              <input name="locale" type="hidden" value={locale} />
              <label>
                {text.name}
                <input autoComplete="name" name="displayName" required />
              </label>
              <label>
                {text.email}
                <input
                  autoComplete="email"
                  defaultValue={claim.intendedEmail ?? ""}
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label>
                {text.password}
                <input
                  autoComplete="new-password"
                  minLength={10}
                  name="password"
                  required
                  type="password"
                />
              </label>
              <label>
                {text.confirmPassword}
                <input
                  autoComplete="new-password"
                  minLength={10}
                  name="confirmPassword"
                  required
                  type="password"
                />
              </label>
              <button type="submit">{text.createAndClaim}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
