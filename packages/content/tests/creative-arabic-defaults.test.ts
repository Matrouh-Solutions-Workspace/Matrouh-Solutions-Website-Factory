import { describe, expect, it } from "vitest";
import { localizeTemplateDefault, localizedTemplateTitle } from "../src";

describe("Studio Folio Arabic starter content", () => {
  it("localizes complete nested section content", () => {
    const localized = localizeTemplateDefault(
      {
        eyebrow: "Independent creative director / Cairo + worldwide",
        title: "Ideas made unmistakable.",
        items: [
          {
            title: "Brand direction",
            body: "Positioning, narrative, naming, identity systems, and practical guidance that teams can actually use.",
            meta: "01 · Define",
          },
        ],
        quote:
          "The work did more than make us look established. It gave the whole team a sharper way to explain what makes us matter.",
        contact: "Let’s make the next move feel obvious.",
      },
      "ar",
    );

    expect(localized).toEqual({
      eyebrow: "مدير إبداعي مستقل / القاهرة والعالم",
      title: "أفكار لا يمكن تجاهلها.",
      items: [
        {
          title: "توجيه العلامة التجارية",
          body: "تموضع وسرد وتسمية وأنظمة هوية وإرشادات عملية تستطيع الفرق استخدامها فعلًا.",
          meta: "01 · تحديد",
        },
      ],
      quote:
        "لم يجعلنا العمل نبدو أكثر رسوخًا فحسب، بل منح الفريق كله طريقة أوضح لشرح ما يجعلنا مهمين.",
      contact: "لنجعل الخطوة التالية واضحة.",
    });
  });

  it("provides the Arabic portfolio page title", () => {
    expect(localizedTemplateTitle("Work", "ar")).toBe("الأعمال");
  });
});
