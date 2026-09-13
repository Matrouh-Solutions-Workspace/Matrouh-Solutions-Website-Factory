import type { CSSProperties } from "react";
import styles from "./landing.module.css";
import { LandingMotion } from "./landing-motion";
import { LandingNavigation } from "./landing-navigation";
import { LandingHero } from "./landing-hero";
import { ContactSection } from "./contact-section";
import { LandingFooter } from "./landing-footer";

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
  const serviceDetails =
    locale === "ar"
      ? [
          [
            "هيكلة الصفحات ورحلة الزائر",
            "واجهات متجاوبة للهاتف والكمبيوتر",
            "ألوان وخطوط تعبّر عن علامتك",
          ],
          [
            "تنقل ومحتوى بالعربية والإنجليزية",
            "اتجاه صحيح وتجربة مناسبة لكل لغة",
            "لوحة تحكم لتحديث محتواك بسهولة",
          ],
          ["ربط النطاق ونشر الموقع", "متابعة التشغيل والأداء", "صيانة وتحسينات مع نمو عملك"],
        ]
      : [
          [
            "Page structure and visitor journeys",
            "Responsive desktop and mobile layouts",
            "Colours and typography for your brand",
          ],
          [
            "Arabic and English content and navigation",
            "Natural layouts for each language",
            "A dashboard for easy content updates",
          ],
          [
            "Domain connection and website publishing",
            "Operational and performance monitoring",
            "Maintenance as your business grows",
          ],
        ];
  const serviceIds = ["service-design", "service-bilingual", "service-launch"];
  const enterprise =
    locale === "ar"
      ? {
          proofLabel: "معايير التسليم",
          proofNote: "منهج رقمي واضح يجمع بين الجودة والسرعة وسهولة التشغيل.",
          servicesSummary:
            "نربط الاستراتيجية والتصميم والهندسة في مسار واحد، من القرار الأول حتى التشغيل المستمر.",
          processSummary:
            "مراحل محددة، مسؤوليات واضحة، وتسليمات قابلة للقياس في كل نقطة من المشروع.",
          serviceMeta: ["استراتيجية / تجربة", "محتوى / RTL + LTR", "إطلاق / تشغيل"],
          phaseLabel: "مرحلة",
          processMeta: ["اكتشاف ومواءمة", "تصميم وهندسة", "إطلاق وتحسين"],
          contactLabel: "قناة المشاريع الجديدة",
          contactActionLabel: "تواصل مباشرة مع فريقنا عبر واتساب",
        }
      : {
          proofLabel: "Delivery standards",
          proofNote: "A clear digital operating model built around quality, speed, and control.",
          servicesSummary:
            "We connect strategy, design, and engineering in one accountable path—from the first decision to ongoing operations.",
          processSummary:
            "Defined phases, clear ownership, and measurable deliverables at every point in the engagement.",
          serviceMeta: ["Strategy / Experience", "Content / RTL + LTR", "Launch / Operations"],
          phaseLabel: "Phase",
          processMeta: ["Discovery & alignment", "Design & engineering", "Launch & optimization"],
          contactLabel: "New business desk",
          contactActionLabel: "Speak directly with our team on WhatsApp",
        };
  return (
    <div className={styles.page} data-landing-page dir={text.direction} lang={locale}>
      <LandingMotion />
      <LandingNavigation locale={locale} />

      <main id="landing-content" tabIndex={-1}>
        <LandingHero locale={locale} />

        <section
          aria-label={locale === "ar" ? "مميزات" : "Highlights"}
          className={styles.proof}
          data-reveal="scale"
        >
          <div className={styles.proofIntro}>
            <span>{enterprise.proofLabel}</span>
            <p>{enterprise.proofNote}</p>
          </div>
          {text.proof.map(([title, body], index) => (
            <article key={title} style={{ "--item-index": index } as CSSProperties}>
              <span aria-hidden="true">0{index + 1}</span>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </section>

        <section
          className={`${styles.section} ${styles.enhancedServices}`}
          data-reveal="section"
          data-section="01"
          id="services"
        >
          <div className={styles.sectionHead} data-reveal="heading">
            <div>
              <p className={styles.eyebrow}>{text.servicesEyebrow}</p>
              <h2>{text.servicesTitle}</h2>
            </div>
            <p className={styles.sectionSummary}>{enterprise.servicesSummary}</p>
          </div>
          <div className={styles.cardGrid}>
            {text.services.map(([title, body], index) => (
              <article
                data-reveal="card"
                key={title}
                id={serviceIds[index]}
                className="transition duration-200 ease-in-out"
                style={{ "--item-index": index, transition: "0.2s" } as CSSProperties}
              >
                <div className={styles.serviceCardTop}>
                  <span>0{index + 1}</span>
                  <i aria-hidden="true">{locale === "ar" ? "↖" : "↗"}</i>
                </div>
                <small className={styles.serviceMeta}>{enterprise.serviceMeta[index]}</small>
                <h3>{title}</h3>
                <p>{body}</p>
                <ul className={styles.serviceDetails}>
                  {serviceDetails[index]?.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <a className={styles.serviceLink} href="#contact">
                  {locale === "ar" ? "ناقش احتياجات مشروعك" : "Discuss your project"}
                  <span aria-hidden="true">{locale === "ar" ? "↖" : "↗"}</span>
                </a>
              </article>
            ))}
          </div>
          <div className={styles.servicesEnd}>
            <p>
              {locale === "ar"
                ? "ابدأ بقالب يناسب نشاطك، أو تحدث معنا عن تجربة مصممة لعملك."
                : "Start with a template for your industry, or talk to us about an experience designed for your business."}
            </p>
            <a href={`/templates?locale=${locale}`}>
              {locale === "ar" ? "استكشف القوالب" : "Explore templates"}
              <span aria-hidden="true">{locale === "ar" ? "↖" : "↗"}</span>
            </a>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.processSection}`}
          data-reveal="section"
          data-section="02"
          id="process"
        >
          <div aria-hidden="true" className={styles.processGlow} />
          <div className={styles.sectionHead} data-reveal="heading">
            <div>
              <p className={styles.eyebrow}>{text.processEyebrow}</p>
              <h2>{text.processTitle}</h2>
            </div>
            <p className={styles.sectionSummary}>{enterprise.processSummary}</p>
          </div>
          <div className={styles.process}>
            {text.process.map(([number, title, body], index) => (
              <article
                data-reveal="process"
                key={number}
                className="transition duration-200 ease-in-out"
                style={{ "--item-index": index, transition: "0.2s" } as CSSProperties}
              >
                <div className={styles.processIndex}>
                  <small>{enterprise.phaseLabel}</small>
                  <span>{number}</span>
                </div>
                <div className={styles.processCopy}>
                  <small>{enterprise.processMeta[index]}</small>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <ContactSection locale={locale} />
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
