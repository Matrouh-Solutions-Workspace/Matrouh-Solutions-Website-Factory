import type { JsonValue } from "@factory/template-sdk";
import { creativeArabicDefaults } from "./arabic-creative-defaults";
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
  ...creativeArabicDefaults,
  Home: "الرئيسية",
  Contact: "تواصل معنا",
  Locations: "الفروع",
  "Care for every stage of life": "رعاية صحية لكل مرحلة من حياتك",
  "Specialists working together around your needs.":
    "فريق من الأطباء المتخصصين يعمل معًا لتقديم رعاية متكاملة تناسب احتياجاتك.",
  "Find a location": "اختر أقرب فرع",
  "Care close to home": "رعاية متكاملة بالقرب منك",
  "Find a clinic": "ابحث عن عيادة",
  "Convenient care near you.": "رعاية ميسرة بالقرب منك.",
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
  Services: "الخدمات",
  "Physician profile": "الملف الطبي",
  "Patient journey": "رحلة المريض",
  Appointments: "المواعيد",
  "Personal care": "رعاية شخصية",
  "Meet your doctor": "تعرّف إلى طبيبك",
  "Dr. Mariam Salem": "د. مريم سالم",
  "Consultant in family medicine": "استشارية طب الأسرة",
  "A calm, evidence-informed approach to everyday health, prevention, and long-term wellbeing.":
    "نهج هادئ قائم على الدليل للصحة اليومية والوقاية والعافية على المدى الطويل.",
  "MD · Board certified · 20+ years in practice":
    "دكتوراه في الطب · معتمدة من البورد · أكثر من 20 عامًا من الخبرة",
  "I believe good care starts with listening, then making the next step clear.":
    "أؤمن أن الرعاية الجيدة تبدأ بالاستماع، ثم توضيح الخطوة التالية.",
  "Dr. Salem combines evidence-led medicine with the continuity of a neighborhood practice. Every appointment begins with listening, then turns complex information into a clear plan you can use.":
    "تجمع د. سالم بين الطب المبني على الدليل واستمرارية الرعاية القريبة. تبدأ كل زيارة بالاستماع ثم تحوّل المعلومات المعقدة إلى خطة واضحة يمكنك اتباعها.",
  "Good care is not rushed. It is a conversation that continues beyond one appointment.":
    "الرعاية الجيدة لا تُستعجل؛ إنها حوار يستمر لما بعد الزيارة الواحدة.",
  "What to expect from your visit": "ما الذي تتوقعه في زيارتك",
  "Before your visit": "قبل الزيارة",
  "Share your concerns and current medicines so your appointment starts with the right context.":
    "شاركنـا مخاوفك وأدويتك الحالية لتبدأ زيارتك بالصورة الكاملة.",
  "In the consultation": "أثناء الاستشارة",
  "Take the time to ask questions, understand the assessment, and agree on the next steps together.":
    "خذ وقتك لطرح الأسئلة وفهم التقييم والاتفاق على الخطوات التالية معًا.",
  "After the appointment": "بعد الزيارة",
  "Receive a practical care plan and a direct route back to the practice when follow-up is needed.":
    "ستحصل على خطة رعاية عملية وطريقة مباشرة للعودة إلينا عند الحاجة إلى المتابعة.",
  "Contact the practice directly and our team will help you choose a suitable appointment.":
    "تواصل مع العيادة مباشرة وسيساعدك فريقنا في اختيار الموعد المناسب.",
  "Matrouh, Egypt": "مطروح، مصر",
  "Saturday–Thursday · 9:00–18:00": "السبت–الخميس · 9:00–18:00",
  "Care by specialty": "رعاية حسب التخصص",
  "One clinic, a connected team": "عيادة واحدة وفريق متكامل",
  "Start with the right specialist or let our care team guide you. Your information follows you, so every visit builds on the last.":
    "ابدأ مع التخصص المناسب أو دع فريق الرعاية يوجّهك. معلوماتك ترافقك لتبني كل زيارة على سابقتها.",
  "Family medicine": "طب الأسرة",
  "Everyday care, prevention, and a trusted first point of contact.":
    "رعاية يومية ووقاية ونقطة اتصال موثوقة لصحتك.",
  "All ages": "لكل الأعمار",
  Pediatrics: "طب الأطفال",
  "Child-focused care from newborn checks through adolescence.":
    "رعاية تركز على الطفل من فحوصات حديثي الولادة وحتى المراهقة.",
  Children: "الأطفال",
  Cardiology: "أمراض القلب",
  "Assessment and ongoing support for heart and circulation health.":
    "تقييم ودعم مستمر لصحة القلب والدورة الدموية.",
  "Heart health": "صحة القلب",
  Orthopedics: "جراحة العظام",
  "Movement, joint, and injury care built around your recovery goals.":
    "رعاية للحركة والمفاصل والإصابات مصممة وفق أهداف تعافيك.",
  Mobility: "الحركة",
  "Women’s health": "صحة المرأة",
  "Respectful, coordinated care through every life stage.":
    "رعاية محترمة ومتكاملة في كل مراحل الحياة.",
  Women: "المرأة",
  Diagnostics: "التشخيص",
  "Imaging and laboratory services connected directly to your care plan.":
    "خدمات الأشعة والتحاليل المرتبطة مباشرة بخطة رعايتك.",
  "On site": "في العيادة",
  "How care works": "كيف تسير الرعاية",
  "From first question to feeling better": "من أول سؤال إلى شعور أفضل",
  "A simple pathway with the reassurance of a wider clinical team behind every decision.":
    "مسار بسيط مع دعم فريق طبي متكامل خلف كل قرار.",
  "Choose the right care": "اختر الرعاية المناسبة",
  "Book a specialty directly or ask our team to match your need to the right clinician.":
    "احجز التخصص مباشرة أو دع فريقنا يوصلك بالطبيب المناسب لاحتياجك.",
  "01 · Start": "01 · البداية",
  "Meet one connected team": "تعرّف إلى فريق متكامل",
  "Clinicians, diagnostics, and referrals work from the same care story.":
    "الأطباء والتشخيصات والإحالات يعملون من خلال ملف رعاية واحد.",
  "02 · Coordinate": "02 · التنسيق",
  "Continue with confidence": "تابع بثقة",
  "Leave with clear next steps, results, and follow-up arranged around you.":
    "غادر بخطوات تالية واضحة ونتائج ومتابعة منظمة حول احتياجاتك.",
  "03 · Follow up": "03 · المتابعة",
  "Primary care, pediatrics, diagnostics, and same-day appointments.":
    "طب أسرة وأطفال وتشخيصات ومواعيد في اليوم نفسه.",
  "Marsa Matrouh, Matrouh, Egypt": "مرسى مطروح، مطروح، مصر",
  "Specialist consultations and advanced outpatient services.":
    "استشارات تخصصية وخدمات عيادات خارجية متقدمة.",
  "New Alamein, Matrouh, Egypt": "العلمين الجديدة، مطروح، مصر",
  "Daily · 10:00–20:00": "يوميًا · 10:00–20:00",
  "Seasonal urgent care and family medicine near the coast.":
    "رعاية عاجلة موسمية وطب أسرة قرب الساحل.",
  "North Coast, Matrouh, Egypt": "الساحل الشمالي، مطروح، مصر",
  "Daily · 8:00–22:00": "يوميًا · 8:00–22:00",
  "Civil & structural engineering": "هندسة مدنية وإنشائية",
  "MSc · Chartered Engineer · 12 years experience": "ماجستير · مهندس معتمد · 12 عامًا من الخبرة",
  Expertise: "الخبرات",
  "Safe, efficient structural systems coordinated around architectural intent.":
    "أنظمة إنشائية آمنة وفعّالة ومنسقة مع الرؤية المعمارية.",
  Buildings: "المباني",
  "Independent design checks, risk reviews, and clear recommendations.":
    "مراجعات تصميم مستقلة وتقييم للمخاطر وتوصيات واضحة.",
  Assurance: "الضمان",
  "Responsive construction support that resolves issues before they become delays.":
    "دعم إنشائي سريع يحل المشكلات قبل أن تتحول إلى تأخيرات.",
  Delivery: "التنفيذ",
  Projects: "المشاريع",
  "Representative commissions across commercial, residential, and infrastructure projects.":
    "نماذج من أعمال تجارية وسكنية ومشروعات بنية تحتية.",
  "Optimized the structural grid and foundation strategy for demanding marine conditions.":
    "حسّنا الشبكة الإنشائية واستراتيجية الأساسات لظروف بحرية صعبة.",
  "18% material reduction": "خفض المواد بنسبة 18٪",
  "Phased engineering maintained live clinical operations throughout construction.":
    "حافظت الهندسة المرحلية على استمرار العمليات الطبية طوال فترة البناء.",
  "Zero service interruption": "دون توقف للخدمة",
  "Verified existing capacity and designed targeted strengthening for new production loads.":
    "تحققنا من القدرة القائمة وصممنا تدعيمات موجهة لأحمال الإنتاج الجديدة.",
  "6-week delivery": "تسليم خلال 6 أسابيع",
  "Engineering process": "منهج العمل الهندسي",
  "How projects move": "كيف تتقدم المشاريع",
  "Rigour at every stage": "دقة في كل مرحلة",
  "A transparent technical process keeps decisions visible, risks controlled, and delivery moving.":
    "عملية فنية شفافة تجعل القرارات واضحة والمخاطر تحت السيطرة والتنفيذ مستمرًا.",
  "Define the brief": "تحديد نطاق المشروع",
  "Align constraints, performance targets, programme, stakeholders, and the decisions that matter most.":
    "ننسّق القيود وأهداف الأداء والبرنامج وأصحاب المصلحة والقرارات الأهم.",
  "01 · Discover": "01 · الاستكشاف",
  "Test the options": "اختبار الخيارات",
  "Compare structural strategies with evidence on risk, carbon, buildability, and cost.":
    "نقارن الاستراتيجيات الإنشائية وفق أدلة المخاطر والكربون وقابلية التنفيذ والتكلفة.",
  "02 · Analyse": "02 · التحليل",
  "Coordinate the design": "تنسيق التصميم",
  "Resolve interfaces early and issue coordinated information the wider team can confidently use.":
    "نعالج نقاط التداخل مبكرًا ونصدر معلومات منسقة يمكن للفريق الاعتماد عليها.",
  "03 · Engineer": "03 · الهندسة",
  "Support delivery": "دعم التنفيذ",
  "Stay close through construction, respond quickly, verify outcomes, and close with a clean handover.":
    "نبقى قريبين خلال التنفيذ ونستجيب بسرعة ونتحقق من النتائج ونختتم بتسليم منظم.",
  "04 · Deliver": "04 · التسليم",
  "Share the project stage, location, and decisions ahead. You will receive a clear response on fit and next steps.":
    "شارك مرحلة المشروع وموقعه والقرارات المقبلة، وستحصل على رد واضح حول الملاءمة والخطوات التالية.",
  "New commissions from September": "متاح لمشروعات جديدة بدءًا من سبتمبر",
  "Meet the team": "تعرّف إلى الفريق",
  "Specialists who make care feel personal": "مختصون يجعلون الرعاية أكثر قربًا",
  "A coordinated team with clear expertise and one shared standard of care.":
    "فريق متكامل بخبرات واضحة ومعيار موحد للرعاية.",
  "Dr. Sarah Amin": "د. سارة أمين",
  "Family Medicine": "طب الأسرة",
  "Whole-person primary care, prevention, and long-term health planning.":
    "رعاية أولية شاملة ووقاية وتخطيط صحي طويل المدى.",
  "Dr. Omar Nabil": "د. عمر نبيل",
  "Internal Medicine": "الباطنة العامة",
  "Thoughtful diagnosis and coordinated care for complex adult health needs.":
    "تشخيص متأنٍ ورعاية متكاملة لاحتياجات صحة البالغين المعقدة.",
  "Patient stories": "تجارب المرضى",
  "Patient experience": "تجربة المرضى",
  "Trusted care, in patients' own words": "رعاية موثوقة بكلمات المرضى",
  "Every step was explained clearly. I left with a plan I could actually follow.":
    "شُرحت لي كل خطوة بوضوح، وغادرت بخطة أستطيع تطبيقها فعلًا.",
  "General medicine patient": "مريض طب عام",
  "The team was organised, kind, and respectful of my time from start to finish.":
    "كان الفريق منظمًا ولطيفًا ومحترمًا لوقتي من البداية إلى النهاية.",
  "Preventive care patient": "مريض رعاية وقائية",
  "M. Hassan": "م. حسن",
  "N. Adel": "ن. عادل",
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
