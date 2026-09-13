import {
  MATROUH_EMAIL_URL,
  MATROUH_FACEBOOK_URL,
  MATROUH_WHATSAPP_NUMBER,
  MATROUH_WHATSAPP_URL,
} from "../public-contact-links";
import styles from "./contact-section.module.css";

export function ContactIcon({ kind }: { readonly kind: "whatsapp" | "facebook" | "email" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill={kind === "email" ? "none" : "currentColor"}
    >
      {kind === "whatsapp" ? (
        <path d="M20.52 3.48A11.88 11.88 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.16 1.59 5.98L0 24l6.25-1.64a11.9 11.9 0 0 0 5.79 1.48h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.18-3.46-8.43ZM12.05 21.83a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.88 9.88 0 0 1-1.52-5.29c0-5.47 4.45-9.92 9.92-9.92a9.84 9.84 0 0 1 7 2.91 9.85 9.85 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.93 9.92Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.39-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.21 3.09c.15.2 2.1 3.2 5.09 4.48.71.3 1.26.48 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      ) : kind === "facebook" ? (
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.98h-1.52c-1.49 0-1.96.93-1.96 1.89v2.24h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
}

export function ContactSection({ locale }: { readonly locale: "ar" | "en" }) {
  const ar = locale === "ar";
  return (
    <section id="contact" className={styles.section} aria-labelledby="contact-heading">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" />
          {ar ? "لنصنع خطوتك القادمة" : "LET’S BUILD YOUR NEXT CHAPTER"}
        </p>
        <h2 id="contact-heading">
          {ar ? (
            <>
              موقع يليق بعملك.
              <br />
              <span>يبدأ بمحادثة.</span>
            </>
          ) : (
            <>
              A website worthy
              <br />
              of your business.
              <br />
              <span>Let’s talk.</span>
            </>
          )}
        </h2>
        <p className={styles.description}>
          {ar
            ? "أخبرنا عن فكرتك وما تطمح إليه. نساعدك على تحديد البداية المناسبة، ونحوّلها معك إلى موقع تفخر به."
            : "Tell us what you have in mind and where you want to go. We’ll help you find the right starting point and build a website you’re proud of."}
        </p>
        <div className={styles.note}>
          <span aria-hidden="true">↗</span>
          {ar ? "من أول فكرة، إلى أول زيارة." : "From your first idea to your first visitor."}
        </div>
      </div>
      <div className={styles.card}>
        <p className={styles.cardLabel}>{ar ? "تواصل مع فريق مطروح" : "CONNECT WITH MATROUH"}</p>
        <a className={styles.whatsapp} href={MATROUH_WHATSAPP_URL} target="_blank" rel="noreferrer">
          <span className={styles.icon}>
            <ContactIcon kind="whatsapp" />
          </span>
          <span className={styles.channelText}>
            <small>{ar ? "لنتحدث عن مشروعك" : "Tell us about your project"}</small>
            <strong>WhatsApp</strong>
            <span dir="ltr">{MATROUH_WHATSAPP_NUMBER}</span>
          </span>
          <span className={styles.arrow} aria-hidden="true">
            ↗
          </span>
        </a>
        <div className={styles.otherChannels}>
          <a href={MATROUH_FACEBOOK_URL} target="_blank" rel="noreferrer">
            <span className={styles.icon}>
              <ContactIcon kind="facebook" />
            </span>
            <span>
              <strong>Facebook</strong>
              <small>{ar ? "تابعنا أو أرسل لنا رسالة" : "Follow along or send a message"}</small>
            </span>
            <span className={styles.arrow} aria-hidden="true">
              ↗
            </span>
          </a>
          <a href={MATROUH_EMAIL_URL}>
            <span className={styles.icon}>
              <ContactIcon kind="email" />
            </span>
            <span>
              <strong>{ar ? "البريد الإلكتروني" : "Email us"}</strong>
              <small>{ar ? "للتفاصيل والأفكار الكبيرة" : "For the details and big ideas"}</small>
            </span>
            <span className={styles.arrow} aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
        <p className={styles.response}>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="7.5" />
            <path d="M10 5.5V10l3 2" />
          </svg>
          {ar ? "نرد خلال يوم عمل واحد" : "We respond within one business day"}
        </p>
      </div>
    </section>
  );
}
