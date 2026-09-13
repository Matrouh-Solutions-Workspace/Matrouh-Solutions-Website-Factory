import Script from "next/script";
import styles from "./landing.module.css";

export function LandingMotion() {
  return (
    <>
      <Script strategy="afterInteractive" src="/matrouh-landing-motion.js?v=12" />
      <div aria-hidden="true" className={styles.scrollMarker} />
    </>
  );
}
