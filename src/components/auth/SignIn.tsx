import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

/**
 * Sign-in page component
 * Uses Clerk's pre-built SignIn component
 */
export const SignIn = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <ClerkSignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
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
