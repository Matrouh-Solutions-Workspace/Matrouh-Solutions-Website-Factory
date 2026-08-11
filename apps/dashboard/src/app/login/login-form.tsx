"use client";

import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";

type UiLocale = "ar" | "en";

const copy = {
  ar: {
    title: "بوابة لوحة التحكم",
    description: "سجّل الدخول لإدارة مواقعك ومحتواك ونطاقاتك ونشرها من مكان واحد.",
    signIn: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول…",
    forgotPassword: "نسيت كلمة المرور؟",
    resetComplete: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.",
    loginFailed: "تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحين.",
    hint: "بوابة إدارة مواقع Matrouh Solutions",
    switchLanguage: "English",
  },
  en: {
    title: "Control panel portal",
    description: "Sign in to manage your websites, content, domains, and publishing in one place.",
    signIn: "Sign in",
    signingIn: "Signing in…",
    forgotPassword: "Forgot your password?",
    resetComplete: "Your password was updated. You can sign in now.",
    loginFailed: "We could not sign you in. Please try again.",
    email: "Email address",
    password: "Password",
    invalidCredentials: "The email address or password is incorrect.",
    hint: "Matrouh Solutions website management portal",
    switchLanguage: "العربية",
  },
} as const;

export function LoginForm({
  authMode,
  error,
  next,
  reset,
  locale,
}: {
  readonly authMode: "demo" | "oidc";
  readonly error?: string;
  readonly next?: string;
  readonly reset: boolean;
  readonly locale: UiLocale;
}) {
  const text = copy[locale];
  const signInUrl = new URLSearchParams({ locale });
  if (next) signInUrl.set("next", next);
  const localeUrl = new URLSearchParams({ locale: locale === "ar" ? "en" : "ar" });
  if (next) localeUrl.set("next", next);

  if (authMode === "oidc") {
    return (
      <section className="panel loginCard authCard">
        <a className="textLink loginLanguageLink" href={`/login?${localeUrl.toString()}`}>
          {text.switchLanguage}
        </a>
        <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
        <p className="eyebrow">Matrouh Solutions</p>
        <h1>{text.title}</h1>
        <p>{text.description}</p>
        {reset ? (
          <p className="authSuccess" role="status">
            {text.resetComplete}
          </p>
        ) : null}
        {error ? <p role="alert">{text.loginFailed}</p> : null}
        <a className="buttonLink" href={`/api/auth/start?${signInUrl.toString()}`}>
          {text.signIn}
        </a>
        <a className="textLink loginRecoveryLink" href={`/forgot-password?locale=${locale}`}>
          {text.forgotPassword}
        </a>
      </section>
    );
  }

  return (
    <form action={loginAction} className="panel loginCard authCard">
      <a className="textLink loginLanguageLink" href={`/login?${localeUrl.toString()}`}>
        {text.switchLanguage}
      </a>
      <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
      <p className="eyebrow">Matrouh Solutions</p>
      <h1>{text.title}</h1>
      <p>{text.description}</p>
      {next ? <input name="next" type="hidden" value={next} /> : null}
      {reset ? (
        <p className="authSuccess" role="status">
          {text.resetComplete}
        </p>
      ) : null}
      <label htmlFor="email">{text.email}</label>
      <input
        aria-invalid={Boolean(error)}
        autoComplete="email"
        autoFocus
        id="email"
        name="email"
        placeholder="name@example.com"
        required
        type="email"
      />
      <label htmlFor="password">{text.password}</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        required
        type="password"
      />
      {error ? <p role="alert">{text.invalidCredentials}</p> : null}
      <SubmitButton locale={locale} />
      <a className="textLink loginRecoveryLink" href={`/forgot-password?locale=${locale}`}>
        {text.forgotPassword}
      </a>
      <small className="loginHint">{text.hint}</small>
    </form>
  );
}

function SubmitButton({ locale }: { readonly locale: UiLocale }) {
  const { pending } = useFormStatus();
  const text = copy[locale];
  return (
    <button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? text.signingIn : text.signIn}
    </button>
  );
}
