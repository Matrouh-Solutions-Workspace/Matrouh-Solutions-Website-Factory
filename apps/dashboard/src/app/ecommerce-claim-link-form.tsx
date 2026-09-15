"use client";

import { useActionState, useState } from "react";
import { createEcommerceClaimLinkAction, type EcommerceClaimLinkState } from "@/app/actions";
import { CopyClaimLink } from "@/app/copy-claim-link";

const initialState: EcommerceClaimLinkState = { status: "idle" };

export function EcommerceClaimLinkForm({
  initialClaimLink,
  returnTo,
  websiteId,
}: {
  readonly initialClaimLink: string | undefined;
  readonly returnTo: string;
  readonly websiteId: string;
}) {
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(createEcommerceClaimLinkAction, initialState);
  const hasEmail = email.trim().length > 0;
  const claimUrl = state.claimUrl ?? initialClaimLink;

  return (
    <div className="ecommerceClaimLinkManager">
      <form action={formAction} className="settingsForm commerceCompactForm">
        <input name="websiteId" type="hidden" value={websiteId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label>
          Owner email (optional)
          <input
            autoComplete="email"
            name="intendedEmail"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@example.com"
            type="email"
            value={email}
          />
        </label>
        <div className="ecommerceClaimActions">
          <button
            className="claimLinkSubmit"
            disabled={pending}
            name="delivery"
            type="submit"
            value={hasEmail ? "email" : "link"}
          >
            {pending
              ? "Creating claim link…"
              : hasEmail
                ? "Create & send to owner"
                : "Create owner claim link"}
          </button>
          {hasEmail ? (
            <button
              className="secondaryButton"
              disabled={pending}
              name="delivery"
              type="submit"
              value="link"
            >
              Create link only
            </button>
          ) : null}
        </div>
      </form>

      {state.status === "error" ? (
        <p className="formError" role="alert">
          Unable to create the claim link. Please try again.
        </p>
      ) : null}

      {claimUrl ? (
        <div className="claimLinkSuccess" role="status">
          <div className="claimLinkSuccessHead">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{state.emailedTo ? "Invitation email queued" : "Claim link ready"}</strong>
              {state.emailedTo ? <small>{state.emailedTo}</small> : null}
            </div>
          </div>
          <CopyClaimLink value={claimUrl} />
        </div>
      ) : null}
    </div>
  );
}
