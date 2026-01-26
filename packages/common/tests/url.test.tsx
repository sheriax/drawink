import { normalizeLink } from "../src/url";

describe("normalizeLink", () => {
  // NOTE not an extensive XSS test suite, just to check if we're not
  // regressing in sanitization
  it("should sanitize links", () => {
    expect(
      // eslint-disable-next-line no-script-url
      normalizeLink(`javascript://%0aalert(document.domain)`).startsWith(
        // eslint-disable-next-line no-script-url
        `javascript:`,
      ),
    ).toBe(false);
    expect(normalizeLink("ola")).toBe("ola");
    expect(normalizeLink(" ola")).toBe("ola");

    expect(normalizeLink("https://www.drawink.app")).toBe(
      "https://www.drawink.app",
    );
    expect(normalizeLink("www.drawink.app")).toBe("www.drawink.app");
    expect(normalizeLink("/ola")).toBe("/ola");
    expect(normalizeLink("http://test")).toBe("http://test");
    expect(normalizeLink("ftp://test")).toBe("ftp://test");
    expect(normalizeLink("file://")).toBe("file://");
    expect(normalizeLink("file://")).toBe("file://");
    expect(normalizeLink("[test](https://test)")).toBe("[test](https://test)");
    expect(normalizeLink("[[test]]")).toBe("[[test]]");
    expect(normalizeLink("<test>")).toBe("<test>");
    expect(normalizeLink("test&")).toBe("test&");
  });
});
