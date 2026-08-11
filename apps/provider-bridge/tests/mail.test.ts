import { describe, expect, it } from "vitest";
import { renderMail } from "../src/mail";

describe("transactional mail", () => {
  it("keeps a reset URL intact in an explicit HTML link", () => {
    const resetUrl =
      "https://mportfolio.ink/dashboard/reset-password/VGVzdF9yZXNldF90b2tlbl9vbmx5X2Zha2VfdmFsdWU";
    const message = renderMail({
      from: "matrouhsolutions@gmail.com",
      to: "owner@example.com",
      subject: "Reset your Matrouh Solutions password",
      text: `Use this secure link:\n${resetUrl}`,
    });

    expect(message).toContain("MIME-Version: 1.0");
    expect(message).toContain(`href=\"${resetUrl}\"`);
    expect(message).toContain(resetUrl);
  });

  it("escapes text before adding links", () => {
    const message = renderMail({
      from: "matrouhsolutions@gmail.com",
      to: "owner@example.com",
      subject: "Message",
      text: "<strong>Safe</strong> & ready",
    });

    expect(message).toContain("&lt;strong&gt;Safe&lt;/strong&gt; &amp; ready");
  });
});
