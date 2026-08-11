"use client";

import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";

export function LoginForm({
  authMode,
  error,
  next,
  reset,
}: {
  readonly authMode: "demo" | "oidc";
  readonly error?: string;
  readonly next?: string;
  readonly reset: boolean;
}) {
  if (authMode === "oidc") {
    return (
      <section className="panel loginCard authCard">
        <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
        <p className="eyebrow">Matrouh Solutions</p>
        <h1>بوابة لوحة التحكم</h1>
        <p>سجّل الدخول لإدارة مواقعك ومحتواك ونطاقاتك ونشرها من مكان واحد.</p>
        {reset ? (
          <p className="authSuccess" role="status">
            تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.
          </p>
        ) : null}
        {error ? <p role="alert">تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.</p> : null}
        <a
          className="buttonLink"
          href={`/api/auth/start${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        >
          تسجيل الدخول
        </a>
        <a className="textLink loginRecoveryLink" href="/forgot-password">
          نسيت كلمة المرور؟
        </a>
      </section>
    );
  }
  return (
    <form action={loginAction} className="panel loginCard authCard">
      <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
      <p className="eyebrow">Matrouh Solutions</p>
      <h1>بوابة لوحة التحكم</h1>
      <p>سجّل الدخول لإدارة مواقعك ومحتواك ونطاقاتك ونشرها من مكان واحد.</p>
      {next ? <input name="next" type="hidden" value={next} /> : null}
      {reset ? (
        <p className="authSuccess" role="status">
          تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.
        </p>
      ) : null}
      <label htmlFor="email">البريد الإلكتروني</label>
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
      <label htmlFor="password">كلمة المرور</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        required
        type="password"
      />
      {error ? <p role="alert">البريد الإلكتروني أو كلمة المرور غير صحيحين.</p> : null}
      <SubmitButton />
      <a className="textLink loginRecoveryLink" href="/forgot-password">
        نسيت كلمة المرور؟
      </a>
      <small className="loginHint">بوابة إدارة مواقع Matrouh Solutions</small>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
    </button>
  );
}
