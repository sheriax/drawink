import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Initialize Firebase Admin SDK
// In production, use GOOGLE_APPLICATION_CREDENTIALS environment variable
// or provide the service account key directly

function initializeFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check if running in Google Cloud environment (Cloud Run, etc.)
  // In that case, the SDK will automatically use the default service account
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE) {
    console.log("🔥 Initializing Firebase with default credentials (Cloud environment)");
    return initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "drawink-2026",
    });
  }

  // For local development, load service account key from file
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    resolve(dirname(fileURLToPath(import.meta.url)), "../../firebase-project/drawink-2026-firebase-adminsdk.json");

  try {
    console.log("🔥 Initializing Firebase with service account from:", serviceAccountPath);
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8")) as ServiceAccount;

    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId || "drawink-2026",
    });
  } catch (error) {
    console.error("Failed to load service account:", error);
    // Fallback: Try to initialize with default credentials
    console.log("🔥 Falling back to default application credentials");
    return initializeApp({
      projectId: "drawink-2026",
    });
  }
}

const app = initializeFirebase();
export const db = getFirestore(app);

// Collection name for storing scene data
export const SCENES_COLLECTION = "scenes";
