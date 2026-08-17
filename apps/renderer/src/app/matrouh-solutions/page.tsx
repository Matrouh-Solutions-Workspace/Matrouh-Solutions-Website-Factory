import type { Metadata } from "next";
import { MatrouhLanding } from "./landing";
import { platformIcons } from "../platform-icons";

export const metadata: Metadata = {
  title: "مطروح سوليوشنز | مواقع عربية حديثة",
  description: "تصميم وتطوير مواقع سريعة وثنائية اللغة للشركات والمهنيين.",
  icons: platformIcons,
  alternates: {
    canonical: "/matrouh-solutions",
    languages: { ar: "/matrouh-solutions", en: "/en/matrouh-solutions" },
  },
};

export default function ArabicLandingPage() {
  return <MatrouhLanding locale="ar" />;
}
