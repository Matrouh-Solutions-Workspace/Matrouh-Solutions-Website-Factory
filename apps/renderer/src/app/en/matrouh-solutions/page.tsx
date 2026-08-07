import type { Metadata } from "next";
import { MatrouhLanding } from "../../matrouh-solutions/landing";

export const metadata: Metadata = {
  title: "Matrouh Solutions | Modern bilingual websites",
  description: "Fast, bilingual websites designed and built for businesses and professionals.",
  alternates: {
    canonical: "/en/matrouh-solutions",
    languages: { ar: "/matrouh-solutions", en: "/en/matrouh-solutions" },
  },
};

export default function EnglishLandingPage() {
  return <MatrouhLanding locale="en" />;
}
