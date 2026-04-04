/**
 * Dashboard Page
 * Root wrapper handling auth state. Renders DashboardContent when signed in.
 */

import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { DashboardContent } from "./DashboardContent";
import "./Dashboard.scss";

export const Dashboard: React.FC = () => {
  return (
    <>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};
