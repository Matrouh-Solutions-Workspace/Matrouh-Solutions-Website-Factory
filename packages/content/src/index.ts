import type { JsonValue } from "@factory/template-sdk";
export interface SectionDraft {
  id: string;
  pageId: string;
  typeId: string;
  schemaVersion: number;
  content: JsonValue;
  orderKey: string;
  revision: bigint;
}
export interface ContentRepository {
  getSection(id: string): Promise<SectionDraft | null>;
  saveSection(section: SectionDraft, expectedRevision: bigint): Promise<SectionDraft>;
  freezeWebsite(websiteId: string, revision: bigint): Promise<unknown>;
}
export function rankedKey(index: number): string {
  return index.toString(36).padStart(12, "0");
}

const arabicDefaults: Readonly<Record<string, string>> = Object.freeze({
  Home: "الرئيسية",
  Contact: "تواصل معنا",
  Locations: "الفروع",
  "Care for every stage of life": "رعاية صحية لكل مرحلة من حياتك",
  "Specialists working together around your needs.":
    "فريق من الأطباء المتخصصين يعمل معًا لتقديم رعاية متكاملة تناسب احتياجاتك.",
  "Find a location": "اختر أقرب فرع",
  "Care close to home": "رعاية متكاملة بالقرب منك",
  "Choose a clinic with coordinated specialists, modern diagnostics, and a team that knows your story.":
    "اختر الفرع الأنسب لك واستفد من تخصصات متكاملة وتشخيص حديث وفريق يهتم بتفاصيل حالتك.",
  "Matrouh Central": "فرع مطروح الرئيسي",
  "New Alamein": "فرع العلمين الجديدة",
  "North Coast": "فرع الساحل الشمالي",
  "Care centered around you": "رعاية طبية تتمحور حولك",
  "Thoughtful medical care with time to listen.":
    "رعاية طبية متأنية تبدأ بالاستماع وتصل إلى خطة واضحة تناسبك.",
  "Book an appointment": "احجز موعدك",
  "How I can help": "كيف يمكنني مساعدتك",
  "General consultation": "استشارة طبية عامة",
  "Preventive care": "الرعاية الوقائية",
  "Follow-up care": "المتابعة المستمرة",
  "A careful assessment, clear explanation, and a practical plan tailored to you.":
    "تقييم دقيق وشرح واضح وخطة علاج عملية تناسب حالتك.",
  "Evidence-led screening and everyday guidance that helps you stay well.":
    "فحوصات مبنية على الدليل وإرشادات يومية تساعدك على الحفاظ على صحتك.",
  "Continuity and thoughtful adjustments as your health needs change.":
    "متابعة منتظمة وتعديلات مدروسة مع تغير احتياجاتك الصحية.",
  "Let’s plan your visit": "لنخطط لزيارتك",
  "Engineering clarity into every decision": "هندسة دقيقة لقرارات أكثر ثقة",
  "Independent technical leadership for resilient buildings, efficient delivery, and confident project teams.":
    "خبرة هندسية تقود المشاريع نحو مبانٍ أكثر كفاءة وتنفيذ منضبط وقرارات فنية واضحة.",
  "Discuss a project": "ناقش مشروعك",
  "Technical depth, practical delivery": "عمق هندسي وتنفيذ عملي",
  "Support from early feasibility through construction.":
    "دعم فني من دراسة الجدوى وحتى اكتمال التنفيذ.",
  "Structural design": "التصميم الإنشائي",
  "Technical review": "المراجعة الفنية",
  "Site engineering": "الهندسة الميدانية",
  "Selected work": "مشاريع مختارة",
  "Built results": "نتائج مبنية على أرض الواقع",
  "Coastal mixed-use development": "مشروع ساحلي متعدد الاستخدامات",
  "Hospital expansion": "توسعة مستشفى",
  "Industrial retrofit": "تطوير منشأة صناعية",
  "Start a conversation": "ابدأ المحادثة",
  "Bring the technical challenge": "شاركنا التحدي الهندسي",
});

export function localizeTemplateDefault<T extends JsonValue>(value: T, locale: string): T {
  return (locale === "ar" ? localizeValue(value) : value) as T;
}

export function localizedTemplateTitle(value: string, locale: string): string {
  return locale === "ar" ? (arabicDefaults[value] ?? value) : value;
}

function localizeValue(value: JsonValue): JsonValue {
  if (typeof value === "string") return arabicDefaults[value] ?? value;
  if (Array.isArray(value)) return value.map(localizeValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, localizeValue(child)]),
    );
  return value;
}
