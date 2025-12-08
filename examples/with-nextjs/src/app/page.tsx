import dynamic from "next/dynamic";
import Script from "next/script";

import "../common.scss";

// Since client components get prerenderd on server as well hence importing the drawink stuff dynamically
// with ssr false
const DrawinkWithClientOnly = dynamic(
  async () => (await import("../drawinkWrapper")).default,
  {
    ssr: false,
  },
);

export default function Page() {
  return (
    <>
      <a href="/drawink-in-pages">Switch to Pages router</a>
      <h1 className="page-title">App Router</h1>
      <Script id="load-env-variables" strategy="beforeInteractive">
        {`window["EXCALIDRAW_ASSET_PATH"] = window.origin;`}
      </Script>
      {/* @ts-expect-error - https://github.com/vercel/next.js/issues/42292 */}
      <DrawinkWithClientOnly />
    </>
  );
}
