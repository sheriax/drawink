import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

/**
 * Sign-up page component
 * Uses Clerk's pre-built SignUp component
 */
export const SignUp = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <ClerkSignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl border-0 bg-white dark:bg-gray-800",
            },
          }}
        />
      </div>
    </div>
  );
};
