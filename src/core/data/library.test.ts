import { validateLibraryUrl } from "./library";

describe("validateLibraryUrl", () => {
  it("should validate hostname & pathname", () => {
    // valid hostnames
    // -------------------------------------------------------------------------
    expect(validateLibraryUrl("https://www.drawink.app", ["drawink.app"])).toBe(true);
    expect(validateLibraryUrl("https://drawink.app", ["drawink.app"])).toBe(true);
    expect(validateLibraryUrl("https://library.drawink.app", ["drawink.app"])).toBe(true);
    expect(validateLibraryUrl("https://library.drawink.app", ["library.drawink.app"])).toBe(true);
    expect(validateLibraryUrl("https://drawink.app/", ["drawink.app/"])).toBe(true);
    expect(validateLibraryUrl("https://drawink.app", ["drawink.app/"])).toBe(true);
    expect(validateLibraryUrl("https://drawink.app/", ["drawink.app"])).toBe(true);

    // valid pathnames
    // -------------------------------------------------------------------------
    expect(validateLibraryUrl("https://drawink.app/path", ["drawink.app"])).toBe(true);
    expect(validateLibraryUrl("https://drawink.app/path/", ["drawink.app"])).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.app/specific/path", ["drawink.app/specific/path"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.app/specific/path/", ["drawink.app/specific/path"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.app/specific/path", ["drawink.app/specific/path/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://drawink.app/specific/path/other", ["drawink.app/specific/path"]),
    ).toBe(true);

    // invalid hostnames
    // -------------------------------------------------------------------------
    expect(() => validateLibraryUrl("https://xdrawink.app", ["drawink.app"])).toThrow();
    expect(() => validateLibraryUrl("https://x-drawink.app", ["drawink.app"])).toThrow();
    expect(() => validateLibraryUrl("https://drawink.appx", ["drawink.app"])).toThrow();
    expect(() => validateLibraryUrl("https://drawink.appx", ["drawink.app"])).toThrow();
    expect(() => validateLibraryUrl("https://drawink.app.mx", ["drawink.app"])).toThrow();
    // protocol must be https
    expect(() => validateLibraryUrl("http://drawink.app.mx", ["drawink.app"])).toThrow();

    // invalid pathnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://drawink.app/specific/other/path", ["drawink.app/specific/path"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.app/specific/paths", ["drawink.app/specific/path"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.app/specific/path-s", ["drawink.app/specific/path"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://drawink.app/some/specific/path", ["drawink.app/specific/path"]),
    ).toThrow();
  });
});
