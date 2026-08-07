import styles from "./landing.module.css";

type Locale = "ar" | "en";

const copy = {
  ar: {
    direction: "rtl" as const,
    language: "English",
    languageHref: "/en/matrouh-solutions",
    nav: [
      ["الخدمات", "#services"],
      ["كيف نعمل", "#process"],
      ["تواصل معنا", "#contact"],
    ],
    eyebrow: "حلول رقمية مصممة للنمو",
    title: "نحوّل فكرتك إلى حضور رقمي يعمل فعلاً.",
    lead: "نصمم ونبني مواقع سريعة، ثنائية اللغة، وسهلة الإدارة للشركات والمهنيين في مصر والمنطقة العربية.",
    primary: "ابدأ مشروعك",
    secondary: "اكتشف خدماتنا",
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
    footer: "مطروح سوليوشنز — مواقع عربية حديثة للأعمال الطموحة.",
  },
  en: {
    direction: "ltr" as const,
    language: "العربية",
    languageHref: "/matrouh-solutions",
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
    footer: "Matrouh Solutions — modern bilingual websites for ambitious businesses.",
  },
};

export function MatrouhLanding({ locale }: { readonly locale: Locale }) {
  const text = copy[locale];
  return (
    <div className={styles.page} dir={text.direction} lang={locale}>
      <header className={styles.header}>
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
          {text.nav.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
          <a
            className={styles.language}
            href={text.languageHref}
            hrefLang={locale === "ar" ? "en" : "ar"}
          >
            {text.language}
          </a>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{text.eyebrow}</p>
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
          </div>
          <div aria-hidden="true" className={styles.heroVisual}>
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
        </section>

        <section aria-label={locale === "ar" ? "مميزات" : "Highlights"} className={styles.proof}>
          {text.proof.map(([title, body]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </section>

        <section className={styles.section} id="services">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>{text.servicesEyebrow}</p>
            <h2>{text.servicesTitle}</h2>
          </div>
          <div className={styles.cardGrid}>
            {text.services.map(([title, body], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.processSection}`} id="process">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>{text.processEyebrow}</p>
            <h2>{text.processTitle}</h2>
          </div>
          <div className={styles.process}>
            {text.process.map(([number, title, body]) => (
              <article key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta} id="contact">
          <p className={styles.eyebrow}>{text.ctaEyebrow}</p>
          <h2>{text.ctaTitle}</h2>
          <p>{text.ctaBody}</p>
          <a href="mailto:support@matrouh.solutions">{text.cta}</a>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <img alt="" src="/matrouh-logo.png" />
          <span>
            <strong>Matrouh</strong>
            <small>Solutions</small>
          </span>
        </div>
        <p>{text.footer}</p>
        <a href="mailto:support@matrouh.solutions">support@matrouh.solutions</a>
      </footer>
    </div>
  );
}
