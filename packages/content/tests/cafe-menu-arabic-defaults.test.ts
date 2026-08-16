import { describe, expect, it } from "vitest";
import { localizeTemplateDefault } from "../src";

describe("café menu Arabic starter content", () => {
  it("localizes the compact menu cover and café-specific dish names", () => {
    expect(
      localizeTemplateDefault(
        {
          eyebrow: "Digital menu",
          headline: "Morning Room Café",
          introduction: "Coffee, breakfast, and all-day plates.",
          item: {
            name: "Morning Room Breakfast",
            badge: "House favorite",
          },
        },
        "ar",
      ),
    ).toEqual({
      eyebrow: "القائمة الرقمية",
      headline: "مقهى مورنينج روم",
      introduction: "قهوة وإفطار وأطباق متاحة طوال اليوم.",
      item: {
        name: "إفطار مورنينج روم",
        badge: "اختيار المطعم",
      },
    });
  });
});
