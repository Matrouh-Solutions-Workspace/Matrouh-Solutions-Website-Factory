"use client";

import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";

export function LoginForm({
  invalid,
  authMode,
}: {
  readonly invalid: boolean;
  readonly authMode: "demo" | "oidc";
}) {
  if (authMode === "oidc") {
    return (
      <section className="panel loginCard">
        <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
        <p className="eyebrow">Matrouh Factory</p>
        <h1>Welcome back</h1>
        <p>Continue through your organization&apos;s secure identity provider.</p>
        {invalid ? <p role="alert">Sign-in could not be completed. Please try again.</p> : null}
        <a className="buttonLink" href="/api/auth/start">
          Continue with SSO
        </a>
      </section>
    );
  }
  return (
    <form action={loginAction} className="panel loginCard">
      <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
      <p className="eyebrow">Matrouh Factory</p>
      <h1>Welcome back</h1>
      <p>Sign in to manage websites, content, domains, and publications for your workspace.</p>
      <label htmlFor="credential">Session credential</label>
      <input
        aria-invalid={invalid}
        autoComplete="current-password"
        autoFocus
        id="credential"
        name="credential"
        placeholder="Paste your secure credential"
        required
        type="password"
      />
      {invalid ? <p role="alert">The credential is invalid or expired.</p> : null}
      <SubmitButton />
      <small className="loginHint">
        Credentials stay in an HTTP-only session cookie and are never displayed after sign-in.
      </small>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? "Signing in…" : "Continue"}
    </button>
  );
}
