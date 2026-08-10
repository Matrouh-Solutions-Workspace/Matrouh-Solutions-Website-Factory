import styles from "./landing.module.css";

export function LandingMotion() {
  return (
    <>
      <script defer src="/matrouh-landing-motion.js?v=12" />
      <div aria-hidden="true" className={styles.scrollMarker} />
    </>
  );
}
