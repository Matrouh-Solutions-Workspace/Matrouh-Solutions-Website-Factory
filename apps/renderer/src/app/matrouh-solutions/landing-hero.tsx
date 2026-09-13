import styles from "./landing-intro.module.css";

export function LandingHero({ locale }: { readonly locale: "ar" | "en" }) {
  const ar = locale === "ar";
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroGrid}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {ar ? "شريكك في التصميم والتطوير الرقمي" : "YOUR DIGITAL DESIGN & DEVELOPMENT PARTNER"}
          </p>
          <h1 id="landing-title">
            {ar ? (
              <>
                طموحك يستحق
                <br />
                حضوراً رقمياً
                <br />
                <span className={styles.highlight}>على مستواه.</span>
              </>
            ) : (
              <>
                Your ambition.
                <br />
                An exceptional
                <br />
                <span className={styles.highlight}>digital presence.</span>
              </>
            )}
          </h1>
          <p className={styles.lead}>
            {ar
              ? "نصمم ونطوّر مواقع تعكس قيمة عملك. تجربة عربية وإنجليزية متكاملة، إدارة سهلة، وشريك معك من الفكرة إلى الإطلاق وما بعده."
              : "We design and build websites that do your business justice. Arabic and English, simple to manage, with a partner from the first idea to launch and beyond."}
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#contact">
              {ar ? "لنبدأ مشروعك" : "Let’s build your website"}
              <span aria-hidden="true">↗</span>
            </a>
            <a className={styles.secondary} href={`/templates?locale=${locale}`}>
              {ar ? "استكشف القوالب" : "Explore templates"}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={styles.reassurance}>
            <span aria-hidden="true">↳</span>
            <p>
              {ar
                ? "فكرتك هي البداية. نتولى معك بقية الرحلة."
                : "Your idea is the starting point. We take it from there."}
            </p>
          </div>
        </div>

        <figure
          className={styles.showcase}
          aria-label={
            ar
              ? "تصور لتصميم موقع احترافي متوافق مع الهاتف باللغتين العربية والإنجليزية"
              : "Website design concept with desktop, mobile, Arabic and English experiences"
          }
        >
          <div className={styles.showcaseTop}>
            <span>{ar ? "مصمم لعملك. مبني لينمو." : "DESIGNED FOR YOU. BUILT TO GROW."}</span>
            <span aria-hidden="true">✳</span>
          </div>
          <div className={styles.stage} aria-hidden="true" dir="ltr">
            <div className={styles.orbit} />
            <div className={styles.desktopPreview}>
              <div className={styles.browserChrome}>
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <small>your-brand.com</small>
                <span>↗</span>
              </div>
              <div className={styles.siteNav}>
                <strong>
                  STUDIO<span>®</span>
                </strong>
                <span>About &nbsp; Work &nbsp; Contact ↗</span>
              </div>
              <div className={styles.siteHero}>
                <div>
                  <small>INDEPENDENT. DISTINCTIVE. YOURS.</small>
                  <strong>
                    A different
                    <br />
                    point of view.
                  </strong>
                  <span className={styles.previewButton}>Discover our work ↗</span>
                </div>
                <img
                  src="/templates/creative/studio-folio-hero.webp"
                  alt=""
                  width="1400"
                  height="1109"
                  fetchPriority="high"
                />
              </div>
              <div className={styles.siteFoot}>
                <span>Strategy meets creativity.</span>
                <span>01 — 03</span>
              </div>
            </div>
            <div className={styles.languageCard}>
              <span className={styles.languageIcon}>ع</span>
              <div>
                <strong>
                  عربي <span>+ English</span>
                </strong>
                <small>{ar ? "تجربة طبيعية. بكل لغة." : "Native in every direction."}</small>
              </div>
              <span className={styles.check}>✓</span>
            </div>
            <div className={styles.phone}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneNav}>
                <strong>STUDIO®</strong>
                <span>☰</span>
              </div>
              <img
                src="/templates/creative/studio-folio-hero.webp"
                alt=""
                width="1400"
                height="1109"
              />
              <div className={styles.phoneCopy}>
                <small>صُمّم ليعبّر عنك</small>
                <strong>
                  رؤية مختلفة.
                  <br />
                  حضور مميز.
                </strong>
                <span>اكتشف أعمالنا ↗</span>
              </div>
            </div>
            <div className={styles.designStamp}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="m5 12 4 4L19 6M5 20h14" />
              </svg>
              <span>{ar ? "تفاصيل تصنع الفرق" : "Considered in every detail"}</span>
            </div>
          </div>
          <figcaption className={styles.showcaseCaption}>
            <span>
              {ar
                ? "تصور تصميمي — إمكانيات بلا حدود"
                : "DESIGN CONCEPT — POSSIBILITIES, REIMAGINED"}
            </span>
            <span aria-hidden="true">01 / MS</span>
          </figcaption>
        </figure>
      </div>
      <div className={styles.heroFooter}>
        <p>
          {ar
            ? "من الفكرة إلى الإطلاق، في مكان واحد."
            : "From first idea to launch. All under one roof."}
        </p>
        <div>
          <span>{ar ? "تصميم مدروس" : "Thoughtful design"}</span>
          <i aria-hidden="true" />
          <span>{ar ? "تطوير متكامل" : "Complete development"}</span>
          <i aria-hidden="true" />
          <span>{ar ? "دعم مستمر" : "Ongoing support"}</span>
        </div>
        <a href="#services" aria-label={ar ? "اكتشف خدماتنا" : "Discover our services"}>
          ↓
        </a>
      </div>
    </section>
  );
}
