import { describe, expect, it } from "vitest";
import { customDomainRouteMatches, customDomainRoutes } from "./index";

describe("customDomainRoutes", () => {
  it("creates apex, www, and selected website routes", () => {
    expect(
      customDomainRoutes({
        rootHostname: "EmadRamsis.com",
        subdomainMode: "selected",
        selectedSubdomains: ["booking", "www"],
      }),
    ).toEqual([
      {
        hostname: "emadramsis.com",
        rootHostname: "emadramsis.com",
        routingMode: "exact",
        isPrimary: true,
      },
      {
        hostname: "www.emadramsis.com",
        rootHostname: "emadramsis.com",
        routingMode: "exact",
        isPrimary: false,
      },
      {
        hostname: "booking.emadramsis.com",
        rootHostname: "emadramsis.com",
        routingMode: "exact",
        isPrimary: false,
      },
    ]);
  });

  it("supports all subdomains without matching the apex", () => {
    const wildcard = customDomainRoutes({
      rootHostname: "emadramsis.com",
      includeApex: false,
      includeWww: false,
      subdomainMode: "wildcard",
    })[0]!;
    expect(wildcard.hostname).toBe("*.emadramsis.com");
    expect(customDomainRouteMatches("portal.emadramsis.com", wildcard)).toBe(true);
    expect(customDomainRouteMatches("emadramsis.com", wildcard)).toBe(false);
    expect(customDomainRouteMatches("evil-example.com", wildcard)).toBe(false);
  });
});
