"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { configureWebsiteCustomDomainAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";

type Locale = "ar" | "en";

export function CustomDomainStatusRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  useEffect(() => {
    if (!active || refreshing) return;
    const timeout = window.setTimeout(() => startRefresh(() => router.refresh()), 2_000);
    return () => window.clearTimeout(timeout);
  }, [active, refreshing, router]);
  return null;
}

export function CustomDomainSetup({
  websiteId,
  locale,
  ingressIpv4,
}: {
  websiteId: string;
  locale: Locale;
  ingressIpv4: string;
}) {
  const [domain, setDomain] = useState("");
  const normalizedDomain = useMemo(
    () =>
      domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, ""),
    [domain],
  );
  const ar = locale === "ar";

  return (
    <div className="customDomainWizard" dir={ar ? "rtl" : "ltr"}>
      <div className="domainWizardStep">
        <span className="domainStepNumber">1</span>
        <div>
          <strong>{ar ? "اكتب الدومين" : "Enter the domain"}</strong>
          <p>
            {ar
              ? "اكتب الدومين الرئيسي بدون https أو www."
              : "Enter the root domain without https or www."}
          </p>
        </div>
      </div>

      <form action={configureWebsiteCustomDomainAction} className="customDomainConnectForm">
        <input name="websiteId" type="hidden" value={websiteId} />
        <input name="includeApex" type="hidden" value="on" />
        <input name="includeWww" type="hidden" value="on" />
        <input name="subdomainMode" type="hidden" value="none" />
        <label>
          {ar ? "الدومين الرئيسي" : "Root domain"}
          <input
            name="rootHostname"
            placeholder="emadramsis.com"
            required
            maxLength={253}
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          />
        </label>

        {normalizedDomain ? (
          <div className="domainDnsPreview">
            <div className="domainWizardStep compact">
              <span className="domainStepNumber">2</span>
              <div>
                <strong>{ar ? "أضف سجلات DNS" : "Add these DNS records"}</strong>
                <p>
                  {ar
                    ? "أضف السجلين عند مزود DNS. لا نطلب سجل TXT أو تحقق ملكية منفصل."
                    : "Add both records at your DNS provider. No TXT record or separate ownership check is required."}
                </p>
              </div>
            </div>
            <DnsRecord type="A" name="@" value={ingressIpv4} />
            <DnsRecord type="CNAME" name="www" value={normalizedDomain} />
            <small>
              {ar ? "يمكنك الاختبار فور انتشار DNS." : "You can test as soon as DNS propagates."}
            </small>
          </div>
        ) : null}

        <PendingSubmit pendingLabel={ar ? "جارٍ ربط الدومين…" : "Connecting domain…"}>
          {ar ? "حفظ وربط الدومين" : "Save and connect domain"}
        </PendingSubmit>
      </form>
    </div>
  );
}

export function CustomSubdomainSetup({
  websiteId,
  locale,
  roots,
  ingressIpv4,
}: {
  websiteId: string;
  locale: Locale;
  roots: string[];
  ingressIpv4: string;
}) {
  const [mode, setMode] = useState<"selected" | "wildcard">("selected");
  const ar = locale === "ar";
  if (roots.length === 0) return null;

  return (
    <form
      action={configureWebsiteCustomDomainAction}
      className="customSubdomainForm"
      dir={ar ? "rtl" : "ltr"}
    >
      <input name="websiteId" type="hidden" value={websiteId} />
      <div className="domainWizardStep">
        <span className="domainStepNumber">4</span>
        <div>
          <strong>{ar ? "خصص النطاقات الفرعية" : "Customize subdomains"}</strong>
          <p>
            {ar
              ? "أضف عناوين فرعية للدومين نفسه أو فعّلها كلها. لن تُعامل كدومينات منفصلة."
              : "Add routes under the same domain or enable all subdomains. They are not treated as separate domains."}
          </p>
        </div>
      </div>
      <label>
        {ar ? "الدومين" : "Domain"}
        <select name="rootHostname">
          {roots.map((root) => (
            <option key={root} value={root}>
              {root}
            </option>
          ))}
        </select>
      </label>
      <label>
        {ar ? "النطاقات الفرعية" : "Subdomains"}
        <select
          name="subdomainMode"
          value={mode}
          onChange={(event) => setMode(event.target.value as "selected" | "wildcard")}
        >
          <option value="selected">{ar ? "نطاقات محددة" : "Selected only"}</option>
          <option value="wildcard">{ar ? "كل النطاقات الفرعية" : "All subdomains"}</option>
        </select>
      </label>
      {mode === "selected" ? (
        <label>
          {ar ? "الأسماء" : "Labels"}
          <input name="selectedSubdomains" placeholder="booking, portal" required maxLength={500} />
          <span className="fieldHint">
            {ar ? "افصل بين الأسماء بفاصلة." : "Separate labels with commas."}
          </span>
        </label>
      ) : null}
      {mode === "wildcard" ? (
        <div className="domainDnsPreview">
          <DnsRecord type="A" name="*" value={ingressIpv4} />
          <small>
            {ar ? "أضف هذا السجل أولًا ثم اضغط إضافة." : "Add this record first, then submit."}
          </small>
        </div>
      ) : null}
      <PendingSubmit pendingLabel={ar ? "جارٍ الإضافة…" : "Adding…"}>
        {ar ? "إضافة النطاقات الفرعية" : "Add subdomains"}
      </PendingSubmit>
    </form>
  );
}

function DnsRecord({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="dnsRecordRow">
      <code>{type}</code>
      <code>{name}</code>
      <code>{value}</code>
    </div>
  );
}
