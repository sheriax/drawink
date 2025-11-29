import { validateLibraryUrl } from "./library";

describe("validateLibraryUrl", () => {
  it("should validate hostname & pathname", () => {
    // valid hostnames
    // -------------------------------------------------------------------------
    expect(validateLibraryUrl("https://www.drawink.com", ["drawink.com"])).toBe(
      true,
    );
    expect(validateLibraryUrl("https://drawink.com", ["drawink.com"])).toBe(
      true,
    );
    expect(
      validateLibraryUrl("https://library.drawink.com", ["drawink.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.drawink.com", [
        "library.drawink.com",
      ]),
    ).toBe(true);
    expect(validateLibraryUrl("https://drawink.com/", ["drawink.com/"])).toBe(
      true,
    );
    expect(validateLibraryUrl("https://drawink.com", ["drawink.com/"])).toBe(
      true,
    );
    expect(validateLibraryUrl("https://drawink.com/", ["drawink.com"])).toBe(
      true,
    );

    // valid pathnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://drawink.com/path", ["drawink.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.com/path/", ["drawink.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.com/specific/path", [
        "drawink.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.com/specific/path/", [
        "drawink.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.com/specific/path", [
        "drawink.com/specific/path/",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.com/specific/path/other", [
        "drawink.com/specific/path",
      ]),
    ).toBe(true);

    // invalid hostnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://xdrawink.com", ["drawink.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://x-drawink.com", ["drawink.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.comx", ["drawink.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.comx", ["drawink.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.com.mx", ["drawink.com"]),
    ).toThrow();
    // protocol must be https
    expect(() =>
      validateLibraryUrl("http://drawink.com.mx", ["drawink.com"]),
    ).toThrow();

    // invalid pathnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://drawink.com/specific/other/path", [
        "drawink.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.com/specific/paths", [
        "drawink.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.com/specific/path-s", [
        "drawink.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.com/some/specific/path", [
        "drawink.com/specific/path",
      ]),
    ).toThrow();
  });
});
