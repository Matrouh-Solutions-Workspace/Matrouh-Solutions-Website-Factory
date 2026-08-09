"use client";

import { useCallback, useMemo, useState } from "react";
import { createWebsiteAction } from "@/app/actions";
import {
  HostnameAvailabilityField,
  type HostnameAvailability,
} from "@/app/hostname-availability-field";
import { PendingSubmit } from "@/app/pending-submit";

interface Option {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export function WebsiteCreateWizard({
  templates,
  clients,
  creationError,
  initialTemplate,
  hostingDomains,
}: {
  readonly templates: readonly Option[];
  readonly clients: readonly Option[];
  readonly creationError?: string | undefined;
  readonly initialTemplate?: string | undefined;
  readonly hostingDomains: readonly {
    id: string;
    hostname: string;
    isDefault: boolean;
    hostedWebsiteCount: number;
  }[];
}) {
  const [step, setStep] = useState(0);
  const [languageMode, setLanguageMode] = useState("both");
  const [cadence, setCadence] = useState("monthly");
  const [hostingDomainId, setHostingDomainId] = useState(
    hostingDomains.find((domain) => domain.isDefault)?.id ?? hostingDomains[0]?.id ?? "",
  );
  const [hostnameAvailability, setHostnameAvailability] = useState<HostnameAvailability>("idle");
  const handleHostnameAvailability = useCallback(
    (status: HostnameAvailability) => setHostnameAvailability(status),
    [],
  );
  const steps = useMemo(() => ["Website", "Audience", "Subscription", "Review"], []);

  return (
    <form
      action={createWebsiteAction}
      className="panel createPanel websiteWizard"
      id="create-website"
    >
      <div className="panelHead">
        <div>
          <p className="eyebrow">New website</p>
          <h2>Create website</h2>
        </div>
        <span>
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <ol aria-label="Creation progress" className="wizardProgress">
        {steps.map((label, index) => (
          <li aria-current={index === step ? "step" : undefined} key={label}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {creationError && (
        <p className="formNotice" role="alert">
          {creationError}
        </p>
      )}

      <fieldset hidden={step !== 0}>
        <legend>Website details</legend>
        <label>
          Website name
          <input name="name" placeholder="North Coast Clinic" required />
        </label>
        <HostnameAvailabilityField
          hostingDomainId={hostingDomainId || undefined}
          onAvailabilityChange={handleHostnameAvailability}
        />
        {hostingDomains.length > 0 && (
          <label>
            Hosting domain
            <select
              name="hostingDomainId"
              onChange={(event) => setHostingDomainId(event.target.value)}
              value={hostingDomainId}
            >
              {hostingDomains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.hostname} ({domain.hostedWebsiteCount} hosted)
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Template
          <select defaultValue={initialTemplate} name="template" required>
            {templates.map((template) => (
              <option key={template.id} value={template.value}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset hidden={step !== 1}>
        <legend>Owner and language</legend>
        <label>
          Client
          <select name="clientId">
            <option value="">No owner yet — create a claim link later</option>
            {clients.map((client) => (
              <option key={client.id} value={client.value}>
                {client.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Website languages
          <select
            name="languageMode"
            onChange={(event) => setLanguageMode(event.target.value)}
            value={languageMode}
          >
            <option value="en">English only</option>
            <option value="ar">Arabic only</option>
            <option value="both">English and Arabic</option>
          </select>
        </label>
        {languageMode === "both" ? (
          <label>
            Default language
            <span className="fieldHint">Visitors see this language at the unprefixed URL.</span>
            <select defaultValue="ar" name="defaultLanguage">
              <option value="ar">Arabic</option>
              <option value="en">English</option>
            </select>
          </label>
        ) : (
          <input name="defaultLanguage" type="hidden" value={languageMode} />
        )}
      </fieldset>

      <fieldset hidden={step !== 2}>
        <legend>Subscription</legend>
        <label>
          Plan
          <select
            name="subscriptionCadence"
            onChange={(event) => setCadence(event.target.value)}
            value={cadence}
          >
            <option value="trial">Trial — 24 hours</option>
            <option value="monthly">Monthly — one month</option>
            <option value="yearly">Yearly — one year</option>
            <option value="">No subscription yet</option>
          </select>
        </label>
        <p className="formNotice">
          The expiry is calculated automatically from the creation time. Staff can adjust it later
          from Billing.
        </p>
      </fieldset>

      <fieldset hidden={step !== 3}>
        <legend>Ready to create</legend>
        <div className="wizardReview">
          <strong>Your editable draft is ready to be generated.</strong>
          <p>
            Languages:{" "}
            {languageMode === "both"
              ? "Arabic and English"
              : languageMode === "ar"
                ? "Arabic"
                : "English"}
            {cadence ? ` · ${cadence} subscription` : " · no subscription"}
          </p>
        </div>
      </fieldset>

      <div className="wizardActions">
        {step > 0 && (
          <button
            className="secondaryButton"
            onClick={() => setStep((value) => value - 1)}
            type="button"
          >
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            disabled={step === 0 && hostnameAvailability !== "available"}
            onClick={() => setStep((value) => value + 1)}
            type="button"
          >
            Continue
          </button>
        ) : (
          <PendingSubmit pendingLabel="Creating website…">Create website</PendingSubmit>
        )}
      </div>
    </form>
  );
}
