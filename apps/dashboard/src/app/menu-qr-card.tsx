"use client";

interface MenuQrCardProperties {
  readonly businessName: string;
  readonly hidden?: boolean;
  readonly id?: string;
  readonly locale: "ar" | "en";
  readonly publicUrl: string | null;
  readonly qrDataUrl: string | null;
}

export function MenuQrCard({
  businessName,
  hidden,
  id,
  locale,
  publicUrl,
  qrDataUrl,
}: MenuQrCardProperties) {
  const text = locale === "ar" ? arabic : english;
  const downloadName = `${businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "menu"}-qr.png`;
  const displayUrl = publicUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <section
      className="panel menuQrPanel"
      dir={locale === "ar" ? "rtl" : "ltr"}
      hidden={hidden}
      id={id}
    >
      <header className="menuQrPanelHeader">
        <div className="menuQrPanelCopy">
          <p className="eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
          <p>{publicUrl ? text.description : text.publishFirst}</p>
        </div>
        {publicUrl && qrDataUrl ? (
          <span className="menuQrStatus">
            <i aria-hidden />
            {text.ready}
          </span>
        ) : null}
      </header>
      {publicUrl && qrDataUrl ? (
        <div className="menuQrWorkspace">
          <div className="menuQrPreview">
            <div className="menuQrPreviewHeader">
              <strong>{text.preview}</strong>
              <span>{text.cardSize}</span>
            </div>
            <article className="menuQrPrintCard">
              <span>{text.cardEyebrow}</span>
              <strong>{businessName}</strong>
              <img alt={`${text.qrAlt} ${businessName}`} height={720} src={qrDataUrl} width={720} />
              <h3>{text.scan}</h3>
              <p>{text.cardDescription}</p>
              <small dir="ltr">{publicUrl}</small>
            </article>
          </div>
          <aside className="menuQrControls">
            <div className="menuQrDestination">
              <span>{text.destination}</span>
              <strong dir="ltr">{displayUrl}</strong>
            </div>
            <div className="menuQrActions">
              <button onClick={() => window.print()} type="button">
                <span aria-hidden>↗</span>
                {text.print}
              </button>
              <a download={downloadName} href={qrDataUrl}>
                <span aria-hidden>↓</span>
                {text.download}
              </a>
            </div>
            <p className="menuQrHelp">{text.printHint}</p>
          </aside>
        </div>
      ) : (
        <div className="menuQrEmpty">
          <span aria-hidden>▦</span>
          <strong>{text.notReady}</strong>
          <p>{text.notReadyDescription}</p>
        </div>
      )}
    </section>
  );
}

const english = {
  eyebrow: "Table-ready QR",
  title: "Print your menu QR code",
  description:
    "This code always opens the live menu, so you can change prices and availability without reprinting it.",
  publishFirst: "Publish the menu and connect its domain to generate the permanent QR code.",
  cardEyebrow: "Digital menu",
  scan: "Scan to view our menu",
  cardDescription: "Browse food, drinks, prices, and today’s availability on your phone.",
  print: "Print QR card",
  download: "Download PNG",
  printHint:
    "For reliable scanning, print at A5 or larger and keep the white border around the code.",
  ready: "Ready to print",
  preview: "Print preview",
  cardSize: "A5 table card",
  destination: "Menu link",
  notReady: "QR code not ready yet",
  notReadyDescription: "The QR code appears here as soon as this menu has a live domain.",
  qrAlt: "QR code for",
} as const;

const arabic: Record<keyof typeof english, string> = {
  eyebrow: "رمز QR للطاولات",
  title: "اطبع رمز القائمة",
  description:
    "يفتح هذا الرمز القائمة المنشورة دائماً، لذلك يمكنك تحديث الأسعار والتوفر دون إعادة طباعته.",
  publishFirst: "انشر القائمة واربط النطاق لإنشاء رمز QR الدائم.",
  cardEyebrow: "القائمة الرقمية",
  scan: "امسح الرمز لعرض قائمتنا",
  cardDescription: "تصفح الطعام والمشروبات والأسعار والمتاح اليوم من هاتفك.",
  print: "طباعة بطاقة QR",
  download: "تنزيل PNG",
  printHint: "لأفضل قراءة اطبع بحجم A5 أو أكبر وحافظ على المساحة البيضاء حول الرمز.",
  ready: "جاهز للطباعة",
  preview: "معاينة الطباعة",
  cardSize: "بطاقة طاولة A5",
  destination: "رابط القائمة",
  notReady: "رمز QR غير جاهز بعد",
  notReadyDescription: "سيظهر الرمز هنا بمجرد نشر القائمة وربط نطاق مباشر.",
  qrAlt: "رمز QR لـ",
};
