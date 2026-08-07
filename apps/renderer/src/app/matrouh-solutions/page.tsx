import type { Metadata } from "next";
import { MatrouhLanding } from "./landing";

export const metadata: Metadata = {
  title: "مطروح سوليوشنز | مواقع عربية حديثة",
  description: "تصميم وتطوير مواقع سريعة وثنائية اللغة للشركات والمهنيين.",
  alternates: {
    canonical: "/matrouh-solutions",
    languages: { ar: "/matrouh-solutions", en: "/en/matrouh-solutions" },
  },
};

export default function ArabicLandingPage() {
  return <MatrouhLanding locale="ar" />;
}
