import { notFound } from "next/navigation";
import { getDashboardContext } from "@/server/auth";
import { findWebsiteClaim } from "@/server/website-claims";
import { claimWebsiteAction, registerAndClaimWebsiteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const claim = await findWebsiteClaim(token);
  if (!claim) notFound();
  const context = await getDashboardContext();
  const error = (await searchParams).error;
  return (
    <main className="loginShell">
      <section className="panel loginCard">
        <p className="eyebrow">Website ownership</p>
        <h1>Claim {claim.websiteName}</h1>
        <p>This secure link expires automatically and can only be used once.</p>
        {error === "email" ? (
          <p role="alert">Use the email address this invitation was sent to.</p>
        ) : null}
        {error === "password" ? (
          <p role="alert">Passwords must match and contain at least 10 characters.</p>
        ) : null}
        {error === "registration" ? (
          <p role="alert">We could not create the account. Please try again or contact support.</p>
        ) : null}
        {context ? (
          <form action={claimWebsiteAction}>
            <input name="token" type="hidden" value={token} />
            <p>
              Signed in as <strong>{context.actor.email}</strong>
            </p>
            <button type="submit">Claim website</button>
          </form>
        ) : (
          <>
            <a
              className="buttonLink secondaryButton"
              href={`/login?next=${encodeURIComponent(`/claim/${token}`)}`}
            >
              I already have an account
            </a>
            <form action={registerAndClaimWebsiteAction} className="claimRegisterForm">
              <input name="token" type="hidden" value={token} />
              <label>
                Name
                <input autoComplete="name" name="displayName" required />
              </label>
              <label>
                Email
                <input
                  autoComplete="email"
                  defaultValue={claim.intendedEmail ?? ""}
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label>
                Password
                <input
                  autoComplete="new-password"
                  minLength={10}
                  name="password"
                  required
                  type="password"
                />
              </label>
              <label>
                Confirm password
                <input
                  autoComplete="new-password"
                  minLength={10}
                  name="confirmPassword"
                  required
                  type="password"
                />
              </label>
              <button type="submit">Create account and claim</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
