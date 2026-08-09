"use client";

import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";

export function LoginForm({
  invalid,
  authMode,
  next,
}: {
  readonly invalid: boolean;
  readonly authMode: "demo" | "oidc";
  readonly next?: string | undefined;
}) {
  if (authMode === "oidc") {
    return (
      <section className="panel loginCard">
        <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
        <p className="eyebrow">Matrouh Solutions</p>
        <h1>بوابة لوحة التحكم</h1>
        <p>سجّل الدخول لإدارة مواقعك ومحتواك ونطاقاتك ونشرها من مكان واحد.</p>
        {invalid ? <p role="alert">تعذّر تسجيل الدخول. يُرجى المحاولة مرة أخرى.</p> : null}
        <a className="buttonLink" href="/api/auth/start">
          تسجيل الدخول
        </a>
      </section>
    );
  }
  return (
    <form action={loginAction} className="panel loginCard">
      <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
      <p className="eyebrow">Matrouh Solutions</p>
      <h1>بوابة لوحة التحكم</h1>
      <p>سجّل الدخول لإدارة مواقعك ومحتواك ونطاقاتك ونشرها من مكان واحد.</p>
      {next ? <input name="next" type="hidden" value={next} /> : null}
      <label htmlFor="email">البريد الإلكتروني</label>
      <input
        aria-invalid={invalid}
        autoComplete="email"
        autoFocus
        id="email"
        name="email"
        placeholder="Boreto"
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
      {invalid ? <p role="alert">البريد الإلكتروني أو كلمة المرور غير صحيحين.</p> : null}
      <SubmitButton />
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
