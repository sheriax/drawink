import { deriveConvexAccessToken } from "./convexAccess";

describe("deriveConvexAccessToken", () => {
  it("derives a stable base64url SHA-256 proof", async () => {
    await expect(deriveConvexAccessToken("room", "test-key")).resolves.toBe(
      "xzQ7Hd147gPLi9H8yq2fKLQua3fvVbOKvKoqKIreDzg",
    );
  });

  it("separates proofs by scope", async () => {
    const roomProof = await deriveConvexAccessToken("room", "shared-key");
    const shareProof = await deriveConvexAccessToken("publicShare", "shared-key");

    expect(roomProof).not.toBe(shareProof);
    expect(roomProof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(shareProof).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
