import { formatMoney } from "@factory/ecommerce";
import { createWebsiteClaimLinkAction } from "@/app/actions";
import {
  adjustEcommerceInventoryAction,
  createEcommerceCategoryAction,
  createEcommerceCouponAction,
  createEcommerceProductAction,
  switchEcommerceTemplateAction,
  toggleEcommerceMethodAction,
  updateEcommerceOrderStatusAction,
  updateEcommerceStoreAction,
} from "@/app/ecommerce/actions";
import { loadEcommerceStoreDashboard, loadEcommerceTemplates } from "@/server/ecommerce";

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

export default async function EcommerceStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ claimLink?: string }>;
}) {
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
  } = data;
  const locale = store.defaultLocale === "ar" ? "ar-EG" : "en-US";
  const templateVersions = templates.flatMap((template) =>
    template.versions
      .filter((version) => version.status === "ready")
      .map((version) => ({
        id: version.id,
        label: `${template.name} ${version.version}`,
      })),
  );
  const primaryDomain = store.website.domains[0]?.hostnameDisplay;
  const eventMap = new Map(eventCounts.map((row) => [row.eventType, row._count._all]));

  return (
    <>
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
              href={`http://${primaryDomain}:3000`}
              rel="noreferrer"
              target="_blank"
            >
              Open storefront
            </a>
          ) : null}
          <a className="buttonLink" href="/ecommerce">
            All stores
          </a>
        </div>
      </header>

      <nav aria-label="Commerce sections" className="commerceSectionNav">
        <a href="#overview">Overview</a>
        <a href="#catalog">Catalog</a>
        <a href="#inventory">Inventory</a>
        <a href="#orders">Orders</a>
        <a href="#customers">Customers</a>
        <a href="#discounts">Discounts</a>
        <a href="#settings">Settings</a>
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

      <section className="panel commerceAnalyticsPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Store activity</p>
            <h2>Analytics</h2>
          </div>
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
        </div>
        <div className="commerceSplit">
          <div>
            <h3>Add category</h3>
            <form
              action={createEcommerceCategoryAction}
              className="settingsForm commerceCompactForm"
            >
              <input name="storeId" type="hidden" value={store.id} />
              <label>
                English name
                <input name="nameEn" required />
              </label>
              <label>
                Arabic name
                <input dir="rtl" name="nameAr" />
              </label>
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
              <label>
                English name
                <input name="nameEn" required />
              </label>
              <label>
                Arabic name
                <input dir="rtl" name="nameAr" />
              </label>
              <label>
                SKU
                <input name="sku" />
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
                <input name="published" type="checkbox" /> Publish immediately
              </label>
              <button type="submit">Add product</button>
            </form>
          </div>
        </div>
        <div className="commerceTableWrap">
          <table className="commerceTable">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Price</th>
                <th>Variants</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{translation(product.translations, "en")}</strong>
                    <small>{translation(product.translations, "ar")}</small>
                  </td>
                  <td>{product.sku ?? "—"}</td>
                  <td>
                    <span className={`status ${product.status}`}>{product.status}</span>
                  </td>
                  <td>
                    {formatMoney(
                      product.salePriceMinor ?? product.basePriceMinor,
                      product.currency,
                      locale,
                    )}
                  </td>
                  <td>{product.variants.length}</td>
                  <td>
                    {product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)}
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
        </div>
        <div className="commerceTableWrap">
          <table className="commerceTable">
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
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <small>{order.createdAt.toLocaleDateString(locale)}</small>
                    </td>
                    <td>{customer.name ?? customer.email ?? "Guest"}</td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td>{formatMoney(order.totalMinor, order.currency, locale)}</td>
                    <td>
                      <span className={`status ${order.paymentStatus}`}>{order.paymentStatus}</span>
                    </td>
                    <td>
                      <span className={`status ${order.status}`}>{order.status}</span>
                    </td>
                    <td>
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
        </div>
        <div className="commerceTableWrap">
          <table className="commerceTable">
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
                  <td>{customer.name}</td>
                  <td>{customer.email ?? customer.phone ?? "—"}</td>
                  <td>{customer.status}</td>
                  <td>{customer._count.orders}</td>
                  <td>{customer.createdAt.toLocaleDateString(locale)}</td>
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
            <button type="submit">Save store settings</button>
          </form>
          <div>
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
                Switching presentation never copies, resets, or deletes products, orders, customers,
                or settings.
              </p>
              <button type="submit">Switch presentation</button>
            </form>
            {administrator ? (
              <form
                action={createWebsiteClaimLinkAction}
                className="settingsForm commerceCompactForm"
              >
                <input name="websiteId" type="hidden" value={store.websiteId} />
                <label>
                  Owner email
                  <input name="intendedEmail" required type="email" />
                </label>
                <button type="submit">Create owner claim link</button>
              </form>
            ) : null}
            {query.claimLink ? (
              <p className="notice">
                Claim link: <code>{query.claimLink}</code>
              </p>
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
            ...store.paymentMethods.map((method) => ({ ...method, kind: "payment" })),
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
    </>
  );
}

function translation(rows: readonly { locale: string; name: string }[], locale: string): string {
  return rows.find((row) => row.locale === locale)?.name ?? rows[0]?.name ?? "Untitled";
}
