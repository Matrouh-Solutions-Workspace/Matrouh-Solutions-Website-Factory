import type { CSSProperties } from "react";
import styles from "./landing.module.css";
import { LandingMotion } from "./landing-motion";

type Locale = "ar" | "en";

const copy = {
  ar: {
    direction: "rtl" as const,
    language: "English",
    languageHref: "/en/matrouh-solutions",
    portal: "بوابة لوحة التحكم",
    nav: [
      ["الخدمات", "#services"],
      ["كيف نعمل", "#process"],
      ["تواصل معنا", "#contact"],
    ],
    title: "نحوّل فكرتك إلى حضور رقمي يعمل فعلاً.",
    lead: "نصمم ونبني مواقع سريعة، ثنائية اللغة، وسهلة الإدارة للشركات والمهنيين في مصر والمنطقة العربية.",
    primary: "ابدأ مشروعك",
    secondary: "اكتشف خدماتنا",
    scroll: "اسحب لاكتشاف الرحلة",
    proof: [
      ["عربي + English", "تجربة ثنائية اللغة من الأساس"],
      ["أداء سريع", "بنية حديثة وتجربة سلسة"],
      ["إدارة سهلة", "حدّث موقعك بدون تعقيد"],
    ],
    servicesEyebrow: "ما الذي نقدمه",
    servicesTitle: "موقع متكامل، وليس مجرد قالب.",
    services: [
      ["تصميم وهوية رقمية", "واجهات مميزة تعكس علامتك وتعمل بكفاءة على كل الشاشات."],
      ["مواقع ثنائية اللغة", "محتوى وتنقل عربي وإنجليزي مع اتجاه صحيح وتجربة طبيعية لكل زائر."],
      ["إطلاق وتشغيل", "نطاق، نشر، مراقبة، وصيانة مستمرة من مكان واحد."],
    ],
    processEyebrow: "طريقة العمل",
    processTitle: "من أول محادثة إلى موقع منشور.",
    process: [
      ["01", "نفهم", "نحدد أهدافك وجمهورك والمحتوى المطلوب."],
      ["02", "نصمم ونبني", "نحوّل الاتجاه المتفق عليه إلى تجربة سريعة وواضحة."],
      ["03", "نطلق ونطوّر", "ننشر الموقع ونراقبه ونستمر في تحسينه مع نموك."],
    ],
    ctaEyebrow: "لنبنِ شيئاً يستحق الزيارة",
    ctaTitle: "جاهز لموقع يمثل عملك بالشكل الصحيح؟",
    ctaBody: "احكِ لنا عن مشروعك وسنعود إليك بخطوة أولى واضحة.",
    cta: "تواصل مع مطروح سوليوشنز",
    ctaNote: "رد خلال يوم عمل واحد",
    footer: "مطروح سوليوشنز — مواقع عربية حديثة للأعمال الطموحة.",
  },
  en: {
    direction: "ltr" as const,
    language: "العربية",
    languageHref: "/matrouh-solutions",
    portal: "Control portal",
    nav: [
      ["Services", "#services"],
      ["Process", "#process"],
      ["Contact", "#contact"],
    ],
    eyebrow: "Digital products built for growth",
    title: "We turn your idea into a digital presence that works.",
    lead: "We design and build fast, bilingual, easy-to-manage websites for businesses and professionals across Egypt and the Arab world.",
    primary: "Start your project",
    secondary: "Explore our services",
    scroll: "Scroll to explore the journey",
    proof: [
      ["Arabic + English", "Bilingual by design, not as an afterthought"],
      ["Fast performance", "Modern foundations and a smooth experience"],
      ["Simple control", "Update your website without the friction"],
    ],
    servicesEyebrow: "What we deliver",
    servicesTitle: "A complete website, not another template.",
    services: [
      [
        "Digital design and identity",
        "Distinctive interfaces that represent your brand on every screen.",
      ],
      [
        "Bilingual websites",
        "Natural Arabic and English content, navigation, direction, and user journeys.",
      ],
      ["Launch and operations", "Domains, publishing, monitoring, and ongoing care in one system."],
    ],
    processEyebrow: "How we work",
    processTitle: "From the first conversation to a live website.",
    process: [
      ["01", "Understand", "We define your goals, audience, and the content the site needs."],
      ["02", "Design and build", "We turn the agreed direction into a focused, fast experience."],
      [
        "03",
        "Launch and improve",
        "We publish, monitor, and keep improving as your business grows.",
      ],
    ],
    ctaEyebrow: "Let’s build something worth visiting",
    ctaTitle: "Ready for a website that represents your work properly?",
    ctaBody: "Tell us about your project and we’ll come back with a clear first step.",
    cta: "Contact Matrouh Solutions",
    ctaNote: "Response within one business day",
    footer: "Matrouh Solutions — modern bilingual websites for ambitious businesses.",
  },
};

export function MatrouhLanding({ locale }: { readonly locale: Locale }) {
  const text = copy[locale];
  return (
    <div className={styles.page} data-landing-page dir={text.direction} lang={locale}>
      <LandingMotion />
      <div aria-hidden="true" className={styles.ambientGrid} />
      <header className={styles.header} data-landing-header>
        <a
          className={styles.brand}
          href={locale === "ar" ? "/matrouh-solutions" : "/en/matrouh-solutions"}
        >
          <img alt="" src="/matrouh-logo.png" />
          <span>
            <strong>Matrouh</strong>
            <small>Solutions</small>
          </span>
        </a>
        <nav aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
          <div className={styles.navLinks}>
            {text.nav.map(([label, href], index) => (
              <a data-nav-target={href?.slice(1)} href={href} key={href}>
                <small>0{index + 1}</small>
                <span>{label}</span>
              </a>
            ))}
          </div>
          <div className={styles.navActions}>
            <a
              className={styles.language}
              href={text.languageHref}
              hrefLang={locale === "ar" ? "en" : "ar"}
            >
              {text.language}
            </a>
            <a
              aria-label={text.portal}
              className={styles.portal}
              href="/dashboard/login"
              title={text.portal}
            >
              <span>{text.portal}</span>
              <i aria-hidden="true">↗</i>
            </a>
          </div>
        </nav>
      </header>

      <nav
        aria-label={locale === "ar" ? "التنقل السريع" : "Quick navigation"}
        className={styles.mobileNav}
      >
        {text.nav.map(([label, href], index) => (
          <a data-nav-target={href?.slice(1)} href={href} key={href}>
            <small>0{index + 1}</small>
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy} data-reveal>
            <h1>{text.title}</h1>
            <p className={styles.lead}>{text.lead}</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#contact">
                {text.primary}
              </a>
              <a className={styles.secondary} href="#services">
                {text.secondary}
              </a>
            </div>
            <div className={styles.scrollCue}>
              <i />
              <span>{text.scroll}</span>
            </div>
          </div>
          <div className={styles.heroVisualFrame} data-reveal>
            <div aria-hidden="true" className={styles.heroVisual}>
              <div className={styles.visualBadge}>01 / DIGITAL</div>
              <div className={styles.browserBar}>
                <i />
                <i />
                <i />
              </div>
              <div className={styles.visualBody}>
                <span>MATROUH / SOLUTIONS</span>
                <strong>
                  وضوح في التصميم.
                  <br />
                  قوة في التنفيذ.
                </strong>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label={locale === "ar" ? "مميزات" : "Highlights"} className={styles.proof} data-reveal="scale">
          {text.proof.map(([title, body], index) => (
            <article key={title} style={{ "--item-index": index } as CSSProperties}>
              <span aria-hidden="true">0{index + 1}</span>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </section>

        <section className={styles.section} data-section="01" id="services">
          <div className={styles.sectionHead} data-reveal="heading">
            <p className={styles.eyebrow}>{text.servicesEyebrow}</p>
            <h2>{text.servicesTitle}</h2>
          </div>
          <div className={styles.cardGrid}>
            {text.services.map(([title, body], index) => (
              <article data-reveal="card" key={title} className="transition duration-200 ease-in-out" style={{ "--item-index": index, transition:"0.2s" } as CSSProperties}>
                <span>0{index + 1}</span>
                <i aria-hidden="true">↗</i>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.processSection}`} data-section="02" id="process">
          <div aria-hidden="true" className={styles.processGlow} />
          <div className={styles.sectionHead} data-reveal="heading">
            <p className={styles.eyebrow}>{text.processEyebrow}</p>
            <h2>{text.processTitle}</h2>
          </div>
          <div className={styles.process}>
            {text.process.map(([number, title, body], index) => (
              <article data-reveal="process" key={number} className="transition duration-200 ease-in-out" style={{ "--item-index": index, transition: "0.2s" } as CSSProperties}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta} data-reveal="scale" id="contact">
          <div aria-hidden="true" className={styles.ctaMark}>M</div>
          <p className={styles.eyebrow}>{text.ctaEyebrow}</p>
          <h2>{text.ctaTitle}</h2>
          <p>{text.ctaBody}</p>
          <div className={styles.ctaAction}>
            <a href="mailto:support@matrouh.solutions">{text.cta}<span aria-hidden="true">↗</span></a>
            <small>{text.ctaNote}</small>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner} data-reveal="scale">
          <div className={styles.footerTop}>
            <div className={styles.footerIdentity}>
              <a
                className={styles.brand}
                href={locale === "ar" ? "/matrouh-solutions" : "/en/matrouh-solutions"}
              >
                <img alt="" src="/matrouh-logo.png" />
                <span>
                  <strong>Matrouh</strong>
                  <small>Solutions</small>
                </span>
              </a>
              <p>{text.footer}</p>
            </div>
            <div className={styles.footerContact}>
              <span>{locale === "ar" ? "لديك مشروع في ذهنك؟" : "Have a project in mind?"}</span>
              <a href="mailto:support@matrouh.solutions">
                support@matrouh.solutions
                <i aria-hidden="true">↗</i>
              </a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© Matrouh Solutions</span>
            <nav aria-label={locale === "ar" ? "روابط التذييل" : "Footer navigation"}>
              {text.nav.map(([label, href]) => (
                <a href={href} key={href}>{label}</a>
              ))}
              <a href={text.languageHref} hrefLang={locale === "ar" ? "en" : "ar"}>
                {text.language}
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
