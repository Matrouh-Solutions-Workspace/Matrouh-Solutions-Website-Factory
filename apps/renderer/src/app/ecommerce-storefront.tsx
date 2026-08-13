"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { formatMoney } from "@factory/ecommerce";
import type { EcommerceStorefrontData, StorefrontProduct } from "../server/ecommerce-store";
import {
  buildWhatsAppContactUrl,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppNumber,
} from "./whatsapp-order";

type CartLine = { variantId: string; productId: string; quantity: number };
type StorefrontKind = "fashion" | "hardware" | "pc";
type SortKey = "featured" | "newest" | "price-low" | "price-high" | "name";
type Theme = "light" | "dark";

export function EcommerceStorefront({
  store,
  path,
}: {
  readonly store: EcommerceStorefrontData;
  readonly path: readonly string[];
}) {
  const kind = storefrontKind(store.template.rendererKey);
  const rtl = store.locale === "ar";
  const copy = commerceCopy(store.locale, kind);
  const storageKey = `factory:commerce-cart:${store.storeId}`;
  const themeStorageKey = `factory:commerce-theme:${store.storeId}`;
  const defaultTheme = store.presentation.defaultTheme === "dark" ? "dark" : "light";
  const [cart, setCart] = useState<readonly CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const catalogRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const route = path[0] ?? "";
  const product =
    route === "products" ? store.products.find((item) => item.slug === path[1]) : undefined;
  const prices = store.products.map(productPrice);
  const maxCatalogPrice = Math.max(...prices, 1);
  const [maxPrice, setMaxPrice] = useState(maxCatalogPrice);
  const brands = useMemo(
    () => [...new Set(store.products.map((item) => attribute(item, "brand")).filter(Boolean))],
    [store.products],
  );

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(value)) {
        setCart(
          value
            .filter(validCartLine)
            .map((line) => ({ ...line, quantity: Math.min(line.quantity, 99) })),
        );
      }
      const savedTheme = localStorage.getItem(themeStorageKey);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    } catch {
      localStorage.removeItem(storageKey);
    }
    setCartLoaded(true);
  }, [storageKey, themeStorageKey]);

  useEffect(() => {
    void recordEvent(product ? "product_view" : "page_view", product?.id);
  }, [product?.id]);

  useEffect(() => {
    if (cartLoaded) localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, cartLoaded, storageKey]);

  const lines = useMemo(
    () =>
      cart.flatMap((line) => {
        const item = store.products.find((candidate) => candidate.id === line.productId);
        const variant = item?.variants.find((candidate) => candidate.id === line.variantId);
        return item && variant ? [{ line, item, variant }] : [];
      }),
    [cart, store.products],
  );
  const subtotal = lines.reduce(
    (sum, { line, item, variant }) => sum + unitPrice(item, variant) * line.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const normalizedQuery = query.trim().toLocaleLowerCase(store.locale);
  const visibleProducts = useMemo(() => {
    const filtered = store.products.filter((item) => {
      const searchable = [
        item.name,
        item.description,
        item.shortDescription,
        item.sku,
        ...Object.values(item.attributes),
      ]
        .filter(
          (value): value is string | number =>
            typeof value === "string" || typeof value === "number",
        )
        .join(" ")
        .toLocaleLowerCase(store.locale);
      return (
        (!category || item.categoryIds.includes(category)) &&
        (!brand || attribute(item, "brand") === brand) &&
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        productPrice(item) <= maxPrice &&
        (!inStockOnly || item.variants.some((variant) => variant.stockQuantity > 0)) &&
        (!saleOnly || item.salePriceMinor !== null)
      );
    });
    return [...filtered].sort((left, right) => {
      if (sort === "price-low") return productPrice(left) - productPrice(right);
      if (sort === "price-high") return productPrice(right) - productPrice(left);
      if (sort === "name") return left.name.localeCompare(right.name, store.locale);
      if (sort === "newest") return store.products.indexOf(left) - store.products.indexOf(right);
      return (
        Number(attribute(right, "featured") === "true") -
        Number(attribute(left, "featured") === "true")
      );
    });
  }, [
    brand,
    category,
    inStockOnly,
    maxPrice,
    normalizedQuery,
    saleOnly,
    sort,
    store.locale,
    store.products,
  ]);
  const activeFilters = [
    category ? store.categories.find((item) => item.id === category)?.name : null,
    brand || null,
    inStockOnly ? copy.inStock : null,
    saleOnly ? copy.onSale : null,
    maxPrice < maxCatalogPrice
      ? `${copy.upTo} ${formatMoney(maxPrice, store.currency, store.locale)}`
      : null,
  ].filter((value): value is string => Boolean(value));

  function add(productItem: StorefrontProduct, variantId?: string) {
    const variant =
      productItem.variants.find((item) => item.id === variantId) ?? productItem.variants[0];
    if (!variant || variant.stockQuantity < 1) return;
    void recordEvent("add_to_cart", productItem.id);
    setCart((current) => {
      const existing = current.find((item) => item.variantId === variant.id);
      if (existing)
        return current.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: Math.min(item.quantity + 1, variant.stockQuantity) }
            : item,
        );
      return [...current, { productId: productItem.id, variantId: variant.id, quantity: 1 }];
    });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.variantId !== variantId)
        : current.map((item) =>
            item.variantId === variantId ? { ...item, quantity: Math.min(quantity, 99) } : item,
          ),
    );
  }

  function resetFilters() {
    setCategory("");
    setBrand("");
    setInStockOnly(false);
    setSaleOnly(false);
    setMaxPrice(maxCatalogPrice);
  }

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(themeStorageKey, next);
      return next;
    });
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);
    if (!normalizeWhatsAppNumber(store.contactPhone)) {
      setCheckoutError(copy.whatsappUnavailable);
      return;
    }
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) {
      whatsappWindow.document.title = copy.preparingWhatsApp;
      whatsappWindow.document.body.textContent = copy.preparingWhatsApp;
      whatsappWindow.opener = null;
    }
    setCheckoutPending(true);
    void recordEvent("checkout_started");
    const form = new FormData(event.currentTarget);
    const customer = {
      name: formText(form, "name"),
      email: formText(form, "email"),
      phone: formText(form, "phone"),
    };
    const address = {
      line1: formText(form, "line1"),
      city: formText(form, "city"),
      notes: formText(form, "notes"),
    };
    const couponCode = formText(form, "couponCode");
    const shippingMethodId = formText(form, "shippingMethodId");
    const shipping = store.shippingMethods.find((method) => method.id === shippingMethodId);
    if (!shipping) {
      whatsappWindow?.close();
      setCheckoutPending(false);
      setCheckoutError(copy.checkoutFailed);
      return;
    }
    let response: Response;
    try {
      response = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customer,
          address,
          shippingMethodId,
          couponCode,
        }),
      });
    } catch {
      whatsappWindow?.close();
      setCheckoutPending(false);
      setCheckoutError(copy.checkoutFailed);
      return;
    }
    const result = (await response.json().catch(() => ({}))) as {
      orderNumber?: string;
      subtotalMinor?: number;
      discountMinor?: number;
      shippingMinor?: number;
      totalMinor?: number;
      error?: string;
    };
    if (
      !response.ok ||
      !result.orderNumber ||
      !Number.isSafeInteger(result.subtotalMinor) ||
      !Number.isSafeInteger(result.discountMinor) ||
      !Number.isSafeInteger(result.shippingMinor) ||
      !Number.isSafeInteger(result.totalMinor)
    ) {
      whatsappWindow?.close();
      setCheckoutPending(false);
      setCheckoutError(copy.checkoutFailed);
      return;
    }
    const subtotalMinor = Number(result.subtotalMinor);
    const discountMinor = Number(result.discountMinor);
    const shippingMinor = Number(result.shippingMinor);
    const totalMinor = Number(result.totalMinor);
    const whatsappUrl = buildWhatsAppOrderUrl(store.contactPhone, {
      locale: store.locale,
      currency: store.currency,
      storeName: store.name,
      storefrontUrl: window.location.origin,
      orderNumber: result.orderNumber,
      customer,
      address,
      shipping: { name: shipping.name, priceMinor: shippingMinor },
      couponCode,
      lines: lines.map(({ line, item, variant }) => ({
        name: item.name,
        variant: variant.title,
        sku: variant.sku ?? item.sku,
        quantity: line.quantity,
        unitPriceMinor: unitPrice(item, variant),
        totalMinor: unitPrice(item, variant) * line.quantity,
      })),
      subtotalMinor,
      discountMinor,
      totalMinor,
    });
    if (!whatsappUrl) {
      whatsappWindow?.close();
      setCheckoutPending(false);
      setCheckoutError(copy.whatsappUnavailable);
      return;
    }
    setCart([]);
    setOrderNumber(result.orderNumber);
    setCheckoutPending(false);
    void recordEvent("whatsapp_order_opened");
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = whatsappUrl;
    else window.location.assign(whatsappUrl);
  }

  async function recordEvent(eventType: string, productId?: string) {
    if (store.storeId.startsWith("preview-")) return;
    await fetch("/api/storefront/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, productId }),
      keepalive: true,
    }).catch(() => undefined);
  }

  const header = (
    <>
      <div className="shopAnnouncement">
        <span>{kind === "fashion" ? copy.announcementFashion : copy.announcementHardware}</span>
        <span>{copy.deliveryMessage}</span>
      </div>
      <header className="shopHeader">
        <div className="shopHeaderMain">
          <button
            aria-expanded={menuOpen}
            aria-label={copy.menu}
            className="shopIconButton shopMenuButton"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <a className="shopBrand" href="/" aria-label={`${store.name} · ${copy.home}`}>
            <span className="shopBrandMark">
              {kind === "fashion" ? "M" : kind === "pc" ? "NX" : "M+"}
            </span>
            <span>
              <strong>{store.name}</strong>
              <small>{kind === "fashion" ? copy.fashionDescriptor : copy.hardwareDescriptor}</small>
            </span>
          </a>
          <form
            className="shopGlobalSearch"
            onSubmit={(event) => {
              event.preventDefault();
              catalogRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            role="search"
          >
            <Icon name="search" />
            <input
              aria-label={copy.search}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={kind === "fashion" ? copy.searchFashion : copy.searchHardware}
              type="search"
              value={query}
            />
            {query ? (
              <button aria-label={copy.clearSearch} onClick={() => setQuery("")} type="button">
                <Icon name="close" />
              </button>
            ) : null}
          </form>
          <div className="shopHeaderActions">
            <a className="shopTextControl" href={`?lang=${rtl ? "en" : "ar"}`}>
              <Icon name="globe" />
              <span>{rtl ? "EN" : "ع"}</span>
            </a>
            <button
              aria-label={theme === "dark" ? copy.lightTheme : copy.darkTheme}
              className="shopIconButton"
              onClick={toggleTheme}
              type="button"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <a className="shopCartButton" href="/cart">
              <Icon name="bag" />
              <span>{copy.cart}</span>
              <b>{cartCount}</b>
            </a>
          </div>
        </div>
        <nav aria-label={copy.navigation} className={menuOpen ? "shopNav isOpen" : "shopNav"}>
          <a href="/" onClick={() => setMenuOpen(false)}>
            {copy.newAndFeatured}
          </a>
          {store.categories.slice(0, 5).map((item) => (
            <a
              href="#products"
              key={item.id}
              onClick={() => {
                setCategory(item.id);
                setMenuOpen(false);
              }}
            >
              {item.name}
            </a>
          ))}
          <a href="#services" onClick={() => setMenuOpen(false)}>
            {copy.services}
          </a>
          <a
            className="shopNavSale"
            href="#products"
            onClick={() => {
              setSaleOnly(true);
              setMenuOpen(false);
            }}
          >
            {copy.sale}
          </a>
        </nav>
      </header>
    </>
  );

  if (orderNumber) {
    return (
      <div
        className={`commercePublicRoot shopTheme--${kind}`}
        data-theme={theme}
        dir={rtl ? "rtl" : "ltr"}
        lang={store.locale}
        style={presentationTokens(store.presentation)}
      >
        {header}
        <main className="commerceOrderSuccess">
          <span className="successMark">
            <Icon name="check" />
          </span>
          <p className="shopEyebrow">{copy.thankYou}</p>
          <h1>{copy.orderReceived}</h1>
          <p>{copy.orderConfirmation}</p>
          <strong>{orderNumber}</strong>
          <a className="shopPrimaryButton" href="/">
            {copy.continueShopping}
          </a>
        </main>
        <StoreFooter copy={copy} kind={kind} store={store} />
      </div>
    );
  }

  if (route === "cart" || route === "checkout") {
    return (
      <div
        className={`commercePublicRoot shopTheme--${kind}`}
        data-theme={theme}
        dir={rtl ? "rtl" : "ltr"}
        lang={store.locale}
        style={presentationTokens(store.presentation)}
      >
        {header}
        <main className="commerceCartPage">
          <section className="commerceCartLines">
            <p className="shopEyebrow">{copy.secureCheckout}</p>
            <h1>{copy.yourCart}</h1>
            {lines.length === 0 ? (
              <div className="shopEmptyState">
                <Icon name="bag" />
                <h2>{copy.emptyCart}</h2>
                <p>{copy.emptyCartHelp}</p>
                <a className="shopPrimaryButton" href="/#products">
                  {copy.continueShopping}
                </a>
              </div>
            ) : (
              lines.map(({ line, item, variant }, index) => (
                <article className="commerceCartLine" key={variant.id}>
                  <ProductVisual index={index} kind={kind} product={item} store={store} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>{variant.title}</span>
                    <button onClick={() => updateQuantity(variant.id, 0)} type="button">
                      {copy.remove}
                    </button>
                  </div>
                  <label>
                    <span>{copy.quantity}</span>
                    <input
                      aria-label={`${copy.quantity}: ${item.name}`}
                      min="0"
                      onChange={(event) => updateQuantity(variant.id, Number(event.target.value))}
                      type="number"
                      value={line.quantity}
                    />
                  </label>
                  <b>
                    {formatMoney(
                      unitPrice(item, variant) * line.quantity,
                      store.currency,
                      store.locale,
                    )}
                  </b>
                </article>
              ))
            )}
            {lines.length > 0 ? (
              <div className="commerceCartTotal">
                <span>
                  {copy.subtotal}
                  <small>{copy.taxesAtCheckout}</small>
                </span>
                <strong>{formatMoney(subtotal, store.currency, store.locale)}</strong>
              </div>
            ) : null}
          </section>
          {lines.length > 0 ? (
            <form className="commerceCheckoutForm" onSubmit={(event) => void checkout(event)}>
              <div>
                <p className="shopEyebrow">{copy.checkout}</p>
                <h2>{copy.deliveryDetails}</h2>
              </div>
              <div className="shopFormGrid">
                <label>
                  {copy.name}
                  <input autoComplete="name" name="name" required />
                </label>
                <label>
                  {copy.phone}
                  <input autoComplete="tel" inputMode="tel" name="phone" required />
                </label>
              </div>
              <label>
                {copy.email}
                <input autoComplete="email" name="email" type="email" />
              </label>
              <label>
                {copy.address}
                <input autoComplete="street-address" name="line1" required />
              </label>
              <label>
                {copy.city}
                <input autoComplete="address-level2" name="city" required />
              </label>
              <label>
                {copy.shipping}
                <select name="shippingMethodId" required>
                  {store.shippingMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name} · {formatMoney(method.priceMinor, store.currency, store.locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.coupon}
                <input name="couponCode" placeholder={copy.optional} />
              </label>
              <label>
                {copy.notes}
                <textarea name="notes" rows={3} />
              </label>
              {checkoutError ? (
                <p className="shopFormError" role="alert">
                  {checkoutError}
                </p>
              ) : null}
              <button
                aria-busy={checkoutPending}
                className="shopPrimaryButton shopWhatsAppButton"
                disabled={checkoutPending}
                type="submit"
              >
                <Icon name="message" />
                {checkoutPending ? copy.preparingWhatsApp : copy.placeOrder}
              </button>
              <small className="shopSecureNote">
                <Icon name="message" />
                {copy.secureNote}
              </small>
            </form>
          ) : null}
        </main>
        <StoreFooter copy={copy} kind={kind} store={store} />
      </div>
    );
  }

  if (product) {
    const stock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
    const productBrand = attribute(product, "brand");
    return (
      <div
        className={`commercePublicRoot shopTheme--${kind}`}
        data-theme={theme}
        dir={rtl ? "rtl" : "ltr"}
        lang={store.locale}
        style={presentationTokens(store.presentation)}
      >
        {header}
        <main className="commerceProductPage">
          <div className="commerceProductMedia">
            <ProductVisual
              index={store.products.indexOf(product)}
              kind={kind}
              product={product}
              store={store}
            />
          </div>
          <div className="commerceProductInfo">
            <a className="shopBackLink" href="/#products">
              <Icon name="arrow" />
              {copy.backToProducts}
            </a>
            <p className="shopEyebrow">{productBrand || product.sku || copy.featured}</p>
            <h1>{product.name}</h1>
            <div className="shopRating" aria-label={`${copy.rating}: 4.8`}>
              <span>★★★★★</span>
              <small>4.8 · {copy.verifiedReviews}</small>
            </div>
            <p className="shopProductLead">{product.description || product.shortDescription}</p>
            <Price product={product} store={store} />
            <div className="shopProductFacts">
              {Object.entries(product.attributes)
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key}>
                    <span>{humanize(key)}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
            </div>
            <div className={stock > 0 ? "shopStock isAvailable" : "shopStock"}>
              <span />
              <strong>
                {stock > 0 ? `${copy.inStock} · ${copy.readyToShip}` : copy.outOfStock}
              </strong>
            </div>
            <button
              className="shopPrimaryButton shopProductAdd"
              disabled={stock < 1}
              onClick={() => add(product)}
              type="button"
            >
              <Icon name="bag" />
              {copy.addToCart}
            </button>
            <div className="shopProductPromises">
              <span>
                <Icon name="truck" />
                {copy.fastDelivery}
              </span>
              <span>
                <Icon name="return" />
                {copy.easyReturns}
              </span>
              <span>
                <Icon name="shield" />
                {copy.securePayment}
              </span>
            </div>
          </div>
        </main>
        <StoreFooter copy={copy} kind={kind} store={store} />
      </div>
    );
  }

  const heroSlides =
    kind === "fashion"
      ? [
          {
            eyebrow: copy.fashionHeroEyebrow,
            title: copy.fashionHeroTitle,
            body: copy.fashionHeroBody,
            number: "01",
          },
          {
            eyebrow: copy.fashionHeroEyebrow2,
            title: copy.fashionHeroTitle2,
            body: copy.fashionHeroBody2,
            number: "02",
          },
        ]
      : kind === "pc"
        ? [
            {
              eyebrow: copy.hardwareHeroEyebrow,
              title: copy.hardwareHeroTitle,
              body: copy.hardwareHeroBody,
              number: "01",
            },
            {
              eyebrow: copy.hardwareHeroEyebrow2,
              title: copy.hardwareHeroTitle2,
              body: copy.hardwareHeroBody2,
              number: "02",
            },
            {
              eyebrow: copy.pcHeroEyebrow3,
              title: copy.pcHeroTitle3,
              body: copy.pcHeroBody3,
              number: "03",
            },
          ]
        : [
            {
              eyebrow: copy.hardwareHeroEyebrow,
              title: copy.hardwareHeroTitle,
              body: copy.hardwareHeroBody,
              number: "01",
            },
            {
              eyebrow: copy.hardwareHeroEyebrow2,
              title: copy.hardwareHeroTitle2,
              body: copy.hardwareHeroBody2,
              number: "02",
            },
          ];
  const slide = heroSlides[heroSlide] ?? heroSlides[0]!;

  return (
    <div
      className={`commercePublicRoot shopTheme--${kind}`}
      data-theme={theme}
      dir={rtl ? "rtl" : "ltr"}
      lang={store.locale}
      style={presentationTokens(store.presentation)}
    >
      {header}
      <main>
        <section
          aria-label={copy.featuredPromotions}
          aria-roledescription="carousel"
          className="shopHero"
        >
          <div className="shopHeroCopy" key={`${kind}-${heroSlide}`}>
            <p className="shopEyebrow">{slide.eyebrow}</p>
            <h1>{slide.title}</h1>
            <p>{slide.body}</p>
            <div className="shopHeroActions">
              <a className="shopPrimaryButton" href="#products">
                {copy.shopNow}
                <Icon name="arrow" />
              </a>
              <a className="shopSecondaryButton" href="#categories">
                {copy.exploreCategories}
              </a>
            </div>
            <div className="shopHeroControls">
              <button
                aria-label={copy.previousSlide}
                onClick={() =>
                  setHeroSlide((value) => (value + heroSlides.length - 1) % heroSlides.length)
                }
                type="button"
              >
                <Icon name="arrow" />
              </button>
              <span>
                <b>{slide.number}</b> / 0{heroSlides.length}
              </span>
              <button
                aria-label={copy.nextSlide}
                onClick={() => setHeroSlide((value) => (value + 1) % heroSlides.length)}
                type="button"
              >
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <div className="shopHeroVisual" data-slide={heroSlide}>
            <div className="shopHeroShape">
              <span>
                {kind === "fashion"
                  ? heroSlide === 0
                    ? "EDIT"
                    : "FORM"
                  : kind === "pc"
                    ? ["RTX", "AM5", "DDR5"][heroSlide]
                    : heroSlide === 0
                      ? "18V"
                      : "PRO"}
              </span>
            </div>
            <div className="shopHeroBadge">
              <strong>{kind === "fashion" ? copy.newSeason : copy.proGrade}</strong>
              <span>{kind === "fashion" ? copy.consideredDesign : copy.jobsiteReady}</span>
            </div>
            <span className="shopHeroNumber">{slide.number}</span>
          </div>
        </section>

        <section aria-label={copy.storeBenefits} className="shopBenefitStrip" id="services">
          <Benefit icon="truck" title={copy.deliveryTitle} text={copy.deliveryText} />
          <Benefit icon="return" title={copy.returnTitle} text={copy.returnText} />
          <Benefit icon="shield" title={copy.secureTitle} text={copy.secureText} />
          <Benefit
            icon={kind === "fashion" ? "spark" : "headset"}
            title={kind === "fashion" ? copy.stylingTitle : copy.expertTitle}
            text={kind === "fashion" ? copy.stylingText : copy.expertText}
          />
        </section>

        <section className="shopSection shopCategories" id="categories">
          <SectionHeading
            eyebrow={copy.shopBy}
            title={kind === "fashion" ? copy.shopByStyle : copy.shopByDepartment}
            text={kind === "fashion" ? copy.categoryFashionText : copy.categoryHardwareText}
          />
          <div className="shopCategoryGrid">
            {store.categories.slice(0, 6).map((item, index) => (
              <button
                className="shopCategoryCard"
                data-tone={index % 6}
                key={item.id}
                onClick={() => {
                  setCategory(item.id);
                  catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                type="button"
              >
                <span className="shopCategoryArt">
                  <Icon
                    name={
                      kind === "fashion"
                        ? categoryFashionIcon(index)
                        : kind === "pc"
                          ? categoryPcIcon(index)
                          : categoryHardwareIcon(index)
                    }
                  />
                </span>
                <span>
                  <small>0{index + 1}</small>
                  <strong>{item.name}</strong>
                  <em>{item.description || copy.exploreNow}</em>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="shopEditorial">
          <div className="shopEditorialArt">
            <span>{kind === "fashion" ? "M / 26" : "BUILD / 26"}</span>
          </div>
          <div>
            <p className="shopEyebrow">
              {kind === "fashion" ? copy.editorialEyebrow : copy.hardwareEditorialEyebrow}
            </p>
            <h2>{kind === "fashion" ? copy.editorialTitle : copy.hardwareEditorialTitle}</h2>
            <p>{kind === "fashion" ? copy.editorialText : copy.hardwareEditorialText}</p>
            <a href="#products">
              {copy.discoverTheEdit}
              <Icon name="arrow" />
            </a>
          </div>
        </section>

        <section className="shopSection shopFeatured">
          <div className="shopFeaturedHeading">
            <SectionHeading
              eyebrow={copy.curatedForYou}
              title={kind === "fashion" ? copy.trendingNow : copy.weeklyDeals}
              text={kind === "fashion" ? copy.trendingText : copy.dealsText}
            />
            <div className="shopRailControls">
              <button
                aria-label={copy.previousProducts}
                onClick={() =>
                  railRef.current?.scrollBy({ left: rtl ? 360 : -360, behavior: "smooth" })
                }
                type="button"
              >
                <Icon name="arrow" />
              </button>
              <button
                aria-label={copy.nextProducts}
                onClick={() =>
                  railRef.current?.scrollBy({ left: rtl ? -360 : 360, behavior: "smooth" })
                }
                type="button"
              >
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <div className="shopProductRail" ref={railRef}>
            {store.products.slice(0, 6).map((item, index) => (
              <ProductCard
                add={add}
                copy={copy}
                index={index}
                key={item.id}
                kind={kind}
                product={item}
                store={store}
              />
            ))}
          </div>
        </section>

        <section className="shopSection commerceCatalog" id="products" ref={catalogRef}>
          <div className="commerceCatalogHead">
            <SectionHeading
              eyebrow={copy.catalog}
              title={copy.allProducts}
              text={kind === "fashion" ? copy.catalogFashionText : copy.catalogHardwareText}
            />
            <div className="commerceCatalogActions">
              <button
                className="shopFilterToggle"
                onClick={() => setFiltersOpen((value) => !value)}
                type="button"
              >
                <Icon name="filter" />
                {copy.filters}
                <b>{activeFilters.length || ""}</b>
              </button>
              <label>
                <span>{copy.sortBy}</span>
                <select onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
                  <option value="featured">{copy.featured}</option>
                  <option value="newest">{copy.newest}</option>
                  <option value="price-low">{copy.priceLow}</option>
                  <option value="price-high">{copy.priceHigh}</option>
                  <option value="name">{copy.nameSort}</option>
                </select>
              </label>
            </div>
          </div>
          <div className="shopPromotedFilters">
            <button
              className={!category ? "active" : ""}
              onClick={() => setCategory("")}
              type="button"
            >
              {copy.all}
            </button>
            {store.categories.map((item) => (
              <button
                className={category === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setCategory(item.id)}
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
          {activeFilters.length > 0 ? (
            <div className="shopAppliedFilters">
              <span>{copy.activeFilters}</span>
              {activeFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    if (filter === brand) setBrand("");
                    else if (filter === copy.inStock) setInStockOnly(false);
                    else if (filter === copy.onSale) setSaleOnly(false);
                    else if (filter.startsWith(copy.upTo)) setMaxPrice(maxCatalogPrice);
                    else setCategory("");
                  }}
                  type="button"
                >
                  {filter}
                  <Icon name="close" />
                </button>
              ))}
              <button className="shopClearFilters" onClick={resetFilters} type="button">
                {copy.clearAll}
              </button>
            </div>
          ) : null}
          <div className="commerceCatalogLayout">
            <aside
              className={filtersOpen ? "shopFilters isOpen" : "shopFilters"}
              aria-label={copy.filters}
            >
              <div className="shopFiltersMobileHead">
                <strong>{copy.filters}</strong>
                <button
                  aria-label={copy.closeFilters}
                  onClick={() => setFiltersOpen(false)}
                  type="button"
                >
                  <Icon name="close" />
                </button>
              </div>
              <FilterGroup title={copy.category}>
                {store.categories.map((item) => (
                  <label key={item.id}>
                    <input
                      checked={category === item.id}
                      name="category"
                      onChange={() => setCategory(category === item.id ? "" : item.id)}
                      type="checkbox"
                    />
                    <span>{item.name}</span>
                    <small>
                      {
                        store.products.filter((productItem) =>
                          productItem.categoryIds.includes(item.id),
                        ).length
                      }
                    </small>
                  </label>
                ))}
              </FilterGroup>
              {brands.length > 0 ? (
                <FilterGroup title={copy.brand}>
                  {brands.map((item) => (
                    <label key={item}>
                      <input
                        checked={brand === item}
                        name="brand"
                        onChange={() => setBrand(brand === item ? "" : item)}
                        type="checkbox"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </FilterGroup>
              ) : null}
              <FilterGroup title={copy.price}>
                <div className="shopPriceRange">
                  <div>
                    <span>{formatMoney(0, store.currency, store.locale)}</span>
                    <strong>{formatMoney(maxPrice, store.currency, store.locale)}</strong>
                  </div>
                  <input
                    aria-label={copy.maximumPrice}
                    max={maxCatalogPrice}
                    min="0"
                    onChange={(event) => setMaxPrice(Number(event.target.value))}
                    step={Math.max(1, Math.round(maxCatalogPrice / 20))}
                    type="range"
                    value={maxPrice}
                  />
                </div>
              </FilterGroup>
              <FilterGroup title={copy.availability}>
                <label>
                  <input
                    checked={inStockOnly}
                    onChange={(event) => setInStockOnly(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{copy.inStock}</span>
                </label>
                <label>
                  <input
                    checked={saleOnly}
                    onChange={(event) => setSaleOnly(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{copy.onSale}</span>
                </label>
              </FilterGroup>
              <button
                className="shopSecondaryButton shopResetButton"
                onClick={resetFilters}
                type="button"
              >
                {copy.resetFilters}
              </button>
              <button
                className="shopPrimaryButton shopApplyButton"
                onClick={() => setFiltersOpen(false)}
                type="button"
              >
                {copy.showResults} ({visibleProducts.length})
              </button>
            </aside>
            <div className="commerceProductResults">
              <div className="shopResultSummary">
                <p>
                  <strong>{visibleProducts.length}</strong> {copy.results}
                </p>
                {query ? (
                  <span>
                    {copy.forSearch} “{query}”
                  </span>
                ) : null}
              </div>
              {visibleProducts.length > 0 ? (
                <div className="commerceProductGrid">
                  {visibleProducts.map((item, index) => (
                    <ProductCard
                      add={add}
                      copy={copy}
                      index={index}
                      key={item.id}
                      kind={kind}
                      product={item}
                      store={store}
                    />
                  ))}
                </div>
              ) : (
                <div className="shopEmptyState">
                  <Icon name="search" />
                  <h2>{copy.noProducts}</h2>
                  <p>{copy.noProductsHelp}</p>
                  <button
                    className="shopPrimaryButton"
                    onClick={() => {
                      resetFilters();
                      setQuery("");
                    }}
                    type="button"
                  >
                    {copy.clearAll}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="shopStoryGrid">
          <div>
            <p className="shopEyebrow">
              {kind === "fashion" ? copy.ourApproach : copy.builtForWork}
            </p>
            <h2>{kind === "fashion" ? copy.storyTitle : copy.hardwareStoryTitle}</h2>
            <p>{kind === "fashion" ? copy.storyText : copy.hardwareStoryText}</p>
          </div>
          <div className="shopMetric">
            <strong>{kind === "fashion" ? "30" : "48h"}</strong>
            <span>{kind === "fashion" ? copy.dayReturns : copy.deliveryWindow}</span>
          </div>
          <div className="shopMetric">
            <strong>{kind === "fashion" ? "2×" : "100%"}</strong>
            <span>{kind === "fashion" ? copy.qualityChecked : copy.genuineTools}</span>
          </div>
        </section>

        <section className="shopNewsletter">
          <div>
            <p className="shopEyebrow">{copy.stayInLoop}</p>
            <h2>{kind === "fashion" ? copy.newsletterFashion : copy.newsletterHardware}</h2>
          </div>
          <form onSubmit={(event) => event.preventDefault()}>
            <label className="srOnly" htmlFor="commerce-newsletter">
              {copy.email}
            </label>
            <input id="commerce-newsletter" placeholder={copy.emailPlaceholder} type="email" />
            <button type="submit">
              {copy.subscribe}
              <Icon name="arrow" />
            </button>
          </form>
        </section>
      </main>
      <StoreFooter copy={copy} kind={kind} store={store} />
      {filtersOpen ? (
        <button
          aria-label={copy.closeFilters}
          className="shopFilterScrim"
          onClick={() => setFiltersOpen(false)}
          type="button"
        />
      ) : null}
    </div>
  );
}

function ProductCard({
  add,
  copy,
  index,
  kind,
  product,
  store,
}: {
  readonly add: (product: StorefrontProduct) => void;
  readonly copy: ReturnType<typeof commerceCopy>;
  readonly index: number;
  readonly kind: StorefrontKind;
  readonly product: StorefrontProduct;
  readonly store: EcommerceStorefrontData;
}) {
  const stock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const badge =
    product.salePriceMinor !== null
      ? copy.sale
      : attribute(product, "badge") || (index < 2 ? copy.new : "");
  const specifications =
    kind === "pc"
      ? [
          attribute(product, "socket"),
          attribute(product, "chipset"),
          attribute(product, "memory"),
          attribute(product, "compatibility"),
          attribute(product, "power"),
        ]
      : [
          attribute(product, "power"),
          attribute(product, "compatibility"),
          attribute(product, "material"),
        ];
  return (
    <article className="commerceProductCard">
      <a href={`/products/${product.slug}`}>
        <ProductVisual index={index} kind={kind} product={product} store={store} />
        {badge ? <span className="shopProductBadge">{badge}</span> : null}
      </a>
      <button aria-label={`${copy.save}: ${product.name}`} className="shopWishlist" type="button">
        <Icon name="heart" />
      </button>
      <div className="shopProductCardBody">
        <div className="shopProductMeta">
          <span>
            {attribute(product, "brand") ||
              (kind === "fashion" ? copy.signatureCollection : product.sku)}
          </span>
          <span className={stock > 0 ? "isAvailable" : ""}>
            {stock > 0 ? copy.inStock : copy.outOfStock}
          </span>
        </div>
        <a href={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
          <p>{product.shortDescription}</p>
        </a>
        {kind !== "fashion" ? (
          <div className="shopSpecRow">
            {specifications
              .filter(Boolean)
              .slice(0, 2)
              .map((value) => (
                <span key={value}>{value}</span>
              ))}
          </div>
        ) : (
          <div className="shopSwatches" aria-label={copy.availableColors}>
            <span />
            <span />
            <span />
          </div>
        )}
        <div className="shopProductCardFoot">
          <Price product={product} store={store} compact />
          <button
            aria-label={`${copy.addToCart}: ${product.name}`}
            disabled={stock < 1}
            onClick={() => add(product)}
            type="button"
          >
            <Icon name="bag" />
            <span>{copy.quickAdd}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductVisual({
  index,
  kind,
  product,
  store,
}: {
  readonly index: number;
  readonly kind: StorefrontKind;
  readonly product: StorefrontProduct;
  readonly store: EcommerceStorefrontData;
}) {
  const image = product.images[0];
  return (
    <div className="commerceProductThumb" data-kind={kind} data-tone={index % 6}>
      {image ? (
        <Image
          alt={image.alt || product.name}
          fill
          sizes="(max-width: 720px) 78vw, (max-width: 1100px) 42vw, 24vw"
          src={mediaUrl(store.organizationId, image.filename)}
          unoptimized
        />
      ) : (
        <div className="shopProductPlaceholder">
          <Icon
            name={
              kind === "fashion"
                ? "hanger"
                : kind === "pc"
                  ? pcProductIcon(index)
                  : hardwareProductIcon(index)
            }
          />
          <span>
            {product.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </span>
        </div>
      )}
    </div>
  );
}

function Price({
  compact = false,
  product,
  store,
}: {
  readonly compact?: boolean;
  readonly product: StorefrontProduct;
  readonly store: EcommerceStorefrontData;
}) {
  const price = product.salePriceMinor ?? product.priceMinor;
  return (
    <div className={compact ? "shopPrice isCompact" : "shopPrice"}>
      <strong>{formatMoney(price, product.currency, store.locale)}</strong>
      {product.salePriceMinor !== null ? (
        <del>{formatMoney(product.priceMinor, product.currency, store.locale)}</del>
      ) : null}
    </div>
  );
}

function FilterGroup({
  children,
  title,
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <fieldset className="shopFilterGroup">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function SectionHeading({
  eyebrow,
  text,
  title,
}: {
  readonly eyebrow: string;
  readonly text: string;
  readonly title: string;
}) {
  return (
    <div className="shopSectionHeading">
      <p className="shopEyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Benefit({
  icon,
  text,
  title,
}: {
  readonly icon: IconName;
  readonly text: string;
  readonly title: string;
}) {
  return (
    <article>
      <Icon name={icon} />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </article>
  );
}

function StoreFooter({
  copy,
  kind,
  store,
}: {
  readonly copy: ReturnType<typeof commerceCopy>;
  readonly kind: StorefrontKind;
  readonly store: EcommerceStorefrontData;
}) {
  const whatsappUrl = buildWhatsAppContactUrl(store.contactPhone);
  return (
    <footer className="commercePublicFooter">
      <div className="shopFooterLead">
        <a className="shopBrand" href="/">
          <span className="shopBrandMark">{kind === "fashion" ? "M" : "M+"}</span>
          <span>
            <strong>{store.name}</strong>
            <small>{kind === "fashion" ? copy.fashionDescriptor : copy.hardwareDescriptor}</small>
          </span>
        </a>
        <p>{store.footerText || store.description}</p>
        <div className="shopSocials">
          <a aria-label="Instagram" href="#">
            <Icon name="instagram" />
          </a>
          <a aria-label="Facebook" href="#">
            <Icon name="facebook" />
          </a>
          {whatsappUrl ? (
            <a aria-label="WhatsApp" href={whatsappUrl} rel="noreferrer" target="_blank">
              <Icon name="message" />
            </a>
          ) : null}
        </div>
      </div>
      <div>
        <strong>{copy.shop}</strong>
        <a href="#products">{copy.newAndFeatured}</a>
        {store.categories.slice(0, 4).map((item) => (
          <a href={`/#products`} key={item.id}>
            {item.name}
          </a>
        ))}
      </div>
      <div>
        <strong>{copy.help}</strong>
        <a href="#services">{copy.deliveryAndReturns}</a>
        <a href="#services">{copy.orderTracking}</a>
        <a href="#services">{kind === "fashion" ? copy.sizeGuide : copy.buyingGuides}</a>
        <a href="#services">{copy.contactUs}</a>
      </div>
      <div>
        <strong>{copy.contact}</strong>
        {store.contactEmail ? (
          <a href={`mailto:${store.contactEmail}`}>{store.contactEmail}</a>
        ) : null}
        {store.contactPhone ? <a href={`tel:${store.contactPhone}`}>{store.contactPhone}</a> : null}
        <span>{copy.cairoEgypt}</span>
        <small>{copy.hours}</small>
      </div>
      <div className="shopFooterBottom">
        <span>© 2026 {store.name}</span>
        <span>
          {copy.privacy} · {copy.terms}
        </span>
        <small>{copy.commerceBy}</small>
      </div>
    </footer>
  );
}

type IconName =
  | "arrow"
  | "bag"
  | "check"
  | "close"
  | "cpu"
  | "drill"
  | "facebook"
  | "fan"
  | "filter"
  | "globe"
  | "gpu"
  | "hammer"
  | "hanger"
  | "headset"
  | "heart"
  | "instagram"
  | "lock"
  | "memory"
  | "menu"
  | "message"
  | "monitor"
  | "moon"
  | "paint"
  | "return"
  | "saw"
  | "search"
  | "shield"
  | "spark"
  | "sun"
  | "toolbox"
  | "truck"
  | "wrench";

function Icon({ name }: { readonly name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    cpu: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
      </>
    ),
    drill: (
      <>
        <path d="M4 7h11v7H4z" />
        <path d="m15 9 5 1v2l-5 1M8 14v5h4v-5" />
      </>
    ),
    facebook: <path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-1 .4-1 1-1Z" />,
    fan: (
      <>
        <circle cx="12" cy="12" r="2" />
        <path d="M12 10c-2-4 0-7 3-7 2 0 3 2 2 4-1 2-3 3-5 3Zm2 2c4-2 7 0 7 3 0 2-2 3-4 2-2-1-3-3-3-5Zm-4 2c-4 2-7 0-7-3 0-2 2-3 4-2 2 1 3 3 3 5Z" />
      </>
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    ),
    gpu: (
      <>
        <rect x="3" y="6" width="17" height="11" rx="2" />
        <circle cx="11" cy="11.5" r="3" />
        <path d="M20 9h2v5h-2M6 17v3m3-3v3" />
      </>
    ),
    hammer: (
      <>
        <path d="m4 20 9-9" />
        <path d="m10 5 3-3 6 6-3 3z" />
      </>
    ),
    hanger: (
      <>
        <path d="M12 8a2 2 0 1 0-2-2" />
        <path d="m4 18 8-7 8 7H4Z" />
      </>
    ),
    headset: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h4v6H6a2 2 0 0 1-2-2v-4Zm16 0h-4v6h2a2 2 0 0 0 2-2v-4Z" />
      </>
    ),
    heart: (
      <path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    memory: (
      <>
        <rect x="3" y="8" width="18" height="8" rx="1" />
        <path d="M7 10v4m4-4v4m4-4v4m3-4v4M6 16v2m4-2v2m4-2v2m4-2v2" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    message: <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />,
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </>
    ),
    moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    paint: (
      <>
        <path d="M4 18h16v3H4z" />
        <path d="M7 18V8h10v10M9 8V4h6v4" />
      </>
    ),
    return: (
      <>
        <path d="m9 7-5 5 5 5" />
        <path d="M4 12h10a6 6 0 0 1 6 6" />
      </>
    ),
    saw: (
      <>
        <path d="m4 17 13-13 3 3-13 13z" />
        <path d="m6 15-2-2m5-1-2-2m5-1-2-2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    shield: <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />,
    spark: <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    toolbox: (
      <>
        <path d="M3 9h18v11H3z" />
        <path d="M9 9V5h6v4M3 14h18M10 14v2h4v-2" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    wrench: <path d="M14 6a5 5 0 0 0-6.5 6.5L3 17l4 4 4.5-4.5A5 5 0 0 0 18 10l-3 3-4-4 3-3Z" />,
  };
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

function storefrontKind(rendererKey: string): StorefrontKind {
  const key = rendererKey.toLowerCase();
  if (key.includes("pc") || key.includes("component")) return "pc";
  return key.includes("hardware") ? "hardware" : "fashion";
}

function categoryFashionIcon(index: number): IconName {
  return ["hanger", "spark", "bag", "heart", "hanger", "spark"][index % 6] as IconName;
}
function categoryHardwareIcon(index: number): IconName {
  return ["drill", "wrench", "hammer", "saw", "paint", "toolbox"][index % 6] as IconName;
}
function categoryPcIcon(index: number): IconName {
  return ["gpu", "cpu", "memory", "monitor", "fan", "toolbox"][index % 6] as IconName;
}
function hardwareProductIcon(index: number): IconName {
  return ["drill", "wrench", "hammer", "saw", "paint", "toolbox"][index % 6] as IconName;
}
function pcProductIcon(index: number): IconName {
  return ["gpu", "cpu", "memory", "monitor", "fan", "toolbox"][index % 6] as IconName;
}

function validCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.variantId === "string" &&
    typeof line.productId === "string" &&
    Number.isSafeInteger(line.quantity) &&
    Number(line.quantity) > 0
  );
}

function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function productPrice(product: StorefrontProduct): number {
  return product.salePriceMinor ?? product.priceMinor;
}
function unitPrice(
  product: StorefrontProduct,
  variant: StorefrontProduct["variants"][number],
): number {
  return (
    variant.salePriceMinor ?? variant.priceMinor ?? product.salePriceMinor ?? product.priceMinor
  );
}
function attribute(product: StorefrontProduct, key: string): string {
  const value = product.attributes[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}
function humanize(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function mediaUrl(organizationId: string, storageKey: string): string {
  const filename = storageKey.split("/").at(-1) ?? "";
  return `/factory-media/${organizationId}/${encodeURIComponent(filename)}`;
}

function presentationTokens(value: Readonly<Record<string, unknown>>): CSSProperties {
  const raw =
    value.tokens && typeof value.tokens === "object" && !Array.isArray(value.tokens)
      ? (value.tokens as Record<string, unknown>)
      : {};
  return {
    "--commerce-primary": typeof raw.primary === "string" ? raw.primary : "#171512",
    "--commerce-accent": typeof raw.accent === "string" ? raw.accent : "#a45f3f",
    "--commerce-surface": typeof raw.surface === "string" ? raw.surface : "#f8f6f1",
    "--commerce-radius": typeof raw.radius === "string" ? raw.radius : "18px",
  } as CSSProperties;
}

function commerceCopy(locale: "en" | "ar", kind: StorefrontKind) {
  const en = {
    navigation: "Main navigation",
    menu: "Open menu",
    home: "Home",
    cart: "Cart",
    fashionDescriptor: "Modern essentials",
    hardwareDescriptor: "Tools · Hardware · Trade",
    announcementFashion: "Complimentary delivery on orders over EGP 2,500",
    announcementHardware: "Trade pricing and same-day pickup available",
    deliveryMessage: "Delivery across Egypt",
    search: "Search products",
    searchFashion: "Search styles, collections, and products",
    searchHardware: "Search by tool, brand, model, or SKU",
    clearSearch: "Clear search",
    lightTheme: "Use light theme",
    darkTheme: "Use dark theme",
    newAndFeatured: "New & featured",
    services: "Services",
    sale: "Sale",
    announcement: "Announcement",
    checkoutFailed: "We could not place the order. Check your details and try again.",
    secureCheckout: "Protected checkout",
    yourCart: "Your shopping bag",
    emptyCart: "Your bag is waiting",
    emptyCartHelp: "Explore the catalog and add something made for you.",
    remove: "Remove",
    quantity: "Quantity",
    subtotal: "Subtotal",
    taxesAtCheckout: "Delivery and taxes calculated at checkout",
    checkout: "Checkout",
    deliveryDetails: "Delivery details",
    name: "Full name",
    email: "Email address",
    phone: "Phone number",
    address: "Street address",
    city: "City",
    shipping: "Delivery method",
    payment: "Payment method",
    coupon: "Promo code",
    optional: "Optional",
    notes: "Delivery notes",
    placeOrder: "Place secure order",
    secureNote: "Your order details are encrypted and protected.",
    thankYou: "Order confirmed",
    orderReceived: "Your order is on its way to us",
    orderConfirmation: "We’ll contact you shortly with delivery details.",
    continueShopping: "Continue shopping",
    featured: "Featured",
    addToCart: "Add to bag",
    backToProducts: "Back to products",
    rating: "Rating",
    verifiedReviews: "verified reviews",
    inStock: "In stock",
    readyToShip: "Ready to ship",
    outOfStock: "Out of stock",
    fastDelivery: "Fast delivery",
    easyReturns: "Easy returns",
    securePayment: "Secure payment",
    featuredPromotions: "Featured promotions",
    fashionHeroEyebrow: "The new coastal edit · 2026",
    fashionHeroTitle: "Quiet luxury, made to move.",
    fashionHeroBody:
      "Natural textures, considered silhouettes, and effortless layers curated for warm days and long nights.",
    fashionHeroEyebrow2: "The linen story",
    fashionHeroTitle2: "Lightness in every layer.",
    fashionHeroBody2:
      "A refined capsule of breathable staples designed for the rhythm of the coast.",
    hardwareHeroEyebrow: "Professional power · Built to last",
    hardwareHeroTitle: "The right tool changes the job.",
    hardwareHeroBody:
      "Workshop-grade tools, verified specifications, and expert support for professionals and serious makers.",
    hardwareHeroEyebrow2: "Project ready",
    hardwareHeroTitle2: "Build smarter. Finish stronger.",
    hardwareHeroBody2:
      "Reliable hardware and genuine accessories, selected for performance from first cut to final fix.",
    shopNow: kind === "fashion" ? "Shop the collection" : "Shop all tools",
    exploreCategories: "Explore categories",
    previousSlide: "Previous promotion",
    nextSlide: "Next promotion",
    newSeason: "New season",
    consideredDesign: "Considered design · Natural materials",
    proGrade: "Pro grade",
    jobsiteReady: "Jobsite ready · Warranty backed",
    storeBenefits: "Store benefits",
    deliveryTitle: "Flexible delivery",
    deliveryText: "Doorstep or pickup options",
    returnTitle: "Easy returns",
    returnText: "Simple 30-day process",
    secureTitle: "Secure checkout",
    secureText: "Protected order details",
    stylingTitle: "Personal styling",
    stylingText: "Advice when you need it",
    expertTitle: "Technical support",
    expertText: "Real experts, real answers",
    shopBy: "Find your next favorite",
    shopByStyle: "Shop by mood",
    shopByDepartment: "Shop by department",
    categoryFashionText:
      "Move from everyday foundations to elevated occasion pieces without losing your point of view.",
    categoryHardwareText:
      "Start with the job. Find the right category, compare key specs, and get back to building.",
    exploreNow: "Explore now",
    editorialEyebrow: "The journal · Vol. 04",
    editorialTitle: "A slower, better way to dress.",
    editorialText:
      "Discover versatile pieces that work harder in your wardrobe—chosen for feel, form, and longevity.",
    hardwareEditorialEyebrow: "Workshop notes · No. 08",
    hardwareEditorialTitle: "Choose the system, not just the tool.",
    hardwareEditorialText:
      "Match batteries, accessories, and applications with clear compatibility cues and practical buying guidance.",
    discoverTheEdit: kind === "fashion" ? "Read the story" : "Open the buying guide",
    curatedForYou: "Handpicked",
    trendingNow: "Trending now",
    weeklyDeals: "Workshop deals",
    trendingText: "The pieces everyone is wearing, presented in an easy-to-browse edit.",
    dealsText: "Professional performance with better value—while current stock lasts.",
    previousProducts: "Previous products",
    nextProducts: "Next products",
    catalog: "The complete collection",
    allProducts: "Find exactly what you need",
    catalogFashionText:
      "Filter by collection, maker, availability, and price. Your selections stay visible while you browse.",
    catalogHardwareText:
      "Search by model or SKU, narrow by department and brand, then compare essential specifications at a glance.",
    filters: "Filters",
    sortBy: "Sort by",
    newest: "Newest",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    nameSort: "Name",
    all: "All products",
    activeFilters: "Active filters",
    clearAll: "Clear all",
    closeFilters: "Close filters",
    category: "Category",
    brand: "Brand",
    price: "Price",
    maximumPrice: "Maximum price",
    availability: "Availability",
    onSale: "On sale",
    resetFilters: "Reset filters",
    showResults: "Show results",
    results: "products",
    forSearch: "matching",
    noProducts: "Nothing matches yet",
    noProductsHelp: "Try removing a filter or searching for a broader term.",
    upTo: "Up to",
    new: "New",
    save: "Save product",
    signatureCollection: "Signature collection",
    availableColors: "Available colors",
    quickAdd: "Quick add",
    ourApproach: "Our approach",
    builtForWork: "Built for real work",
    storyTitle: "Less noise. Better pieces.",
    hardwareStoryTitle: "Confidence in every specification.",
    storyText:
      "We curate useful, expressive design and make every step—from discovery to delivery—feel considered.",
    hardwareStoryText:
      "Clear product data, visible stock, and knowledgeable support help you buy once and build right.",
    dayReturns: "day easy returns",
    deliveryWindow: "Cairo dispatch window",
    qualityChecked: "quality checked",
    genuineTools: "genuine products",
    stayInLoop: "Stay in the loop",
    newsletterFashion: "New edits, considered stories, no clutter.",
    newsletterHardware: "Project tips, restocks, and trade offers.",
    emailPlaceholder: "Your email address",
    subscribe: "Subscribe",
    shop: "Shop",
    help: "Customer care",
    contact: "Visit & contact",
    deliveryAndReturns: "Delivery & returns",
    orderTracking: "Order tracking",
    sizeGuide: "Size guide",
    buyingGuides: "Buying guides",
    contactUs: "Contact us",
    cairoEgypt: "Cairo, Egypt",
    hours: "Saturday–Thursday · 9:00–18:00",
    privacy: "Privacy",
    terms: "Terms",
    commerceBy: "Commerce by Matrouh Solutions",
  };
  const normalizedEn = {
    ...en,
    checkoutFailed: "We could not save the order. Check your details and try again.",
    secureCheckout: "WhatsApp order",
    taxesAtCheckout: "Delivery is added after you choose a method",
    checkout: "Order request",
    placeOrder: "Send complete order on WhatsApp",
    preparingWhatsApp: "Preparing your WhatsApp order…",
    whatsappUnavailable: "This store has not configured a valid WhatsApp number yet.",
    secureNote:
      "No online payment is taken. You will confirm availability, delivery, and payment directly with the store on WhatsApp.",
    orderReceived: "Your order was saved",
    orderConfirmation:
      "Your complete order summary has opened in WhatsApp. Send the prepared message to confirm it with the store.",
    securePayment: "WhatsApp confirmation",
    secureTitle: "Direct confirmation",
    secureText: "Confirm delivery and payment on WhatsApp",
    pcHeroEyebrow3: "Compatibility-first builds",
    pcHeroTitle3: "Every component. One coherent system.",
    pcHeroBody3:
      "Compare sockets, chipsets, memory standards, power budgets, and dimensions before checkout.",
    ...(kind === "pc"
      ? {
          hardwareDescriptor: "PC components · systems · gaming",
          announcementHardware: "Free compatibility check and assembly on complete builds",
          searchHardware: "Search GPU, CPU, socket, chipset, or SKU",
          hardwareHeroEyebrow: "Next-generation performance · Built your way",
          hardwareHeroTitle: "Build the machine you actually want.",
          hardwareHeroBody:
            "Current PC components, clear compatibility data, and build advice without the guesswork.",
          hardwareHeroEyebrow2: "Frame-ready performance",
          hardwareHeroTitle2: "More frames. Faster work. Smarter thermals.",
          hardwareHeroBody2:
            "Balance GPU, processor, memory, cooling, and power for the workload that matters to you.",
          shopNow: "Shop PC components",
          proGrade: "Build verified",
          jobsiteReady: "Compatibility checked · Warranty backed",
          shopBy: "Start your build",
          shopByDepartment: "Choose a component",
          categoryHardwareText:
            "Move through the build in the right order—from performance core to cooling, power, and display.",
          hardwareEditorialEyebrow: "Build lab · Configuration 07",
          hardwareEditorialTitle: "Compatibility is a feature, not a footnote.",
          hardwareEditorialText:
            "Use socket, chipset, memory, clearance, and power cues to create a balanced system before you buy.",
          discoverTheEdit: "Open the build guide",
          weeklyDeals: "Upgrade picks",
          dealsText:
            "High-impact component upgrades selected for balanced performance and dependable value.",
          catalogHardwareText:
            "Search by model, socket, chipset, or SKU, then compare stock, price, and build-critical specifications.",
          builtForWork: "Engineered for your workload",
          hardwareStoryTitle: "A faster PC starts with a balanced build.",
          hardwareStoryText:
            "Transparent specifications and compatibility-first support help every component perform as one system.",
          newsletterHardware: "Launches, restocks, benchmark notes, and build advice.",
        }
      : {}),
  };
  if (locale === "en") return normalizedEn;
  const localizedAr = {
    ...normalizedEn,
    navigation: "التنقل الرئيسي",
    menu: "فتح القائمة",
    home: "الرئيسية",
    cart: "السلة",
    fashionDescriptor: "أساسيات عصرية",
    hardwareDescriptor: "أدوات · معدات · احتراف",
    announcementFashion: "توصيل مجاني للطلبات فوق ٢٬٥٠٠ ج.م",
    announcementHardware: "أسعار للمحترفين واستلام في نفس اليوم",
    deliveryMessage: "توصيل إلى جميع أنحاء مصر",
    search: "البحث عن المنتجات",
    searchFashion: "ابحث عن تصميم أو مجموعة أو منتج",
    searchHardware: "ابحث بالأداة أو الماركة أو الموديل أو الكود",
    clearSearch: "مسح البحث",
    lightTheme: "استخدام المظهر الفاتح",
    darkTheme: "استخدام المظهر الداكن",
    newAndFeatured: "الجديد والمميز",
    services: "الخدمات",
    sale: "التخفيضات",
    checkoutFailed: "تعذر إتمام الطلب. راجع بياناتك وحاول مرة أخرى.",
    secureCheckout: "دفع محمي",
    yourCart: "حقيبة التسوق",
    emptyCart: "حقيبتك في انتظارك",
    emptyCartHelp: "استكشف المنتجات وأضف ما يناسبك.",
    remove: "إزالة",
    quantity: "الكمية",
    subtotal: "المجموع الفرعي",
    taxesAtCheckout: "يتم حساب التوصيل والضرائب عند الدفع",
    checkout: "إتمام الطلب",
    deliveryDetails: "بيانات التوصيل",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    address: "عنوان الشارع",
    city: "المدينة",
    shipping: "طريقة التوصيل",
    payment: "طريقة الدفع",
    coupon: "كود الخصم",
    optional: "اختياري",
    notes: "ملاحظات التوصيل",
    placeOrder: "تأكيد الطلب الآمن",
    secureNote: "بيانات طلبك مشفرة ومحمية.",
    thankYou: "تم تأكيد الطلب",
    orderReceived: "وصل طلبك إلينا",
    orderConfirmation: "سنتواصل معك قريباً لتأكيد تفاصيل التوصيل.",
    continueShopping: "متابعة التسوق",
    featured: "مميز",
    addToCart: "أضف إلى السلة",
    backToProducts: "العودة إلى المنتجات",
    rating: "التقييم",
    verifiedReviews: "تقييماً موثقاً",
    inStock: "متوفر",
    readyToShip: "جاهز للشحن",
    outOfStock: "غير متوفر",
    fastDelivery: "توصيل سريع",
    easyReturns: "إرجاع سهل",
    securePayment: "دفع آمن",
    featuredPromotions: "العروض المميزة",
    fashionHeroEyebrow: "تشكيلة الساحل الجديدة · ٢٠٢٦",
    fashionHeroTitle: "أناقة هادئة تتحرك معك.",
    fashionHeroBody: "خامات طبيعية وقصّات مدروسة وطبقات خفيفة مختارة لأيام دافئة وليالٍ طويلة.",
    fashionHeroEyebrow2: "حكاية الكتان",
    fashionHeroTitle2: "خفة في كل طبقة.",
    fashionHeroBody2: "مجموعة راقية من القطع الأساسية القابلة للتنفس والمصممة لإيقاع الساحل.",
    hardwareHeroEyebrow: "قوة احترافية · صُنعت لتدوم",
    hardwareHeroTitle: "الأداة الصحيحة تغيّر المهمة.",
    hardwareHeroBody: "أدوات بمستوى الورش ومواصفات موثقة ودعم خبير للمحترفين وصنّاع المشاريع.",
    hardwareHeroEyebrow2: "جاهز للمشروع",
    hardwareHeroTitle2: "ابنِ بذكاء. أنهِ بقوة.",
    hardwareHeroBody2: "معدات موثوقة وملحقات أصلية مختارة للأداء من أول قطعية إلى آخر تثبيت.",
    shopNow: kind === "fashion" ? "تسوق المجموعة" : "تسوق كل الأدوات",
    exploreCategories: "استكشف الأقسام",
    previousSlide: "العرض السابق",
    nextSlide: "العرض التالي",
    newSeason: "موسم جديد",
    consideredDesign: "تصميم مدروس · خامات طبيعية",
    proGrade: "فئة احترافية",
    jobsiteReady: "جاهز للموقع · بضمان",
    storeBenefits: "مزايا المتجر",
    deliveryTitle: "توصيل مرن",
    deliveryText: "للباب أو الاستلام",
    returnTitle: "إرجاع سهل",
    returnText: "إجراءات بسيطة خلال ٣٠ يوماً",
    secureTitle: "دفع آمن",
    secureText: "بيانات طلب محمية",
    stylingTitle: "تنسيق شخصي",
    stylingText: "نصيحة عندما تحتاجها",
    expertTitle: "دعم فني",
    expertText: "خبراء حقيقيون وإجابات واضحة",
    shopBy: "اكتشف اختيارك القادم",
    shopByStyle: "تسوق حسب أسلوبك",
    shopByDepartment: "تسوق حسب القسم",
    categoryFashionText:
      "انتقل من الأساسيات اليومية إلى قطع المناسبات الراقية مع الحفاظ على أسلوبك.",
    categoryHardwareText: "ابدأ بالمهمة، اختر القسم، قارن المواصفات الأساسية، ثم عد إلى العمل.",
    exploreNow: "استكشف الآن",
    editorialEyebrow: "المجلة · العدد ٠٤",
    editorialTitle: "طريقة أهدأ وأفضل للملابس.",
    editorialText: "اكتشف قطعاً مرنة تعمل أكثر في خزانتك—مختارة للملمس والشكل وطول العمر.",
    hardwareEditorialEyebrow: "ملاحظات الورشة · ٠٨",
    hardwareEditorialTitle: "اختر المنظومة، وليس الأداة فقط.",
    hardwareEditorialText:
      "طابق البطاريات والملحقات والاستخدامات من خلال معلومات توافق واضحة وأدلة شراء عملية.",
    discoverTheEdit: kind === "fashion" ? "اقرأ الحكاية" : "افتح دليل الشراء",
    curatedForYou: "مختار لك",
    trendingNow: "الأكثر رواجاً",
    weeklyDeals: "عروض الورشة",
    trendingText: "القطع التي يختارها الجميع في مجموعة سهلة التصفح.",
    dealsText: "أداء احترافي بقيمة أفضل—حتى نفاد المخزون الحالي.",
    previousProducts: "المنتجات السابقة",
    nextProducts: "المنتجات التالية",
    catalog: "المجموعة الكاملة",
    allProducts: "اعثر على ما تحتاجه بالضبط",
    catalogFashionText:
      "صفِّ حسب المجموعة والماركة والتوفر والسعر، وتبقى اختياراتك ظاهرة أثناء التصفح.",
    catalogHardwareText:
      "ابحث بالموديل أو الكود، وحدد القسم والماركة، ثم قارن المواصفات المهمة سريعاً.",
    filters: "الفلاتر",
    sortBy: "ترتيب حسب",
    newest: "الأحدث",
    priceLow: "السعر: من الأقل",
    priceHigh: "السعر: من الأعلى",
    nameSort: "الاسم",
    all: "كل المنتجات",
    activeFilters: "الفلاتر النشطة",
    clearAll: "مسح الكل",
    closeFilters: "إغلاق الفلاتر",
    category: "القسم",
    brand: "الماركة",
    price: "السعر",
    maximumPrice: "أقصى سعر",
    availability: "التوفر",
    onSale: "عليه خصم",
    resetFilters: "إعادة ضبط",
    showResults: "عرض النتائج",
    results: "منتجات",
    forSearch: "تطابق",
    noProducts: "لا توجد نتائج مطابقة",
    noProductsHelp: "جرّب إزالة فلتر أو استخدام كلمة بحث أوسع.",
    upTo: "حتى",
    new: "جديد",
    save: "حفظ المنتج",
    signatureCollection: "المجموعة الأساسية",
    availableColors: "الألوان المتاحة",
    quickAdd: "إضافة سريعة",
    ourApproach: "نهجنا",
    builtForWork: "مصمم للعمل الحقيقي",
    storyTitle: "ضوضاء أقل. قطع أفضل.",
    hardwareStoryTitle: "ثقة في كل مواصفة.",
    storyText: "نختار تصميماً عملياً ومعبّراً ونجعل كل خطوة—من الاكتشاف إلى التوصيل—مدروسة.",
    hardwareStoryText:
      "بيانات واضحة ومخزون ظاهر ودعم خبير يساعدك على الشراء مرة والبناء بطريقة صحيحة.",
    dayReturns: "يوماً للإرجاع السهل",
    deliveryWindow: "مدة تجهيز القاهرة",
    qualityChecked: "فحص جودة",
    genuineTools: "منتجات أصلية",
    stayInLoop: "ابقَ على اطلاع",
    newsletterFashion: "مجموعات جديدة وحكايات مختارة بلا إزعاج.",
    newsletterHardware: "نصائح للمشاريع وتحديثات المخزون وعروض المحترفين.",
    emailPlaceholder: "بريدك الإلكتروني",
    subscribe: "اشترك",
    shop: "تسوق",
    help: "خدمة العملاء",
    contact: "الزيارة والتواصل",
    deliveryAndReturns: "التوصيل والإرجاع",
    orderTracking: "تتبع الطلب",
    sizeGuide: "دليل المقاسات",
    buyingGuides: "أدلة الشراء",
    contactUs: "تواصل معنا",
    cairoEgypt: "القاهرة، مصر",
    hours: "السبت–الخميس · ٩:٠٠–١٨:٠٠",
    privacy: "الخصوصية",
    terms: "الشروط",
    commerceBy: "منصة تجارة من مطروح سوليوشنز",
    ...(kind === "pc"
      ? {
          hardwareDescriptor: "مكونات كمبيوتر · تجميعات · ألعاب",
          announcementHardware: "فحص توافق وتجميع مجاني عند شراء تجميعة كاملة",
          searchHardware: "ابحث بكرت الشاشة أو المعالج أو المقبس أو الشريحة أو الكود",
          hardwareHeroEyebrow: "أداء الجيل الجديد · صممه بطريقتك",
          hardwareHeroTitle: "ابنِ الجهاز الذي تريده فعلاً.",
          hardwareHeroBody: "مكونات حديثة وبيانات توافق واضحة ونصيحة تجميع بدون تخمين.",
          hardwareHeroEyebrow2: "أداء جاهز للإطارات العالية",
          hardwareHeroTitle2: "إطارات أكثر. عمل أسرع. تبريد أذكى.",
          hardwareHeroBody2: "وازن بين كرت الشاشة والمعالج والذاكرة والتبريد والطاقة حسب استخدامك.",
          pcHeroEyebrow3: "تجميعات تبدأ من التوافق",
          pcHeroTitle3: "كل قطعة ضمن منظومة واحدة متناسقة.",
          pcHeroBody3: "قارن المقبس والشريحة ونوع الذاكرة والطاقة والأبعاد قبل إتمام الشراء.",
          shopNow: "تسوق مكونات الكمبيوتر",
          proGrade: "تجميعة موثقة",
          jobsiteReady: "توافق مفحوص · ضمان موثوق",
          shopBy: "ابدأ تجميعتك",
          shopByDepartment: "اختر المكوّن",
          categoryHardwareText:
            "تحرك خلال التجميعة بالترتيب الصحيح من نواة الأداء إلى التبريد والطاقة والشاشة.",
          hardwareEditorialEyebrow: "مختبر التجميع · الإعداد ٠٧",
          hardwareEditorialTitle: "التوافق ميزة أساسية، وليس ملاحظة جانبية.",
          hardwareEditorialText:
            "استخدم بيانات المقبس والشريحة والذاكرة والمساحة والطاقة لبناء جهاز متوازن قبل الشراء.",
          discoverTheEdit: "افتح دليل التجميع",
          weeklyDeals: "اختيارات الترقية",
          dealsText: "ترقيات مؤثرة مختارة لأداء متوازن وقيمة موثوقة.",
          catalogHardwareText:
            "ابحث بالموديل أو المقبس أو الشريحة أو الكود، ثم قارن السعر والمخزون ومواصفات التجميع المهمة.",
          builtForWork: "مصمم لاستخدامك",
          hardwareStoryTitle: "الكمبيوتر الأسرع يبدأ بتجميعة متوازنة.",
          hardwareStoryText: "مواصفات شفافة ودعم يركز على التوافق ليعمل كل مكوّن ضمن منظومة واحدة.",
          newsletterHardware: "إطلاقات جديدة وتحديثات مخزون وملاحظات أداء ونصائح تجميع.",
        }
      : {}),
  };
  return {
    ...localizedAr,
    checkoutFailed: "تعذر حفظ الطلب. راجع بياناتك وحاول مرة أخرى.",
    secureCheckout: "طلب عبر واتساب",
    taxesAtCheckout: "تُضاف تكلفة التوصيل بعد اختيار الطريقة",
    checkout: "طلب شراء",
    placeOrder: "إرسال الطلب كاملاً عبر واتساب",
    preparingWhatsApp: "جاري تجهيز طلب واتساب…",
    whatsappUnavailable: "لم يضبط هذا المتجر رقم واتساب صالحاً حتى الآن.",
    secureNote:
      "لن يتم تحصيل أي دفع إلكتروني. ستؤكد التوفر والتوصيل وطريقة الدفع مباشرة مع المتجر عبر واتساب.",
    orderReceived: "تم حفظ طلبك",
    orderConfirmation:
      "تم فتح ملخص طلبك كاملاً في واتساب. أرسل الرسالة الجاهزة لتأكيد الطلب مع المتجر.",
    securePayment: "تأكيد عبر واتساب",
    secureTitle: "تأكيد مباشر",
    secureText: "أكد التوصيل والدفع عبر واتساب",
  };
}
