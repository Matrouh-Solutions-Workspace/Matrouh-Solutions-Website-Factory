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

  return (
    <section
      className="panel menuQrPanel"
      dir={locale === "ar" ? "rtl" : "ltr"}
      hidden={hidden}
      id={id}
    >
      <div className="menuQrPanelCopy">
        <p className="eyebrow">{text.eyebrow}</p>
        <h2>{text.title}</h2>
        <p>{publicUrl ? text.description : text.publishFirst}</p>
      </div>
      {publicUrl && qrDataUrl ? (
        <div className="menuQrWorkspace">
          <article className="menuQrPrintCard">
            <span>{text.cardEyebrow}</span>
            <strong>{businessName}</strong>
            <img alt={`${text.qrAlt} ${businessName}`} height={720} src={qrDataUrl} width={720} />
            <h3>{text.scan}</h3>
            <p>{text.cardDescription}</p>
            <small>{publicUrl}</small>
          </article>
          <div className="menuQrActions">
            <button onClick={() => window.print()} type="button">
              {text.print}
            </button>
            <a download={downloadName} href={qrDataUrl}>
              {text.download}
            </a>
          </div>
          <p className="formNotice">{text.printHint}</p>
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
  printHint: "For reliable scanning, print at A5 or larger and keep the white border around the code.",
  notReady: "QR code not ready yet",
  notReadyDescription: "The QR code appears here as soon as this menu has a live domain.",
  qrAlt: "QR code for",
} as const;

const arabic: Record<keyof typeof english, string> = {
  eyebrow: "رمز QR للطاولات",
  title: "اطبع رمز القائمة",
  description: "يفتح هذا الرمز القائمة المنشورة دائماً، لذلك يمكنك تحديث الأسعار والتوفر دون إعادة طباعته.",
  publishFirst: "انشر القائمة واربط النطاق لإنشاء رمز QR الدائم.",
  cardEyebrow: "القائمة الرقمية",
  scan: "امسح الرمز لعرض قائمتنا",
  cardDescription: "تصفح الطعام والمشروبات والأسعار والمتاح اليوم من هاتفك.",
  print: "طباعة بطاقة QR",
  download: "تنزيل PNG",
  printHint: "لأفضل قراءة اطبع بحجم A5 أو أكبر وحافظ على المساحة البيضاء حول الرمز.",
  notReady: "رمز QR غير جاهز بعد",
  notReadyDescription: "سيظهر الرمز هنا بمجرد نشر القائمة وربط نطاق مباشر.",
  qrAlt: "رمز QR لـ",
};
