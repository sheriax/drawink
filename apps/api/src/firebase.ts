import { existsSync, readFileSync } from "fs";
import { type ServiceAccount, cert, getApps, initializeApp } from "firebase-admin/app";
import { initializeFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
// In production, use GOOGLE_APPLICATION_CREDENTIALS environment variable
// or provide the service account key directly

// Possible paths for the service account file
const SERVICE_ACCOUNT_PATHS = [
  // Docker container path
  "/app/firebase-project/drawink-2026-firebase-adminsdk.json",
  // Local development paths
  "./firebase-project/drawink-2026-firebase-adminsdk.json",
  "../firebase-project/drawink-2026-firebase-adminsdk.json",
  "../../firebase-project/drawink-2026-firebase-adminsdk.json",
];

function findServiceAccountPath(): string | null {
  // Check environment variable first
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (existsSync(envPath)) {
      return envPath;
    }
    console.warn(`GOOGLE_APPLICATION_CREDENTIALS path not found: ${envPath}`);
  }

  // Try each possible path
  for (const path of SERVICE_ACCOUNT_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

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

  // For local/Docker development, load service account key from file
  const serviceAccountPath = findServiceAccountPath();

  if (serviceAccountPath) {
    try {
      console.log("🔥 Initializing Firebase with service account from:", serviceAccountPath);
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8")) as ServiceAccount;

      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || "drawink-2026",
      });
    } catch (error) {
      console.error("Failed to load service account:", error);
    }
  } else {
    console.warn("⚠️ No service account file found. Tried paths:", SERVICE_ACCOUNT_PATHS);
  }

  // Fallback: Try to initialize with application default credentials
  console.log("🔥 Falling back to application default credentials");
  try {
    return initializeApp({
      projectId: "drawink-2026",
    });
  } catch (error) {
    console.error("Failed to initialize with default credentials:", error);
    throw new Error(
      "Could not initialize Firebase. Please ensure a service account file is available.",
    );
  }
}

const app = initializeFirebase();

// Use preferRest to avoid gRPC issues with Bun runtime
// See: https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore
export const db = initializeFirestore(app, {
  preferRest: true,
});
console.log("📡 Firestore initialized with REST transport (preferRest: true)");

// Collection name for storing scene data
export const SCENES_COLLECTION = "scenes";
