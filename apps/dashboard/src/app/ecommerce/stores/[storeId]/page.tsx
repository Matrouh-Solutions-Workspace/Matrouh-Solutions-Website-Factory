import { formatMoney } from "@factory/ecommerce";
import { redirect } from "next/navigation";
import { saveWebsiteSubscriptionAction } from "@/app/actions";
import { EcommerceClaimLinkForm } from "@/app/ecommerce-claim-link-form";
import { EcommerceStorePreview } from "@/app/ecommerce-store-preview";
import { CommerceSectionToggle } from "@/app/commerce-section-toggle";
import { PendingSubmit } from "@/app/pending-submit";
import { MediaPicker } from "@/app/media-picker";
import { EcommerceColorPicker } from "@/app/ecommerce-color-picker";
import { EcommerceProductActions } from "@/app/ecommerce-product-actions";
import { EcommerceLocalizedFields } from "@/app/ecommerce-localized-fields";
import {
  adjustEcommerceInventoryAction,
  createEcommerceCategoryAction,
  createEcommerceCouponAction,
  createEcommerceProductAction,
  toggleEcommerceProductStatusAction,
  switchEcommerceTemplateAction,
  toggleEcommerceMethodAction,
  updateEcommerceOrderStatusAction,
  updateEcommerceStoreAction,
} from "@/app/ecommerce/actions";
import { loadEcommerceStoreDashboard, loadEcommerceTemplates } from "@/server/ecommerce";
import { dashboardConfig } from "@/server/config";
import { defaultSubscriptionExpiry } from "@/server/subscription-dates";
import { dashboardMediaPath } from "@/server/media-storage";

export const dynamic = "force-dynamic";

const nextStatuses = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
} as const;

interface EcommerceStorePageProps {
  readonly params: Promise<{ storeId: string }>;
  readonly searchParams: Promise<{ claimLink?: string }>;
  readonly clientView?: boolean;
}

export default function EcommerceStorePage(props: EcommerceStorePageProps) {
  return <EcommerceStoreDashboard {...props} />;
}

export async function EcommerceStoreDashboard({
  params,
  searchParams,
  clientView = false,
}: EcommerceStorePageProps) {
  const { storeId } = await params;
  const query = await searchParams;
  const data = await loadEcommerceStoreDashboard(storeId);
  const templates = await loadEcommerceTemplates();
  const {
    store,
    products,
    categories,
    orders,
    customers,
    coupons,
    sales,
    eventCounts,
    administrator,
    mediaAssets,
  } = data;
  if (!administrator && !clientView) {
    redirect(`/account/ecommerce/stores/${store.id}`);
  }
  const locale = store.defaultLocale === "ar" ? "ar-EG" : "en-US";
  const isArabic = store.defaultLocale === "ar";
  const templateVersions = templates.flatMap((template) =>
    template.versions
      .filter((version) => version.status === "ready")
      .map((version) => ({
        id: version.id,
        label: `${template.name} ${version.version}`,
      })),
  );
  const primaryDomain = store.website.domains[0]?.hostnameDisplay;
  const liveStorefrontUrl = primaryDomain ? publicWebsiteUrl(primaryDomain) : null;
  const templatePreviewUrl = templatePreviewWebsiteUrl(
    store.templateVersion.rendererKey,
    store.defaultLocale === "ar" ? "ar" : "en",
  );
  const storefrontUrl =
    primaryDomain && store.status === "active" && store.website.status === "published"
      ? liveStorefrontUrl
      : templatePreviewUrl;
  const websiteContentHref = `${clientView ? "/account" : ""}/ecommerce/stores/${store.id}/content`;
  const eventMap = new Map(eventCounts.map((row) => [row.eventType, row._count._all]));
  const subscription = store.website.subscription;
  const defaultPlanExpiry = defaultSubscriptionExpiry("monthly");
  const brandTokens = jsonRecord(jsonRecord(store.brandingJson).tokens);
  const whatsappSettings = jsonRecord(store.settingsJson);
  const mediaPickerAssets = mediaAssets.map((asset) => ({
    id: asset.id,
    name: asset.originalFilename,
    url: dashboardMediaPath(asset.id),
  }));

  return (
    <div className={clientView ? "commerceStorePage clientCommerceStorePage" : "commerceStorePage"}>
      <header>
        <div>
          <p className="eyebrow">Commerce control center</p>
          <h1>{store.name}</h1>
          <p className="sub">
            {primaryDomain ?? "No domain"} · {store.templateVersion.template.name}{" "}
            {store.templateVersion.version}
          </p>
        </div>
        <div className="headerActions">
          {primaryDomain ? (
            <a
              className="buttonLink secondaryButton"
              href={storefrontUrl ?? undefined}
              rel="noreferrer"
              target="_blank"
            >
              Open storefront
            </a>
          ) : null}
          <a className="buttonLink secondaryButton" href={websiteContentHref}>
            Website content
          </a>
          <a className="buttonLink" href={clientView ? "/account" : "/ecommerce"}>
            {clientView ? "My websites" : "All stores"}
          </a>
        </div>
      </header>

      <nav aria-label="Commerce sections" className="commerceSectionNav">
        <div className="commerceSectionNavIntro">
          <span>Website content</span>
          <strong>Edit your website</strong>
        </div>
        <a className="commerceSectionNavContentLink" href={websiteContentHref}>
          <span>✎</span> Website content
        </a>
        <a href="#overview">
          <span>01</span> Overview
        </a>
        <a href="#catalog">
          <span>02</span> Catalog
        </a>
        <a href="#inventory">
          <span>03</span> Inventory
        </a>
        <a href="#orders">
          <span>04</span> Orders
        </a>
        <a href="#customers">
          <span>05</span> Customers
        </a>
        <a href="#discounts">
          <span>06</span> Discounts
        </a>
        <a href="#settings">
          <span>07</span> Settings
        </a>
      </nav>

      <section className="websiteSummary" id="overview">
        <article>
          <span>Revenue</span>
          <strong>{formatMoney(sales._sum.totalMinor ?? 0, store.currency, locale)}</strong>
        </article>
        <article>
          <span>Paid orders</span>
          <strong>{sales._count._all}</strong>
        </article>
        <article>
          <span>Products</span>
          <strong>{products.length}</strong>
        </article>
        <article>
          <span>Low stock</span>
          <strong>
            {
              products
                .flatMap((product) => product.variants)
                .filter((variant) => variant.stockQuantity <= variant.lowStockThreshold).length
            }
          </strong>
        </article>
      </section>

      <section className="panel commerceAnalyticsPanel" id="analytics">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Store activity</p>
            <h2>Analytics</h2>
          </div>
          {clientView ? (
            <CommerceSectionToggle initiallyCollapsed={false} targetId="analytics" />
          ) : null}
        </div>
        <div className="websiteSummary compactSummary">
          <article>
            <span>Page views</span>
            <strong>{eventMap.get("page_view") ?? 0}</strong>
          </article>
          <article>
            <span>Product views</span>
            <strong>{eventMap.get("product_view") ?? 0}</strong>
          </article>
          <article>
            <span>Add to cart</span>
            <strong>{eventMap.get("add_to_cart") ?? 0}</strong>
          </article>
          <article>
            <span>Checkout started</span>
            <strong>{eventMap.get("checkout_started") ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="panel" id="catalog">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Products and categories</p>
            <h2>Catalog</h2>
          </div>
          {clientView ? <CommerceSectionToggle targetId="catalog" /> : null}
        </div>
        <div className={`commerceSplit${administrator ? "" : " commerceSplit--single"}`}>
          <div>
            <h3>Add category</h3>
            <form
              action={createEcommerceCategoryAction}
              className="settingsForm commerceCompactForm"
            >
              <input name="storeId" type="hidden" value={store.id} />
              <EcommerceLocalizedFields namesOnly />
              <label>
                Slug
                <input name="slug" />
              </label>
              <button type="submit">Add category</button>
            </form>
            <div className="commerceChipList">
              {categories.map((category) => (
                <span key={category.id}>
                  {translation(category.translations, "en")}{" "}
                  <small>{category._count.products}</small>
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3>Add product</h3>
            <form
              action={createEcommerceProductAction}
              className="settingsForm commerceCompactForm"
            >
              <input name="storeId" type="hidden" value={store.id} />
              <input name="currency" type="hidden" value={store.currency} />
              <EcommerceLocalizedFields />
              <label>
                SKU
                <input name="sku" />
              </label>
              <label>
                Product colors
                <EcommerceColorPicker name="colors" />
              </label>
              <label>
                Price ({store.currency})
                <input min="0" name="price" required step="0.01" type="number" />
              </label>
              <label>
                Initial stock
                <input defaultValue="0" min="0" name="stockQuantity" type="number" />
              </label>
              <label>
                Category
                <select name="categoryId">
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {translation(category.translations, "en")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkboxLabel">
                <input defaultChecked name="published" type="checkbox" /> Publish immediately
              </label>
              <MediaPicker
                assets={mediaPickerAssets}
                label="Product photo"
                name="imageMediaId"
                noneLabel="No product photo"
                storeId={store.id}
                websiteId={store.websiteId}
              />
              <label>
                Image alt text
                <input name="imageAltText" placeholder="Describe the product photo" />
              </label>
              <label>
                Slug
                <input name="slug" />
              </label>
              <button type="submit">Add product</button>
            </form>
          </div>
        </div>
        <div className="commerceTableWrap">
          <table className="commerceTable commerceProductTable">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Price</th>
                <th>Variants</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td data-label="Product">
                    <div className="commerceProductIdentity">
                      {product.images[0] ? (
                        <img alt="" src={dashboardMediaPath(product.images[0].mediaAssetId)} />
                      ) : null}
                      <div>
                        <strong>{translation(product.translations, "en")}</strong>
                        <small>{translation(product.translations, "ar")}</small>
                        <small className="commerceProductDescription">
                          {translationField(product.translations, "shortDescription", "en")}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td data-label="SKU">{product.sku ?? "—"}</td>
                  <td data-label="Status">
                    <span className={`status ${product.status}`}>{product.status}</span>
                    <form
                      action={toggleEcommerceProductStatusAction}
                      className="commerceInlineAction"
                    >
                      <input name="storeId" type="hidden" value={store.id} />
                      <input name="productId" type="hidden" value={product.id} />
                      <input
                        name="status"
                        type="hidden"
                        value={product.status === "published" ? "draft" : "published"}
                      />
                      <button type="submit">
                        {product.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                  </td>
                  <td data-label="Price">
                    {formatMoney(
                      product.salePriceMinor ?? product.basePriceMinor,
                      product.currency,
                      locale,
                    )}
                  </td>
                  <td data-label="Variants">{product.variants.length}</td>
                  <td data-label="Stock">
                    {product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)}
                  </td>
                  <td data-label="Actions">
                    <EcommerceProductActions product={product} storeId={store.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="inventory">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Audited adjustments</p>
            <h2>Inventory</h2>
          </div>
          {clientView ? <CommerceSectionToggle targetId="inventory" /> : null}
        </div>
        <div className="commerceInventoryGrid">
          {products.flatMap((product) =>
            product.variants.map((variant) => (
              <article
                className={variant.stockQuantity <= variant.lowStockThreshold ? "lowStock" : ""}
                key={variant.id}
              >
                <div>
                  <strong>{translation(product.translations, "en")}</strong>
                  <span>
                    {variant.title} · {variant.sku ?? "No SKU"}
                  </span>
                </div>
                <b>{variant.stockQuantity}</b>
                <form action={adjustEcommerceInventoryAction}>
                  <input name="storeId" type="hidden" value={store.id} />
                  <input name="variantId" type="hidden" value={variant.id} />
                  <input
                    aria-label="Quantity adjustment"
                    name="quantityDelta"
                    placeholder="+5 or -2"
                    required
                    type="number"
                  />
                  <input aria-label="Reason" name="reason" placeholder="Reason" />
                  <button type="submit">Adjust</button>
                </form>
              </article>
            )),
          )}
        </div>
      </section>

      <section className="panel" id="orders">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Fulfillment</p>
            <h2>Orders</h2>
          </div>
          <span>{orders.length} recent</span>
          {clientView ? <CommerceSectionToggle targetId="orders" /> : null}
        </div>
        <div className="commerceTableWrap">
          <table className="commerceTable commerceOrderTable">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const customer = order.customerSnapshot as { name?: string; email?: string };
                return (
                  <tr key={order.id}>
                    <td data-label={isArabic ? "الطلب" : "Order"}>
                      <strong>{order.orderNumber}</strong>
                      <small>{order.createdAt.toLocaleDateString(locale)}</small>
                    </td>
                    <td data-label={isArabic ? "العميل" : "Customer"}>
                      {customer.name ?? customer.email ?? "Guest"}
                    </td>
                    <td data-label={isArabic ? "العناصر" : "Items"}>
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td data-label={isArabic ? "الإجمالي" : "Total"}>
                      {formatMoney(order.totalMinor, order.currency, locale)}
                    </td>
                    <td data-label={isArabic ? "الدفع" : "Payment"}>
                      <span className={`status ${order.paymentStatus}`}>{order.paymentStatus}</span>
                    </td>
                    <td data-label={isArabic ? "الحالة" : "Status"}>
                      <span className={`status ${order.status}`}>{order.status}</span>
                    </td>
                    <td data-label={isArabic ? "الإجراء" : "Action"}>
                      {nextStatuses[order.status].length ? (
                        <form action={updateEcommerceOrderStatusAction}>
                          <input name="storeId" type="hidden" value={store.id} />
                          <input name="orderId" type="hidden" value={order.id} />
                          <select aria-label="Next order status" name="status">
                            {nextStatuses[order.status].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button type="submit">Update</button>
                        </form>
                      ) : (
                        "Complete"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="customers">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Relationships</p>
            <h2>Customers</h2>
          </div>
          <span>{customers.length} recent</span>
          {clientView ? <CommerceSectionToggle targetId="customers" /> : null}
        </div>
        <div className="commerceTableWrap">
          <table className="commerceTable commerceCustomerTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td data-label={isArabic ? "الاسم" : "Name"}>{customer.name}</td>
                  <td data-label={isArabic ? "التواصل" : "Contact"}>
                    {customer.email ?? customer.phone ?? "—"}
                  </td>
                  <td data-label={isArabic ? "الحالة" : "Status"}>{customer.status}</td>
                  <td data-label={isArabic ? "الطلبات" : "Orders"}>{customer._count.orders}</td>
                  <td data-label={isArabic ? "تاريخ الإنشاء" : "Created"}>
                    {customer.createdAt.toLocaleDateString(locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="discounts">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Promotion engine</p>
            <h2>Coupons</h2>
          </div>
          {clientView ? <CommerceSectionToggle targetId="discounts" /> : null}
        </div>
        <form action={createEcommerceCouponAction} className="settingsForm commerceInlineForm">
          <input name="storeId" type="hidden" value={store.id} />
          <label>
            Code
            <input name="code" placeholder="SUMMER26" required />
          </label>
          <label>
            Type
            <select name="type">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
          <label>
            Value
            <input min="0.01" name="value" required step="0.01" type="number" />
          </label>
          <label>
            Minimum order
            <input min="0" name="minimumOrder" step="0.01" type="number" />
          </label>
          <label>
            Usage limit
            <input min="1" name="usageLimit" type="number" />
          </label>
          <button type="submit">Create coupon</button>
        </form>
        <div className="commerceChipList">
          {coupons.map((coupon) => (
            <span key={coupon.id}>
              <strong>{coupon.code}</strong>{" "}
              {coupon.type === "percentage"
                ? `${coupon.value / 100}%`
                : formatMoney(coupon.value, store.currency, locale)}{" "}
              · {coupon.usedCount}
              {coupon.usageLimit ? `/${coupon.usageLimit}` : ""}
            </span>
          ))}
        </div>
      </section>

      <section className="panel" id="settings">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Configuration</p>
            <h2>Store settings</h2>
          </div>
          {clientView ? <CommerceSectionToggle targetId="settings" /> : null}
        </div>
        <div className="commerceSplit">
          <form action={updateEcommerceStoreAction} className="settingsForm commerceCompactForm">
            <input name="storeId" type="hidden" value={store.id} />
            <label>
              Name
              <input defaultValue={store.name} name="name" required />
            </label>
            <label>
              Status
              <select defaultValue={store.status} name="status">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label>
              Default language
              <select defaultValue={store.defaultLocale} name="defaultLocale">
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </label>
            <label>
              Contact email
              <input defaultValue={store.contactEmail ?? ""} name="contactEmail" type="email" />
            </label>
            <label>
              WhatsApp / contact phone
              <input
                defaultValue={store.contactPhone ?? ""}
                dir="ltr"
                name="contactPhone"
                placeholder="+20 128 428 9997"
                required
              />
            </label>
            <div className="commerceColorFields">
              <label>
                Primary brand color
                <input
                  defaultValue={colorValue(brandTokens.primary, "#171512")}
                  name="primaryColor"
                  type="color"
                />
              </label>
              <label>
                Accent brand color
                <input
                  defaultValue={colorValue(brandTokens.accent, "#a45f3f")}
                  name="accentColor"
                  type="color"
                />
              </label>
              <label>
                Surface color
                <input
                  defaultValue={colorValue(brandTokens.surface, "#f8f6f1")}
                  name="surfaceColor"
                  type="color"
                />
              </label>
              <label>
                Surface alt color
                <input
                  defaultValue={colorValue(brandTokens.surfaceAlt, "#eee9df")}
                  name="surfaceAltColor"
                  type="color"
                />
              </label>
              <label>
                Text color
                <input
                  defaultValue={colorValue(brandTokens.ink, "#171512")}
                  name="inkColor"
                  type="color"
                />
              </label>
              <label>
                Muted text color
                <input
                  defaultValue={colorValue(brandTokens.muted, "#716c64")}
                  name="mutedColor"
                  type="color"
                />
              </label>
              <label>
                Border color
                <input
                  defaultValue={colorValue(brandTokens.border, "#d8d2c8")}
                  name="borderColor"
                  type="color"
                />
              </label>
              <label>
                Success color
                <input
                  defaultValue={colorValue(brandTokens.success, "#128c4a")}
                  name="successColor"
                  type="color"
                />
              </label>
            </div>
            <label className="checkboxLabel">
              <input
                defaultChecked={whatsappSettings.whatsappEnabled !== false}
                name="whatsappEnabled"
                type="checkbox"
              />
              Show floating WhatsApp button
            </label>
            <label className="checkboxLabel">
              <input
                defaultChecked={whatsappSettings.showNavbar !== false}
                name="showNavbar"
                type="checkbox"
              />
              Show storefront navigation
            </label>
            <label className="checkboxLabel">
              <input
                defaultChecked={whatsappSettings.showFooter !== false}
                name="showFooter"
                type="checkbox"
              />
              Show storefront footer
            </label>
            <label>
              WhatsApp button label
              <input
                defaultValue={textValue(whatsappSettings.whatsappButtonLabel)}
                name="whatsappButtonLabel"
                placeholder="Chat on WhatsApp"
              />
            </label>
            <button type="submit">Save store settings</button>
          </form>
          <div>
            {administrator ? (
              <form
                action={saveWebsiteSubscriptionAction}
                className="settingsForm commerceCompactForm ecommercePlanForm"
              >
                <div className="ecommercePlanHeader">
                  <div>
                    <span>Subscription plan</span>
                    <strong>{subscription?.status ?? "No active plan"}</strong>
                  </div>
                  {subscription ? (
                    <small>Active until {formatDate(subscription.expiresAt)}</small>
                  ) : null}
                </div>
                <input name="websiteId" type="hidden" value={store.websiteId} />
                <input name="clientId" type="hidden" value={store.website.clientId ?? ""} />
                <label>
                  Plan
                  <select defaultValue={subscription?.cadence ?? "monthly"} name="cadence">
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
                <label>
                  Expiry (UTC)
                  <input
                    defaultValue={dateTimeValue(subscription?.expiresAt ?? defaultPlanExpiry)}
                    name="expiresAt"
                    required
                    step="1"
                    type="datetime-local"
                  />
                </label>
                <PendingSubmit pendingLabel="Saving plan…">Save plan</PendingSubmit>
              </form>
            ) : null}
            {!clientView ? (
              <form
                action={switchEcommerceTemplateAction}
                className="settingsForm commerceCompactForm"
              >
                <input name="storeId" type="hidden" value={store.id} />
                <label>
                  Presentation template
                  <select defaultValue={store.ecommerceTemplateVersionId} name="templateVersionId">
                    {templateVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Switching presentation never copies, resets, or deletes products, orders,
                  customers, or settings.
                </p>
                <button type="submit">Switch presentation</button>
              </form>
            ) : null}
            {administrator ? (
              <EcommerceClaimLinkForm
                initialClaimLink={query.claimLink}
                returnTo={`/ecommerce/stores/${store.id}`}
                websiteId={store.websiteId}
              />
            ) : null}
          </div>
        </div>
        <h3>Offline payment and shipping</h3>
        <p>
          Checkout sends the complete order to the store WhatsApp number. These payment methods
          record how payment will be arranged; they do not process online payments.
        </p>
        <div className="commerceMethodGrid">
          {[
            ...store.paymentMethods
              .filter((method) => method.key !== "bank_transfer")
              .map((method) => ({ ...method, kind: "payment" })),
            ...store.shippingMethods.map((method) => ({ ...method, kind: "shipping" })),
          ].map((method) => (
            <article key={`${method.kind}-${method.id}`}>
              <div>
                <strong>{method.displayName}</strong>
                <span>{method.kind}</span>
              </div>
              <span className={`status ${method.enabled ? "active" : "paused"}`}>
                {method.enabled ? "enabled" : "disabled"}
              </span>
              <form action={toggleEcommerceMethodAction}>
                <input name="storeId" type="hidden" value={store.id} />
                <input name="methodId" type="hidden" value={method.id} />
                <input name="kind" type="hidden" value={method.kind} />
                <button type="submit">{method.enabled ? "Disable" : "Enable"}</button>
              </form>
            </article>
          ))}
        </div>
      </section>
      {clientView ? (
        <EcommerceStorePreview
          openUrl={liveStorefrontUrl}
          storeName={store.name}
          storefrontUrl={storefrontUrl}
        />
      ) : null}
    </div>
  );
}

function translation(rows: readonly { locale: string; name: string }[], locale: string): string {
  return rows.find((row) => row.locale === locale)?.name ?? rows[0]?.name ?? "Untitled";
}

function translationField(
  rows: readonly { locale: string; [key: string]: unknown }[],
  field: string,
  locale: string,
): string {
  const preferred = rows.find((row) => row.locale === locale)?.[field];
  const fallback = rows[0]?.[field];
  return typeof preferred === "string" && preferred.trim()
    ? preferred
    : typeof fallback === "string"
      ? fallback
      : "";
}

function dateTimeValue(value: Date): string {
  return value.toISOString().slice(0, 19);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function publicWebsiteUrl(hostname: string): string {
  const dashboard = new URL(dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL);
  dashboard.hostname = hostname;
  dashboard.pathname = "/";
  dashboard.search = "";
  return dashboard.toString();
}

function templatePreviewWebsiteUrl(rendererKey: string, locale: "en" | "ar"): string {
  const preview = new URL(
    `/commerce-template-preview/${encodeURIComponent(rendererKey)}`,
    dashboardConfig.FACTORY_DASHBOARD_PUBLIC_URL,
  );
  preview.searchParams.set("lang", locale);
  return preview.toString();
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function colorValue(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
