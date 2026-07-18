const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/**
 * Derive a bearer proof without sending the fragment-only encryption key to
 * Convex. Stored payloads remain end-to-end encrypted independently of this
 * access check.
 */
export const deriveConvexAccessToken = async (
  scope: "room" | "publicShare" | "legacyShare",
  encryptionKey: string,
) => {
  const input = new TextEncoder().encode(`drawink:${scope}:${encryptionKey}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToBase64Url(new Uint8Array(digest));
};
