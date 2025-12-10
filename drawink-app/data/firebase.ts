import { hashElementsVersion, reconcileElements } from "@drawink/drawink";
import { MIME_TYPES } from "@drawink/common";
import { decompressData } from "@drawink/drawink/data/encode";
import { encryptData, decryptData } from "@drawink/drawink/data/encryption";
import { restoreElements } from "@drawink/drawink/data/restore";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  runTransaction,
  Bytes,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";

import type { RemoteDrawinkElement } from "@drawink/drawink/data/reconcile";
import type {
  DrawinkElement,
  FileId,
  OrderedDrawinkElement,
} from "@drawink/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFileMetadata,
  DataURL,
} from "@drawink/drawink/types";

import { FILE_CACHE_MAX_AGE_SEC } from "../app_constants";

import { getSyncableElements } from ".";

import type { SyncableDrawinkElement } from ".";
import type Portal from "../collab/Portal";
import type { Socket } from "socket.io-client";

// private
// -----------------------------------------------------------------------------

let FIREBASE_CONFIG: Record<string, any>;
try {
  FIREBASE_CONFIG = JSON.parse(import.meta.env.VITE_APP_FIREBASE_CONFIG);
} catch (error: any) {
  console.warn(
    `Error JSON parsing firebase config. Supplied value: ${import.meta.env.VITE_APP_FIREBASE_CONFIG
    }`,
  );
  FIREBASE_CONFIG = {};
}

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let firestore: ReturnType<typeof getFirestore> | null = null;
let firebaseStorage: ReturnType<typeof getStorage> | null = null;
let firebaseAuth: Auth | null = null;

const _initializeFirebase = () => {
  if (!firebaseApp) {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
  }
  return firebaseApp;
};

const _getFirestore = () => {
  if (!firestore) {
    firestore = getFirestore(_initializeFirebase());
  }
  return firestore;
};

const _getStorage = () => {
  if (!firebaseStorage) {
    firebaseStorage = getStorage(_initializeFirebase());
  }
  return firebaseStorage;
};

export const _getAuth = (): Auth => {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(_initializeFirebase());
  }
  return firebaseAuth;
};

// -----------------------------------------------------------------------------

export const loadFirebaseStorage = async () => {
  return _getStorage();
};

type FirebaseStoredScene = {
  sceneVersion: number;
  iv: Bytes;
  ciphertext: Bytes;
};

const encryptElements = async (
  key: string,
  elements: readonly DrawinkElement[],
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> => {
  const json = JSON.stringify(elements);
  const encoded = new TextEncoder().encode(json);
  const { encryptedBuffer, iv } = await encryptData(key, encoded);

  return { ciphertext: encryptedBuffer, iv };
};

const decryptElements = async (
  data: FirebaseStoredScene,
  roomKey: string,
): Promise<readonly DrawinkElement[]> => {
  const ciphertext = data.ciphertext.toUint8Array();
  const iv = data.iv.toUint8Array();

  const decrypted = await decryptData(iv, ciphertext, roomKey);
  const decodedData = new TextDecoder("utf-8").decode(
    new Uint8Array(decrypted),
  );
  return JSON.parse(decodedData);
};

class FirebaseSceneVersionCache {
  private static cache = new WeakMap<Socket, number>();
  static get = (socket: Socket) => {
    return FirebaseSceneVersionCache.cache.get(socket);
  };
  static set = (
    socket: Socket,
    elements: readonly SyncableDrawinkElement[],
  ) => {
    FirebaseSceneVersionCache.cache.set(socket, hashElementsVersion(elements));
  };
}

export const isSavedToFirebase = (
  portal: Portal,
  elements: readonly DrawinkElement[],
): boolean => {
  if (portal.socket && portal.roomId && portal.roomKey) {
    const sceneVersion = hashElementsVersion(elements);

    return FirebaseSceneVersionCache.get(portal.socket) === sceneVersion;
  }
  // if no room exists, consider the room saved so that we don't unnecessarily
  // prevent unload (there's nothing we could do at that point anyway)
  return true;
};

export const saveFilesToFirebase = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const storage = await loadFirebaseStorage();

  const erroredFiles: FileId[] = [];
  const savedFiles: FileId[] = [];

  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const storageRef = ref(storage, `${prefix}/${id}`);
        await uploadBytes(storageRef, buffer, {
          cacheControl: `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`,
        });
        savedFiles.push(id);
      } catch (error: any) {
        erroredFiles.push(id);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

const createFirebaseSceneDocument = async (
  elements: readonly SyncableDrawinkElement[],
  roomKey: string,
) => {
  const sceneVersion = hashElementsVersion(elements);
  const { ciphertext, iv } = await encryptElements(roomKey, elements);
  return {
    sceneVersion,
    ciphertext: Bytes.fromUint8Array(new Uint8Array(ciphertext)),
    iv: Bytes.fromUint8Array(iv),
  } as FirebaseStoredScene;
};

export const saveToFirebase = async (
  portal: Portal,
  elements: readonly SyncableDrawinkElement[],
  appState: AppState,
) => {
  const { roomId, roomKey, socket } = portal;
  if (
    // bail if no room exists as there's nothing we can do at this point
    !roomId ||
    !roomKey ||
    !socket ||
    isSavedToFirebase(portal, elements)
  ) {
    return null;
  }

  const firestore = _getFirestore();
  const docRef = doc(firestore, "scenes", roomId);

  const storedScene = await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists()) {
      const storedScene = await createFirebaseSceneDocument(elements, roomKey);

      transaction.set(docRef, storedScene);

      return storedScene;
    }

    const prevStoredScene = snapshot.data() as FirebaseStoredScene;
    const prevStoredElements = getSyncableElements(
      restoreElements(await decryptElements(prevStoredScene, roomKey), null),
    );
    const reconciledElements = getSyncableElements(
      reconcileElements(
        elements,
        prevStoredElements as OrderedDrawinkElement[] as RemoteDrawinkElement[],
        appState,
      ),
    );

    const storedScene = await createFirebaseSceneDocument(
      reconciledElements,
      roomKey,
    );

    transaction.update(docRef, storedScene);

    // Return the stored elements as the in memory `reconciledElements` could have mutated in the meantime
    return storedScene;
  });

  const storedElements = getSyncableElements(
    restoreElements(await decryptElements(storedScene, roomKey), null),
  );

  FirebaseSceneVersionCache.set(socket, storedElements);

  return storedElements;
};

export const loadFromFirebase = async (
  roomId: string,
  roomKey: string,
  socket: Socket | null,
): Promise<readonly SyncableDrawinkElement[] | null> => {
  const firestore = _getFirestore();
  const docRef = doc(firestore, "scenes", roomId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  const storedScene = docSnap.data() as FirebaseStoredScene;
  const elements = getSyncableElements(
    restoreElements(await decryptElements(storedScene, roomKey), null, {
      deleteInvisibleElements: true,
    }),
  );

  if (socket) {
    FirebaseSceneVersionCache.set(socket, elements);
  }

  return elements;
};

export const loadFilesFromFirebase = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  await Promise.all(
    [...new Set(filesIds)].map(async (id) => {
      try {
        const url = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket
          }/o/${encodeURIComponent(prefix.replace(/^\//, ""))}%2F${id}`;
        const response = await fetch(`${url}?alt=media`);
        if (response.status < 400) {
          const arrayBuffer = await response.arrayBuffer();

          const { data, metadata } = await decompressData<BinaryFileMetadata>(
            new Uint8Array(arrayBuffer),
            {
              decryptionKey,
            },
          );

          const dataURL = new TextDecoder().decode(data) as DataURL;

          loadedFiles.push({
            mimeType: metadata.mimeType || MIME_TYPES.binary,
            id,
            dataURL,
            created: metadata?.created || Date.now(),
            lastRetrieved: metadata?.created || Date.now(),
          });
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        erroredFiles.set(id, true);
        console.error(error);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};

// -----------------------------------------------------------------------------
// Firebase Auth Functions
// -----------------------------------------------------------------------------

const EMAIL_LINK_STORAGE_KEY = "emailForSignIn";

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

/**
 * Sign in with Google popup
 */
export const signInWithGoogle = async () => {
  const auth = _getAuth();
  return signInWithPopup(auth, googleProvider);
};

/**
 * Sign in with GitHub popup
 */
export const signInWithGithub = async () => {
  const auth = _getAuth();
  return signInWithPopup(auth, githubProvider);
};

/**
 * Send passwordless email sign-in link
 */
export const sendEmailSignInLink = async (email: string) => {
  const auth = _getAuth();
  const actionCodeSettings = {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Store email for sign-in completion
  window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
};

/**
 * Complete email sign-in from link
 */
export const completeEmailSignIn = async () => {
  const auth = _getAuth();
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
    if (!email) {
      // User opened the link on a different device, ask for email
      email = window.prompt("Please provide your email for confirmation");
    }
    if (email) {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      // Clear stored email
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return result;
    }
  }
  return null;
};

/**
 * Check if current URL is an email sign-in link
 */
export const isEmailSignInLink = () => {
  const auth = _getAuth();
  return isSignInWithEmailLink(auth, window.location.href);
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  const auth = _getAuth();
  return firebaseSignOut(auth);
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
  const auth = _getAuth();
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user (synchronous, may be null if auth not initialized)
 */
export const getCurrentUser = (): User | null => {
  const auth = _getAuth();
  return auth.currentUser;
};

// Re-export User type for consumers
export type { User };

// -----------------------------------------------------------------------------
// Workspace and Board Types
// -----------------------------------------------------------------------------

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  lastModified: number;
}

export interface FirestoreBoard {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  createdAt: number;
  lastModified: number;
}

// -----------------------------------------------------------------------------
// Workspace CRUD Functions
// -----------------------------------------------------------------------------

/**
 * Create a new workspace for a user
 */
export const createWorkspace = async (
  userId: string,
  name: string,
  workspaceId?: string,
): Promise<Workspace> => {
  const firestore = _getFirestore();
  const id = workspaceId || crypto.randomUUID();
  const workspace: Workspace = {
    id,
    userId,
    name,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };

  await setDoc(doc(firestore, "workspaces", id), workspace);
  return workspace;
};

/**
 * Get all workspaces for a user
 */
export const getWorkspaces = async (userId: string): Promise<Workspace[]> => {
  const firestore = _getFirestore();
  const workspacesRef = collection(firestore, "workspaces");
  const q = query(
    workspacesRef,
    where("userId", "==", userId),
    orderBy("lastModified", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as Workspace);
};

/**
 * Update a workspace
 */
export const updateWorkspace = async (
  workspaceId: string,
  data: Partial<Pick<Workspace, "name">>,
): Promise<void> => {
  const firestore = _getFirestore();
  await updateDoc(doc(firestore, "workspaces", workspaceId), {
    ...data,
    lastModified: Date.now(),
  });
};

/**
 * Delete a workspace and all its boards
 */
export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  const firestore = _getFirestore();

  // First delete all boards in the workspace
  const boardsRef = collection(firestore, "boards");
  const q = query(boardsRef, where("workspaceId", "==", workspaceId));
  const snapshot = await getDocs(q);

  await Promise.all(
    snapshot.docs.map((boardDoc) => deleteDoc(boardDoc.ref)),
  );

  // Then delete the workspace
  await deleteDoc(doc(firestore, "workspaces", workspaceId));
};

// -----------------------------------------------------------------------------
// Board CRUD Functions
// -----------------------------------------------------------------------------

/**
 * Create a new board in a workspace (preserves existing ID if provided)
 */
export const createFirestoreBoard = async (
  workspaceId: string,
  userId: string,
  name: string,
  boardId?: string,
): Promise<FirestoreBoard> => {
  const firestore = _getFirestore();
  // Preserve existing board ID if provided, otherwise generate new one
  const id = boardId || crypto.randomUUID();
  const board: FirestoreBoard = {
    id,
    workspaceId,
    userId,
    name,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };

  await setDoc(doc(firestore, "boards", id), board);
  return board;
};

/**
 * Get all boards in a workspace
 */
export const getFirestoreBoards = async (
  workspaceId: string,
): Promise<FirestoreBoard[]> => {
  const firestore = _getFirestore();
  const boardsRef = collection(firestore, "boards");
  const q = query(
    boardsRef,
    where("workspaceId", "==", workspaceId),
    orderBy("lastModified", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as FirestoreBoard);
};

/**
 * Get all boards for a user (across all workspaces)
 */
export const getUserFirestoreBoards = async (
  userId: string,
): Promise<FirestoreBoard[]> => {
  const firestore = _getFirestore();
  const boardsRef = collection(firestore, "boards");
  const q = query(
    boardsRef,
    where("userId", "==", userId),
    orderBy("lastModified", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as FirestoreBoard);
};

/**
 * Get a single board by ID
 */
export const getFirestoreBoard = async (
  boardId: string,
): Promise<FirestoreBoard | null> => {
  const firestore = _getFirestore();
  const docSnap = await getDoc(doc(firestore, "boards", boardId));

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as FirestoreBoard;
};

/**
 * Update a board's metadata
 */
export const updateFirestoreBoard = async (
  boardId: string,
  data: Partial<Pick<FirestoreBoard, "name" | "workspaceId">>,
): Promise<void> => {
  const firestore = _getFirestore();
  await updateDoc(doc(firestore, "boards", boardId), {
    ...data,
    lastModified: Date.now(),
  });
};

/**
 * Delete a board
 */
export const deleteFirestoreBoard = async (boardId: string): Promise<void> => {
  const firestore = _getFirestore();
  await deleteDoc(doc(firestore, "boards", boardId));
};

/**
 * Save board content (elements) to Firestore
 * Uses the same encryption as collaboration rooms
 */
export const saveBoardContentToFirestore = async (
  boardId: string,
  elements: readonly DrawinkElement[],
  encryptionKey: string,
): Promise<void> => {
  const firestore = _getFirestore();

  const { ciphertext, iv } = await encryptElements(encryptionKey, elements);

  await updateDoc(doc(firestore, "boards", boardId), {
    sceneVersion: hashElementsVersion(elements),
    ciphertext: Bytes.fromUint8Array(new Uint8Array(ciphertext)),
    iv: Bytes.fromUint8Array(iv),
    lastModified: Date.now(),
  });
};

/**
 * Load board content (elements) from Firestore
 */
export const loadBoardContentFromFirestore = async (
  boardId: string,
  encryptionKey: string,
): Promise<readonly DrawinkElement[] | null> => {
  const firestore = _getFirestore();
  const docSnap = await getDoc(doc(firestore, "boards", boardId));

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  if (!data.ciphertext || !data.iv) {
    return [];
  }

  return decryptElements(
    {
      sceneVersion: data.sceneVersion,
      ciphertext: data.ciphertext,
      iv: data.iv,
    },
    encryptionKey,
  );
};
