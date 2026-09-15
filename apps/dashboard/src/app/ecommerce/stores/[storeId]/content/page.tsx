import { redirect } from "next/navigation";
import { loadEcommerceStoreDashboard } from "@/server/ecommerce";
import {
  ecommerceContentDefaults,
  ecommerceContentOverrides,
  ecommerceContentFields,
} from "@/server/ecommerce-content";
import { updateEcommerceContentAction } from "@/app/ecommerce/actions";
import { EcommerceStorePreview } from "@/app/ecommerce-store-preview";
import { MediaPicker } from "@/app/media-picker";
import { dashboardMediaPath } from "@/server/media-storage";
import { PendingSubmit } from "@/app/pending-submit";
import { dashboardConfig } from "@/server/config";

export const dynamic = "force-dynamic";
type ContentField = { key: string; label: string; multiline?: boolean };

export async function EcommerceContentEditor({
  params,
  searchParams,
  clientView = false,
}: {
  params: Promise<{ storeId: string }>;
  searchParams?: Promise<{ locale?: string }>;
  clientView?: boolean;
}) {
  const { storeId } = await params;
  const { store, administrator, mediaAssets } = await loadEcommerceStoreDashboard(storeId);
  if (!administrator && !clientView) redirect(`/account/ecommerce/stores/${store.id}/content`);
  const requestedLocale = (await searchParams)?.locale;
  const locale =
    requestedLocale === "ar" || requestedLocale === "en"
      ? requestedLocale
      : store.defaultLocale === "ar"
        ? "ar"
        : "en";
  const kind =
    store.templateVersion.rendererKey.includes("hardware") ||
    store.templateVersion.rendererKey.includes("pc")
      ? "hardware"
      : "fashion";
  const settings = store.settingsJson as Record<string, unknown>;
  const overrides = ecommerceContentOverrides(settings, locale);
  const defaults = ecommerceContentDefaults(locale, kind);
  const previewUrl = store.website.domains[0]?.hostnameDisplay
    ? storefrontUrl(store.website.domains[0].hostnameDisplay, locale)
    : `/commerce-template-preview/${encodeURIComponent(store.templateVersion.rendererKey)}?lang=${locale}`;
  const fields: ContentField[] = [
    {
      key: kind === "fashion" ? "announcementFashion" : "announcementHardware",
      label: "Announcement",
    },
    {
      key: kind === "fashion" ? "fashionHeroEyebrow" : "hardwareHeroEyebrow",
      label: "Hero eyebrow",
    },
    { key: kind === "fashion" ? "fashionHeroTitle" : "hardwareHeroTitle", label: "Hero title" },
    {
      key: kind === "fashion" ? "fashionHeroBody" : "hardwareHeroBody",
      label: "Hero description",
      multiline: true,
    },
    {
      key: kind === "fashion" ? "fashionHeroEyebrow2" : "hardwareHeroEyebrow2",
      label: "Second hero eyebrow",
    },
    {
      key: kind === "fashion" ? "fashionHeroTitle2" : "hardwareHeroTitle2",
      label: "Second hero title",
    },
    {
      key: kind === "fashion" ? "fashionHeroBody2" : "hardwareHeroBody2",
      label: "Second hero description",
      multiline: true,
    },
    { key: "shopNow", label: "Shop button" },
    { key: "exploreCategories", label: "Categories button" },
    { key: "editorialEyebrow", label: "Editorial eyebrow" },
    { key: "editorialTitle", label: "Editorial title" },
    { key: "editorialText", label: "Editorial text", multiline: true },
    { key: "catalog", label: "Catalog title" },
    { key: "allProducts", label: "Catalog description" },
    {
      key: kind === "fashion" ? "catalogFashionText" : "catalogHardwareText",
      label: "Catalog helper text",
      multiline: true,
    },
  ].filter((field) => ecommerceContentFields.includes(field.key as never));
  const pickerAssets = mediaAssets.map((asset) => ({
    id: asset.id,
    name: asset.originalFilename,
    url: dashboardMediaPath(asset.id),
  }));
  return (
    <main className="ecommerceContentEditor">
      <header>
        <div>
          <p className="eyebrow">Website content</p>
          <h1>{store.name}</h1>
          <p className="sub">Edit the existing storefront text. No sections are added.</p>
        </div>
        <a
          className="buttonLink secondaryButton"
          href={
            clientView ? `/account/ecommerce/stores/${store.id}` : `/ecommerce/stores/${store.id}`
          }
        >
          Back to store
        </a>
      </header>
      <EcommerceStorePreview
        initiallyVisible={!clientView}
        openUrl={null}
        storeName={store.name}
        storefrontUrl={previewUrl}
      />
      <div className="contentLocaleLinks">
        <a className={locale === "en" ? "active" : ""} href="?locale=en">
          English
        </a>
        <a className={locale === "ar" ? "active" : ""} href="?locale=ar">
          العربية
        </a>
      </div>
      <form action={updateEcommerceContentAction} className="ecommerceContentForm">
        <input name="storeId" type="hidden" value={store.id} />
        <input name="locale" type="hidden" value={locale} />
        <div className="ecommerceContentMediaGrid">
          <MediaPicker
            assets={pickerAssets}
            defaultValue={typeof settings.heroMediaId === "string" ? settings.heroMediaId : ""}
            label="Hero photo"
            name="heroMediaId"
            noneLabel="Use template hero photo"
            websiteId={store.websiteId}
          />
          <MediaPicker
            assets={pickerAssets}
            defaultValue={typeof settings.logoMediaId === "string" ? settings.logoMediaId : ""}
            label="Logo photo"
            name="logoMediaId"
            noneLabel="Use template logo"
            websiteId={store.websiteId}
          />
        </div>
        <div className="ecommerceContentGrid">
          {fields.map((field) => {
            const value =
              overrides[field.key] ?? (defaults as Record<string, string>)[field.key] ?? "";
            return (
              <label key={field.key}>
                <span>{field.label}</span>
                {field.multiline ? (
                  <textarea name={field.key} defaultValue={value} rows={3} />
                ) : (
                  <input name={field.key} defaultValue={value} />
                )}
              </label>
            );
          })}
        </div>
        <PendingSubmit className="buttonLink" pendingLabel="Saving website content…">
          Save website content
        </PendingSubmit>
      </form>
    </main>
  );
}

function storefrontUrl(hostname: string, locale: string): string {
  const url = new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  url.hostname = hostname;
  url.pathname = "/";
  url.searchParams.set("lang", locale);
  return url.toString();
}

export default function EcommerceContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  return <EcommerceContentEditor params={params} searchParams={searchParams} />;
}
