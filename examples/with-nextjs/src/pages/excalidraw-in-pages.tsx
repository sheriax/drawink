import dynamic from "next/dynamic";

import "../common.scss";

// Since client components get prerenderd on server as well hence importing the drawink stuff dynamically
// with ssr false
const Drawink = dynamic(async () => (await import("../drawinkWrapper")).default, {
  ssr: false,
});

export default function Page() {
  return (
    <>
      <a href="/">Switch to App router</a>
      <h1 className="page-title">Pages Router</h1>
      {/* @ts-expect-error - https://github.com/vercel/next.js/issues/42292 */}
      <Drawink />
    </>
  );
}
