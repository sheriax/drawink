/**
 * Clerk configuration and utilities
 */

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env file.",
  );
}

/**
 * Clerk appearance customization
 * Matches Drawink's design system
 */
export const clerkAppearance = {
  elements: {
    card: "shadow-lg border border-gray-200 dark:border-gray-700",
    headerTitle: "text-2xl font-bold",
    headerSubtitle: "text-gray-600 dark:text-gray-400",
    socialButtonsBlockButton:
      "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
    footerActionLink: "text-blue-600 hover:text-blue-700 font-medium",
  },
  layout: {
    socialButtonsPlacement: "bottom" as const,
    socialButtonsVariant: "blockButton" as const,
  },
};
