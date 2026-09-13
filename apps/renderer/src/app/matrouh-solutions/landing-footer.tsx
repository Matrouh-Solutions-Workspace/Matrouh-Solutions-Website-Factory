import {
  MATROUH_EMAIL,
  MATROUH_EMAIL_URL,
  MATROUH_FACEBOOK_URL,
  MATROUH_WHATSAPP_NUMBER,
  MATROUH_WHATSAPP_URL,
} from "../public-contact-links";
import { ContactIcon } from "./contact-section";
import styles from "./landing-footer.module.css";

export function LandingFooter({ locale }: { readonly locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const groups = [
    {
      title: ar ? "خدماتنا" : "SERVICES",
      links: [
        [ar ? "التصميم والهوية الرقمية" : "Design & digital identity", "#service-design"],
        [ar ? "تطوير المواقع" : "Website development", "#services"],
        [ar ? "مواقع عربية وإنجليزية" : "Arabic & English websites", "#service-bilingual"],
        [ar ? "الإطلاق والتشغيل" : "Launch & ongoing care", "#service-launch"],
      ],
    },
    {
      title: ar ? "القوالب" : "TEMPLATES",
      links: [
        [ar ? "جميع القوالب" : "All templates", `/templates?locale=${locale}`],
        [
          ar ? "المطاعم والمقاهي" : "Restaurants & cafés",
          `/templates?locale=${locale}&category=food-and-hospitality`,
        ],
        [
          ar ? "الخدمات الاحترافية" : "Professional services",
          `/templates?locale=${locale}&category=professional-services`,
        ],
        [ar ? "الرعاية الصحية" : "Healthcare", `/templates?locale=${locale}&category=healthcare`],
        [
          ar ? "الأعمال الإبداعية" : "Creative portfolios",
          `/templates?locale=${locale}&category=portfolio`,
        ],
        [
          ar ? "التجارة الإلكترونية" : "E-commerce",
          `/templates?locale=${locale}&category=e-commerce`,
        ],
      ],
    },
    {
      title: ar ? "مطروح سوليوشنز" : "MATROUH SOLUTIONS",
      links: [
        [ar ? "الرئيسية" : "Home", "/"],
        [ar ? "كيف نعمل" : "Our approach", "#process"],
        [ar ? "ابدأ مشروعك" : "Start a project", "#contact"],
        [ar ? "بوابة العملاء" : "Client portal", "/dashboard/login"],
      ],
    },
  ];
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.directory}>
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3>{group.title}</h3>
              {group.links.map(([label, href]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </nav>
          ))}
          <div className={styles.contact}>
            <h3>{ar ? "لنبقَ على تواصل" : "GET IN TOUCH"}</h3>
            <a href={MATROUH_WHATSAPP_URL} target="_blank" rel="noreferrer">
              <small>WhatsApp</small>
              <strong dir="ltr">{MATROUH_WHATSAPP_NUMBER}</strong>
            </a>
            <a href={MATROUH_EMAIL_URL}>
              <small>{ar ? "البريد الإلكتروني" : "Email"}</small>
              <strong dir="ltr">{MATROUH_EMAIL}</strong>
            </a>
            <p>{ar ? "نرد خلال يوم عمل واحد." : "We respond within one business day."}</p>
          </div>
        </div>
        <div className={styles.brandRow}>
          <div>
            <a className={styles.brand} href="/" aria-label="Matrouh Solutions">
              <img src="/matrouh-logo.png" alt="" width="48" height="48" />
              <span dir="ltr">
                <strong>
                  Matrouh<span>.</span>
                </strong>
                <small>SOLUTIONS</small>
              </span>
            </a>
            <p>
              {ar
                ? "نصمم ونطوّر حضوراً رقمياً يعبّر عن طموحك. مواقع حديثة للأعمال في مصر والمنطقة العربية."
                : "We design and build a digital presence that reflects your ambition. Modern websites for businesses across Egypt and the Arab world."}
            </p>
          </div>
          <div className={styles.promise}>
            <small>{ar ? "من الفكرة إلى الإطلاق" : "FROM FIRST IDEA TO LAUNCH"}</small>
            <strong>
              {ar ? "تصميم مدروس. تطوير متكامل." : "Thoughtful design. Complete delivery."}
            </strong>
            <a href="#contact">
              {ar ? "لنتحدث عن مشروعك" : "Let’s talk about your project"}
              <span aria-hidden="true">{ar ? "↖" : "↗"}</span>
            </a>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>
            © {new Date().getFullYear()} Matrouh Solutions.{" "}
            {ar ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </p>
          <a href={ar ? "/en/matrouh-solutions" : "/matrouh-solutions"} hrefLang={ar ? "en" : "ar"}>
            {ar ? "English" : "العربية"}
          </a>
          <div className={styles.socials}>
            <a href={MATROUH_WHATSAPP_URL} aria-label="WhatsApp" target="_blank" rel="noreferrer">
              <ContactIcon kind="whatsapp" />
            </a>
            <a href={MATROUH_FACEBOOK_URL} aria-label="Facebook" target="_blank" rel="noreferrer">
              <ContactIcon kind="facebook" />
            </a>
            <a href={MATROUH_EMAIL_URL} aria-label={ar ? "البريد الإلكتروني" : "Email"}>
              <ContactIcon kind="email" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
