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
      {next ? <input name="next" type="hidden" value={next} /> : null}
      <label htmlFor="email">Email</label>
      <input
        aria-invalid={invalid}
        autoComplete="email"
        autoFocus
        id="email"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
      <label htmlFor="password">Password</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        required
        type="password"
      />
      {invalid ? <p role="alert">The email or password is incorrect.</p> : null}
      <SubmitButton />
      <small className="loginHint">Local demo: owner@matrouh.local / MatrouhDemo2026!</small>
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
